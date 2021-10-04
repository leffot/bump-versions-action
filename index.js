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

        // Read files
        core.info('📘 Read files from filesystem')
        const package = fs.readFileSync(PACKAGE_FILE, 'utf-8')
        const config = fs.readFileSync(CONFIG_FILE, 'utf-8')
        const changelogFile = fs.readFileSync(CHANGELOG_FILE, 'utf-8')

        // Update files
        core.startGroup('📂 Update files')
        const packageData = JSON.parse(package)
        packageData.version = versionNumber
        core.info('ℹ️ Updated package.json')

        const configData = JSON.parse(config)
        configData.version = versionNumber
        configData.name = `Leffot (${version})`
        core.info('ℹ️ Updated config.json')

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
        core.info('ℹ️ Updated CHANGELOG.md')
        core.endGroup()

        // Write files
        core.startGroup('✒️ Write files')
        writeJsonFile(PACKAGE_FILE, packageData)
        core.info('✒️ Wrote package.json')

        writeJsonFile(CONFIG_FILE, configData)
        core.info('✒️ Wrote config.json')

        fs.writeFileSync(CHANGELOG_FILE, newChangelog, 'utf-8')
        core.info('✒️ Wrote CHANGELOG.md')
        core.endGroup()

        // Create release commit
        core.startGroup('🪙 Commit changes')
        const git = simpleGit()
        await git
            .init()
            .addConfig('user.email', 'action@github.com')
            .addConfig('user.name', 'GitHub Action')
        core.info('🔬 Git configured')

        await git.raw(['tag', '-d', version])
        core.info('❌ Temp tag deleted')

        await git.add('.').commit(`Releasing ${version}`).addTag(version)
        core.info('🏷 Changes committed and tagged')

        await git.push('origin', 'HEAD:master')
        core.info('📕 Changes pushed to HEAD:master')
        core.endGroup()
    } catch (error) {
        core.setFailed(error.message)
    }
}

bumpVersions()
