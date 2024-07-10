#!/usr/bin/env node
const {execSync} = require('child_process')
const readline = require('readline')
const path = require('path')
const fs = require('fs')
const os = require('os')
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const defaultPackages = [
    'lib_productlist',
    'plugin-applepay',
    'plugin_cartridge_merge',
    'plugin_datadownload',
    'plugin_giftregistry',
    'plugin_instorepickup',
    'plugin_ordermanagement',
    'plugin_productcompare',
    'plugin_sitemap',
    'plugin_wishlists',
    'storefrontdata',
    'storefront-reference-architecture'
]
// eslint-disable-next-line
function execCommand(command, options = {}) {
    try {
        return execSync(command, {stdio: 'inherit', ...options})
    } catch (error) {
        console.log('error', error)
        console.error(`Error executing command: ${command}`)
        process.exit(1)
    }
}

function promptUser(message) {
    return new Promise((resolve) => {
        rl.question(message, (answer) => {
            resolve(answer.toLowerCase())
        })
    })
}

function updatePropertiesFile(packageName, VERSION) {
    console.log('\x1b[33m>Updating properties file\x1b[0m')
    const versionWithoutV = VERSION.replace(/^v/, '')

    if (packageName === 'storefront-reference-architecture') {
        console.log(
            '\x1b[33m> Updating version.properties file for storefront-reference-architecture\n\x1b[0m'
        )
        const propertiesFilePath = path.resolve(
            'cartridges/app_storefront_base/cartridge/templates/resources/version.properties'
        )
        if (fs.existsSync(propertiesFilePath)) {
            let content = fs.readFileSync(propertiesFilePath, 'utf8')
            const regex = /global\.version\.number=\S+/
            const newLine = `global.version.number=${versionWithoutV}`

            if (content.match(regex)) {
                content = content.replace(regex, newLine)
                fs.writeFileSync(propertiesFilePath, content, 'utf8')
                console.log(`Updated ${propertiesFilePath} with new version ${versionWithoutV}`)
            }
        } else {
            console.warn(`version.properties file ${propertiesFilePath} does not exist.`)
        }
        // Update app_storefront_base.properties file
        console.log(
            '\x1b[33m> Updating app_storefront_base.properties file for storefront-reference-architecture\n'
        )
        const appStorefrontBasePropertiesFilePath = path.resolve(
            'cartridges/app_storefront_base/cartridge/app_storefront_base.properties'
        )
        if (fs.existsSync(appStorefrontBasePropertiesFilePath)) {
            let content = fs.readFileSync(appStorefrontBasePropertiesFilePath, 'utf8')
            const regex = /demandware\.cartridges\.app_storefront_base\.version=\S+/
            const newLine = `demandware.cartridges.app_storefront_base.version=${versionWithoutV}`

            if (content.match(regex)) {
                content = content.replace(regex, newLine)
                fs.writeFileSync(appStorefrontBasePropertiesFilePath, content, 'utf8')
                console.log(
                    `Updated ${appStorefrontBasePropertiesFilePath} with new version ${versionWithoutV}`
                )
            }
        } else {
            console.warn(
                `app_storefront_base.properties file ${appStorefrontBasePropertiesFilePath} does not exist.`
            )
        }
    } else {
        const propertiesFilePath = path.resolve(
            `cartridges/${packageName}/cartridge/${packageName}.properties`
        )

        if (fs.existsSync(propertiesFilePath)) {
            const versionWithoutV = VERSION.replace(/^v/, '')
            let content = fs.readFileSync(propertiesFilePath, 'utf8')
            const regex = new RegExp(`demandware\\.cartridges\\.${packageName}\\.version=\\S+`)
            const newLine = `demandware.cartridges.${packageName}.version=${versionWithoutV}`

            if (content.match(regex)) {
                content = content.replace(regex, newLine)
                fs.writeFileSync(propertiesFilePath, content, 'utf8')
                console.log(`>>Updated ${propertiesFilePath} with new version ${VERSION}`)
            }
        } else {
            console.warn(
                `\x1b[33m>>Properties file ${propertiesFilePath} does not exist. Skip this step for ${packageName}\x1b[0m`
            )
        }
    }
}

function updatePackageJsonVersion(packageName, VERSION) {
    const versionWithoutV = VERSION.replace(/^v/, '')
    console.log('\x1b[33m>Updating package.json file\x1b[0m')
    const packageJsonPath = path.resolve('package.json')
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        packageJson.version = versionWithoutV
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8')
        console.log(
            `>>Updated ${packageJsonPath} with new version ${versionWithoutV}`
        )
        // Run npm install to update package-lock.json
        execCommand('npm install')
    } else {
        console.warn(`package.json file ${packageJsonPath} does not exist.`)
    }
}

