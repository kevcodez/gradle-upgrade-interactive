#! /usr/bin/env node
var colors = require('colors');

var argv = require('yargs')
  .option('resolution', {
    alias: 'r',
    describe: 'Controls the dependency resolution strategy.\nSupported options:\n* release: selects the latest release\n* milestone: select the latest version being either a milestone or a release (default)\n* integration: selects the latest revision of the dependency module (such as SNAPSHOT)',
    type: 'string',
    nargs: 1,
    demand: false
  })
  .option('debug', {
    alias: 'd',
    describe: 'Prints debugging information, such as commands executed and current status.',
    type: 'boolean',
    demand: false,
    default: false
  })
  .option('no-color', {
    describe: 'Disables color output',
    nargs: 1,
    demand: false
  })
  .argv

const prompts = require('prompts');
const fs = require('fs');
const { spawnSync } = require('child_process');

const ReplaceVersion = require('./ReplaceVersion')

let gradleCommand = null
let gradleWrapper = false
try {
  const isWindows = process.platform === 'win32'
  const gradleWrapperFile = isWindows ? 'gradlew.bat' : 'gradlew'
  if (fs.existsSync(gradleWrapperFile)) {
    gradleCommand = (isWindows ? '' : './') + gradleWrapperFile
    gradleWrapper = true
  }
} catch (err) {
}

if (!gradleCommand) {
  const gradleVersion = spawnSync('gradle', ['--version'])
  if (gradleVersion.status === 0) {
    gradleCommand = 'gradle'
  }
}

if (!gradleCommand) {
  console.log('Unable to find Gradle Wrapper or Gradle CLI.'.bgRed)
  return
}

let buildFile

if (fs.existsSync('build.gradle')) {
  buildFile = 'build.gradle'
} else if (fs.existsSync('build.gradle.kts')) {
  buildFile = 'build.gradle.kts'
}

if (!buildFile) {
  console.log('Unable to find a build.gradle or build.gradle.kts file.'.bgRed)
  return
}

console.log('Checking for upgrades...\n')

const debug = argv.debug

const gduArgs = ['dependencyUpdates', '-DoutputFormatter=json', '-DoutputDir=build/dependencyUpdates']
const gduResolution = argv.resolution
if (gduResolution) {
  gduArgs.push(`-Drevision=${gduResolution}`)
}

debugLog(`Executing command\n${gradleCommand} ${gduArgs.join(' ')}\n`)

const gdu = spawnSync(gradleCommand, gduArgs);

if (gdu.status !== 0) {
  console.log(`Error executing gradle dependency updates (StatusCode=${gdu.status})`.bgRed)

  console.log(gdu.stderr.toString().red)

  console.log(`\nIn case you haven't installed the gradle-versions-plugin (https://github.com/ben-manes/gradle-versions-plugin), put one of the following in your gradle build file:\n`)

  console.log(`Either Plugins block`)
  console.log(` 
  plugins {
    id "com.github.ben-manes.versions" version "0.24.0"
  }\n`.green)

  console.log('or buildscript block')

  console.log(`
  apply plugin: "com.github.ben-manes.versions"

  buildscript {
    repositories {
      jcenter()
    }

    dependencies {
      classpath "com.github.ben-manes:gradle-versions-plugin:0.24.0"
    }
  }`.green)
  return
}

function debugLog (message) {
  if (debug) {
    console.log(message.blue)
  }
}

(async () => {

  debugLog(`Reading JSON report file\n`)

  const upgradeReport = fs.readFileSync('build/dependencyUpdates/report.json');
  let dependencyUpdates = JSON.parse(upgradeReport);
  let outdatedDependencies = dependencyUpdates.outdated.dependencies
  debugLog(`Outdated dependencies parsed\n${JSON.stringify(outdatedDependencies)}\n\n`)

  let choices = outdatedDependencies.map(it => {
    const newVersion = it.available.release || it.available.milestone || it.available.integration
    return {
      description: it.projectUrl,
      title: `${it.name} - ${it.version} => ${newVersion}`,
      value: {
        group: it.group,
        name: it.name,
        oldVersion: it.version,
        version: newVersion,
        projectUrl: it.projectUrl
      }
    }
  })

  choices.sort((a, b) => a.title.localeCompare(b.title))

  debugLog(`Choices\n${JSON.stringify(choices)}\n\n`)

  let currentGradleRelease = dependencyUpdates.gradle.running.version
  let latestGradleRelease = dependencyUpdates.gradle.current.version

  if (gradleWrapper && currentGradleRelease !== latestGradleRelease) {
    choices.unshift({
      title: `Gradle - ${currentGradleRelease} => ${latestGradleRelease}`,
      value: 'gradle',
      description: 'Upgrades the gradle wrapper'
    })
  }

  if (!outdatedDependencies.length) {
    console.info('Everything up to date.')
    return
  }

  const response = await prompts(
    {
      type: 'multiselect',
      name: 'upgrades',
      message: 'Pick upgrades',
      choices: choices
    });

  if (!response.upgrades || !response.upgrades.length) {
    console.log('No upgrades select')
    return
  }

  if (response.upgrades.some(it => it === 'gradle')) {
    console.log('Upgrading gradle wrapper')
    const upgradeArgs = ['wrapper', '--gradle-version=' + latestGradleRelease]
    debugLog(`Executing command\n${gradleCommand}${upgradeArgs.join(' ')}\n`)
    const upgradeGradleWrapper = spawnSync(gradleCommand, upgradeArgs);

    if (upgradeGradleWrapper.status !== 0) {
      console.log(`Error upgrading gradle wrapper (StatusCode=${upgradeGradleWrapper.status}).`.bgRed)
      console.log(upgradeGradleWrapper.stderr.toString().red)
      return
    }
  }

  debugLog('Reading Gradle build file\n')

  fs.readFile(buildFile, function (err, buf) {
    let buildFileAsString = buf.toString()

    response.upgrades.filter(it => it !== 'gradle').forEach(it => {
      debugLog(`Replacing version\n${JSON.stringify(it)}\n`)
      buildFileAsString = ReplaceVersion.replace(buildFileAsString, it)
    })

    debugLog('Writing Gradle build file\n')
    fs.writeFile(buildFile, buildFileAsString, 'utf8', function (err) {
      if (err) return console.log(`Unable to write gradle build file.\n${err}`.bgRed);
    });

  });


})();