# Introduction
This package includes scripts that will automate the SFRA and its plugins release process. This includes
1. Prep github PRs for all of the plugins and base cartridge

# Prerequisites

You need to install [gh](https://github.com/cli/cli) cli to allow the script to create PRs on your behalf.
After you install, please login into github with your ssh key
```
gh auth login
```

# How to use

```
node ./prep-PR.js.js <VERSION> <MAIN_BRANCH> <action> [<package1> <package2> ... <packageN>]
```
- VERSION: the version you want to upgrade to
- MAIN_BRAIN: the base branch to branch of for release
- action
  - createPRs: to prepare the data (update version, do any necessary file changes in all the cartridges) and create PRs for the release branch
  - createGitTag: After all of the PRs are approved and merged, you want to make sure you create and push new tags to all of the cartridges.
- [<package1> <package2> ... <packageN>]: list of packages you want to prepare for release

### Examples
Example for PR creation with specific packages:

```
>node prep-PR.js v1.0.0 main createPR lib_productlist plugin-applepay

```

Example for PR creation with default packages.
```
>node prep-PR.js v1.0.0 main createPR

// default packages
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
    // 'plugin_slas',
    'plugin_wishlists',
    'storefrontdata',
    'storefront-reference-architecture'
]
```

Example for Git tag creation with specific packages.
```
>node prep-PR.js v1.0.0 main createGitTag lib_productlist plugin-applepay
```

### Steps that the script does
```
********************createPR action ******
Follow these steps in each of the repositories listed under Repositories to Release, above.

1. Set bash variables for easy copy/pasting of these steps!
2. VERSION="v0.0.0" # Set to the new release version. Include the v!
    MAIN_BRANCH="master" # Use "integration" for SFRA base and "develop" for plugin_slas
3. Check out the latest code.
    1. Double check that your working tree is clean.
    2. git status --short
        # Stash changes, if necessary
        git stash push --include-untracked -m "WIP before $VERSION release"
    3. Download the latest from the main branch.
    4. git switch $MAIN_BRANCH
        git pull
    5. Double check that everything is clean!
    6. git status --short
4. Create a release branch.
5. git switch -c release/$VERSION
6. Ensure dependencies are up to date.
7. npm install
    # Commit changes, if any.
    git add package-lock.json
    git commit -m "chore: update dependencies"
8. Update references to the current version in each repository.
    1. Update repository-specific files. See Repository-Specific Changes below for details.
    2. Update cartridge versions in cartridges/<cartridge_name>/cartridge/<cartridge_name>.properties file (Create the file if one does not exist)
        1. Set demandware.cartridges.<cartridge_name>.version=<new_release_version>
    3. Update the package.json and package-lock.json.
        ⚠️ DO NOT use npm version, it will break our release tags.
        ⚠️ DO NOT use npm run release in the SFRA base repo. It uses npm version under the hood.
    4. # Update package.json manually - don't include the "v" in $VERSION!
        npm install # Copy change to package-lock.json
    5. Commit changes.
    6. # git add <repo-specific files>
        git add package.json package-lock.json
        git commit -m "chore: release $VERSION"
    7. Add the changelog!    
9. Publish changes.
10. git push -u origin release/$VERSION
11. Create a GitHub PR and merge it down. Optionally, use the GitHub CLI (install w/ brew install gh).
12. # Use the web UI or the CLI
    gh pr create --fill
    gh pr view --web
    1. For SFRA Base, make sure the PR is for the integration branch and not the master branch
    
    
***************************CreateGitTag action***********************
13. Create and publish a git tag after merging.
14. git switch $MAIN_BRANCH
    git pull
    git tag $VERSION
    git push origin refs/tags/$VERSION
15. Create a GitHub release.
16. # Use the web UI or the CLI
    gh release view --web

```