async function createPR(packageName, baseBranch, VERSION, releaseBranch) {
    console.log(`\x1b[33m>>Checking open PRs: gh pr list --state open --base ${baseBranch}\x1b[0m`)
    const prListOutput = execSync(`gh pr list --state open --base ${baseBranch}`).toString()
    if (prListOutput.includes(releaseBranch)) {
        console.log(`PR for ${releaseBranch} already exists. Skipping PR creation.`)
    } else {
        console.log(`\x1b[33m>>Creating PRs: gh pr list --state open --base ${baseBranch}\x1b[0m`)
        const createPrOutput = execSync(`gh pr create --fill --base ${baseBranch}`).toString()
        const prNumberMatch = createPrOutput.match(/(\d+)/) // Extract PR number from output
        const prNumber = prNumberMatch ? prNumberMatch[0] : null

        if (prNumber) {
            const prURL = `https://github.com/SalesforceCommerceCloud/${packageName}/pull/${prNumber}`
            return prURL
        } else {
            console.error('Failed to create PR. No PR number found.')
            return null
        }
    }
}

async function checkForChanges(promptUserForCommit = true, commitMsg = 'commit changed files') {
    try {
        console.log('\x1b[33m>Checking for changes\x1b[0m')
        const status = execSync('git status --porcelain').toString()
        if (status) {
            console.log('You have uncommitted changes:')
            console.log(status)
            const changedFiles = status
                .split('\n')
                .filter((line) => line.trim() !== '')
                .map((line) => line.slice(3)) // Remove the status code at the beginning of each line

            if (promptUserForCommit) {
                const answer = await promptUser('Do you want to commit these changes? (y/n): ')
                if (answer !== 'y') {
                    console.log('Aborting.....Please clean up your working tree.')
                    process.exit(0)
                }

                const commitMessage = await promptUser('Enter commit message: ')
                // eslint-disable-next-line no-restricted-syntax
                for (const file of changedFiles) {
                    execCommand(`git add ${file}`)
                }
                execCommand(`git commit -m "${commitMessage}"`)
            } else {
                console.log('ChangedFiles', changedFiles)
                for (const file of changedFiles) {
                    execCommand(`git add ${file}`)
                }
                console.log('>>>>>Commiting changed files')
                execCommand(`git commit -m "${commitMsg}"`)
            }
        }
    } catch (error) {
        console.error('Error checking git status')
        process.exit(1)
    }
}
async function updateChangelog(packageName) {
    console.log('\x1b[33m>Updating changelog\x1b[0m')

    const basePath = __dirname.split('sfra-release')
    const packagePath = path.resolve(basePath[0], packageName)
    const pkg = path.resolve(packagePath, 'package.json')
    const pkgContent = JSON.parse(fs.readFileSync(pkg, 'utf8'))
    const date = new Date().toString().split(' ').slice(1, 4)
    const heading = `## v${pkgContent.version} (${date[0]} ${date[1]}, ${date[2]})`

    const changelogPath = path.resolve(packagePath, 'CHANGELOG.md')
    if (!fs.existsSync(changelogPath)) {
        console.error('no CHANGELOG file found')
        return
    }
    let currentChangeLog = fs.readFileSync(changelogPath, 'utf8')
    // Check if the heading already exists in the changelog
    if (currentChangeLog.includes(pkgContent.version)) {
        console.log(`Changelog already updated with version ${pkgContent.version}. Skipping update.`);
        return;
    }


    const title = /# Changelog/
    const tempChangeLog = path.resolve(os.tmpdir(), 'CHANGELOG.md')
    if (currentChangeLog.match(title)) {
        currentChangeLog = currentChangeLog.replace(title, '')
        fs.writeFileSync(tempChangeLog, '# Changelog\n\n', 'utf8')
        fs.appendFileSync(tempChangeLog, heading, 'utf8')
        fs.appendFileSync(tempChangeLog, currentChangeLog, 'utf8')
        fs.copyFileSync(tempChangeLog, changelogPath)
        console.log('Changelog updated.')
    }
}
async function updateStorefrontData(packageName, VERSION) {
    const versionWithoutV = VERSION.replace(/^v/, '')

    console.log('\x1b[33m>Updating xml file in StorefrontData package\x1b[0m')
    const xmlFile = path.resolve('demo_data_sfra/libraries/RefArchSharedLibrary/library.xml')
    if (fs.existsSync(xmlFile)) {
        let content = fs.readFileSync(xmlFile, 'utf8')
        const regex = /&lt;!-- SFRA \d+\.\d+\.\d+/g
        const newLine = `&lt;!-- SFRA ${versionWithoutV}`
        if (content.match(regex)) {
            content = content.replace(regex, newLine)
            fs.writeFileSync(xmlFile, content, 'utf8')
            console.log(`Updated ${xmlFile} with new version ${versionWithoutV}`)
        }
    }
}
async function preparePRsToRelease(VERSION, packages = defaultPackages) {
    console.log('\x1b[36m%s\x1b[0m', '======================= PR Creation Step =================')
    console.log(`\nVersion: ${VERSION}`)
    console.log(`Packages: ${packages.join(', ')}\n`)
    const createdPRs = []
    for (const packageName of packages) {
        console.log(
            '\x1b[36m%s\x1b[0m',
            `======================= Processing package: ${packageName} =================`
        )

        const basePath = __dirname.split('sfra-release')
        const packagePath = path.resolve(basePath[0], packageName)

        if (!fs.existsSync(packagePath)) {
            console.error(`Package directory ${packageName} does not exist.`)
            continue
        }

        process.chdir(packagePath)

        const baseBranch =
            packageName === 'storefront-reference-architecture'
                ? 'integration'
                : packageName === 'plugin-slas'
                  ? 'main'
                  : 'master'
        console.log(`\x1b[33m> Switching to ${baseBranch} branch \x1b[0m`)
        await checkForChanges()
        execCommand(`git switch ${baseBranch}`)
        execCommand('git pull')

        await checkForChanges()

        console.log('\x1b[33m> Switching to release branch \x1b[0m')
        const releaseBranch = `release/${VERSION}`
        let branchExists = false

        try {
            execSync(`git rev-parse --verify ${releaseBranch}`)
            branchExists = true
        } catch (err) {
            branchExists = false
        }
        if (branchExists) {
            execCommand(`git switch ${releaseBranch}`)
        } else {
            execCommand(`git switch -c ${releaseBranch}`)
        }

        console.log('\x1b[33m> Running npm install')
        execCommand('npm install')
        await checkForChanges()

        updatePropertiesFile(packageName, VERSION)
        if (packageName === 'storefrontdata') {
            await updateStorefrontData(packageName, VERSION)
        }
        updatePackageJsonVersion(packageName, VERSION)

        await updateChangelog(packageName, VERSION)

        await checkForChanges(false, `chore: release ${VERSION}`)

        console.log(
            `\x1b[33m> Pushing the change to remote branch: git push -u origin ${releaseBranch}\x1b[0m`
        )
        execCommand(`git push -u origin ${releaseBranch}`)
        const prURL = await createPR(packageName, baseBranch, VERSION, releaseBranch)


        if (prURL) {
            console.log(
                `\x1b[33m> List of PRs created\x1b[0m`
            )
            createdPRs.push(prURL)
        }

        process.chdir('..')
    }
    createdPRs.forEach((prURL) => {
        console.log(prURL)
    })
}

