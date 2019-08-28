#! /usr/bin/env node
var argv = require('yargs')
  .option('resolution', {
    alias: 'r',
    describe: 'Controls the dependency resolution strategy.\nSupported options:\n* release: selects the latest release\n* milestone: select the latest version being either a milestone or a release (default)\n* integration: selects the latest revision of the dependency module (such as SNAPSHOT)',
    type: 'string',
    nargs: 1,
    demand: false
  }).argv

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
  console.log('Unable to find Gradle Wrapper or Gradle CLI.')
  return
}

console.log('Checking for upgrades')

const gduArgs = ['dependencyUpdates', '-DoutputFormatter=json', '-DoutputDir=build/dependencyUpdates']
const gduResolution = argv.resolution
if (gduResolution) {
  gduArgs.push(`-Drevision=${gduResolution}`)
}

const gdu = spawnSync(gradleCommand, gduArgs);

if (gdu.status !== 0) {
  console.log(`Error executing gradle dependency updates (StatusCode=${gdu.status}), have you installed the gradle versions plugin?`)
  console.log('https://github.com/ben-manes/gradle-versions-plugin')
  return
}

(async () => {

  const upgradeReport = fs.readFileSync('build/dependencyUpdates/report.json');
  let dependencyUpdates = JSON.parse(upgradeReport);
  let outdatedDependencies = dependencyUpdates.outdated.dependencies

  let choices = outdatedDependencies.map(it => {
    const newVersion = it.available.release || it.available.milestone || it.available.integration
    return { description: `Group ${it.group}`, title: `${it.name} - ${it.version} => ${newVersion}`, value: { group: it.group, name: it.name, oldVersion: it.version, version: newVersion } }
  })

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
    const upgradeGradleWrapper = spawnSync(gradleCommand, ['wrapper', '--gradle-version=' + latestGradleRelease]);

    if (upgradeGradleWrapper.status !== 0) {
      console.log(`Error upgrading gradle wrapper (StatusCode=${upgradeGradleWrapper.status}).`)
      return
    }
  }

  fs.readFile('build.gradle', function (err, buf) {
    let buildFileAsString = buf.toString()

    response.upgrades.filter(it => it !== 'gradle').forEach(it => {
      buildFileAsString = ReplaceVersion.replace(buildFileAsString, it)
    })

    fs.writeFile('build.gradle', buildFileAsString, 'utf8', function (err) {
      if (err) return console.log("Unable to write gradle build file.\n" + err);
    });

  });


})();
