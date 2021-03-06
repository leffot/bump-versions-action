const fs = require('fs')
const core = require('@actions/core')
const simpleGit = require('simple-git')

const PACKAGE_FILE = 'package.json'
const CONFIG_FILE = 'config.json'
const CHANGELOG_FILE = 'CHANGELOG.md'

const writeJsonFile = (filename, data) => {
    fs.writeFileSync(filename, JSON.stringify(data, null, 4), 'utf-8')
}

const bumpVersions = async () => {
    try {
        const version = core.getInput('version').replace('refs/tags/', '')
        const versionNumber = version.replace('v', '')
        const changelog = core.getInput('changelog')

        // Print a blank line
        core.info('')

        // Pull latest changes from Git
        core.startGroup('đ Checkout code')
        const git = simpleGit()
        await git.init().pull('origin', 'HEAD:main')
        core.info('đŋ Latest changes pulled')
        core.endGroup()

        // Read files
        core.info('đ Read files from filesystem')
        const package = fs.readFileSync(PACKAGE_FILE, 'utf-8')
        const config = fs.readFileSync(CONFIG_FILE, 'utf-8')
        const changelogFile = fs.readFileSync(CHANGELOG_FILE, 'utf-8')

        // Update files
        core.startGroup('đ Update files')
        const packageData = JSON.parse(package)
        packageData.version = versionNumber
        core.info('âšī¸ Updated package.json')

        const configData = JSON.parse(config)
        configData.version = versionNumber
        configData.name = `Leffot (${version})`
        core.info('âšī¸ Updated config.json')

        // Split the existing changelog into an array
        const changelogFileData = changelogFile.toString().split('\n')

        // Create a title line including the date and version number
        let date = new Date()
        date = date.toISOString().split('T')[0]
        const title = `## ${versionNumber} (${date})`

        // Remove the previous version's commit from the current changelog
        const cleanedChangelog = changelog.replace(
            /-   Releasing v\d\.\d\.\d/,
            ''
        )
        core.setOutput('changelog', cleanedChangelog)

        // Add the new changelog data
        changelogFileData.splice(2, 0, title)
        changelogFileData.splice(3, 0, cleanedChangelog)
        changelogFileData.splice(4, 0, '\n')
        const newChangelog = changelogFileData.join('\n')
        core.info('âšī¸ Updated CHANGELOG.md')
        core.endGroup()

        // Write files
        core.startGroup('âī¸ Write files')
        writeJsonFile(PACKAGE_FILE, packageData)
        core.info('âī¸ Wrote package.json')

        writeJsonFile(CONFIG_FILE, configData)
        core.info('âī¸ Wrote config.json')

        fs.writeFileSync(CHANGELOG_FILE, newChangelog, 'utf-8')
        core.info('âī¸ Wrote CHANGELOG.md')
        core.endGroup()

        // Initialize Git
        core.startGroup('đĒ Commit changes')
        await git
            .addConfig('user.email', 'action@github.com')
            .addConfig('user.name', 'GitHub Action')
        core.info('đŦ Git configured')

        // Delete local and remote tags
        await git
            .raw(['tag', '-d', version])
            .push(['origin', '--delete', version])
        core.info('â Temp tag deleted')

        // Commit changes
        await git
            .add('.')
            .commit(`Releasing ${version}`)
            .addAnnotatedTag(version, version)
        core.info('đˇ Changes committed and tagged')

        // Push changes
        await git.push('origin', 'HEAD:main').pushTags('origin')
        core.info('đ Changes pushed to HEAD:main')
        core.endGroup()
    } catch (error) {
        core.setFailed(error.message)
    }
}

bumpVersions()