async function createGitTag(VERSION, packagesToProcess) {
    for (const packageName of packagesToProcess) {
        console.log(
            '\x1b[36m%s\x1b[0m',
            `======================= Processing package: ${packageName} =================`
        )

        console.log('\x1b[36m%s\x1b[0m', `Creating git tag`)

        const basePath = __dirname.split('sfra-release')
        const packagePath = path.resolve(basePath[0], packageName)

        if (!fs.existsSync(packagePath)) {
            console.error(`Package directory ${packageName} does not exist.`)
            continue
        }

        process.chdir(packagePath)
        const branchToUse =
            packageName === 'storefront-reference-architecture'
                ? 'integration'
                : packageName === 'plugin-slas'
                  ? 'main'
                  : MAIN_BRANCH
        console.log('branchToUse', branchToUse)
        execCommand(`git switch ${branchToUse}`)
        execCommand('git pull')
        // Check if the tag already exists
        const existingTags = execSync('git tag').toString().split('\n')
        if (existingTags.includes(VERSION)) {
            console.log(`Tag ${VERSION} already exists. Skipping tag creation.`)
        } else {
            execCommand(`git tag ${VERSION}`)
        }

        execCommand(`git push origin refs/tags/${VERSION}`)
    }
}


async function main() {
    const args = process.argv.slice(2)
    if (args.length < 2) {
        console.error(
            'Usage: node prep-PR.js.js <VERSION> <action> [<package1> <package2> ... <packageN>]'
        )
        console.error(
            'Example for PR creation with specific packages: node prep-PR.js v1.0.0 createPR lib_productlist plugin-applepay'
        )
        console.error(
            'Example for PR creation with default packages: node prep-PR.js v1.0.0 createPR'
        )
        console.error(
            'Example for Git tag creation with specific packages: node prep-PR.js v1.0.0 createGitTag lib_productlist plugin-applepay'
        )
        console.error(
            'Example for Git tag creation with default packages: node prep-PR.js v1.0.0 createGitTag'
        )
        process.exit(1)
    }

    const [VERSION, action, ...packages] = args

    let packagesToProcess = packages.length > 0 ? packages : defaultPackages

    switch (action) {
        case 'createPR':
            await preparePRsToRelease(VERSION, packagesToProcess)
            break
        case 'createGitTag':
            await createGitTag(VERSION, packagesToProcess)
            break
        default:
            console.error('Invalid action. Please specify either "createPR" or "createGitTag".')
            process.exit(1)
    }

    rl.close()
}

main()
