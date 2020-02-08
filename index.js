#! /usr/bin/env node

const colors = require('colors');
const semver = require('semver')

const {
  argv
} = require('./args')

const prompts = require('prompts');
const {
  existsSync,
  readFile,
  readFileSync,
  writeFile
} = require('fs');
const {
  subDirectories
} = require('./io')
const {
  join
} = require('path');
const {
  spawnSync
} = require('child_process');


const ReplaceVersion = require('./ReplaceVersion')

const {
  determineGradleCommand,
} = require('./gradleCommand')
const {
  getBuildFiles
} = require('./buildFiles')

const {
  gradleCommand,
  gradleWrapper
} = determineGradleCommand()

if (!gradleCommand) {
  console.log('Unable to find Gradle Wrapper or Gradle CLI.'.bgRed)
  return
}

const externalFiles = argv['external-file'];
const buildFiles = getBuildFiles(externalFiles)
if (!buildFiles.length) {
  console.log('Unable to find build.gradle, build.gradle.kts or external build file.'.bgRed)
  return
}

console.log('Checking for upgrades...\n')

const gradleDependencyUpdateArgs = ['dependencyUpdates', '-DoutputFormatter=json', '-DoutputDir=build/dependencyUpdates']
const gradleDependencyUpdateResolution = argv.resolution
if (gradleDependencyUpdateResolution) {
  gradleDependencyUpdateArgs.push(`-Drevision=${gradleDependencyUpdateResolution}`)
}

debugLog(`Executing command\n${gradleCommand} ${gradleDependencyUpdateArgs.join(' ')}\n`)

const gradleDependencyUpdateProcess = spawnSync(gradleCommand, gradleDependencyUpdateArgs);

if (gradleDependencyUpdateProcess.status !== 0) {
  informUserAboutInstallingUpdatePlugin();
  return
}

if (!buildFiles.length) {
  console.log('Unable to find build.gradle, build.gradle.kts or external build file.'.bgRed);
  return;
}

debugLog('Build files ' + buildFiles);

exports.debugLog = debugLog;

(async () => {

  debugLog(`Reading JSON report file\n`)

  const dependencyUpdates = findOutdatedDependencies();
  const outdatedDependencies = dependencyUpdates.outdated.dependencies;

  debugLog(`Outdated dependencies parsed\n${JSON.stringify(outdatedDependencies)}\n\n`)

  let {
    choices,
    latestGradleRelease
  } = buildUpgradeChoicesForUser(outdatedDependencies, dependencyUpdates);

  if (!choices.length) {
    console.log('Everything up to date.')
    return
  }

  const response = await prompts({
    type: 'multiselect',
    name: 'upgrades',
    message: 'Pick upgrades\n' + 'Major-Version'.red + '\t' + 'Minor-Version'.yellow + '\t' + 'Patch-Version'.green,
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

  buildFiles.forEach(buildFile => {
    debugLog(`Reading Gradle build file ${buildFile}\n`)

    readFile(buildFile, function (err, buf) {
      let buildFileAsString = buf.toString()

      response.upgrades.filter(it => it !== 'gradle').forEach(it => {
        debugLog(`Replacing version\n${JSON.stringify(it)}\n`)
        buildFileAsString = ReplaceVersion.replace(buildFileAsString, it)
      })

      debugLog(`Writing Gradle build file ${buildFile}\n`)
      writeFile(buildFile, buildFileAsString, 'utf8', function (err) {
        if (err) return console.log(`Unable to write gradle build file.\n${err}`.bgRed);
      });

    });
  })


})();

function buildUpgradeChoicesForUser(outdatedDependencies, dependencyUpdates) {
  let choices = outdatedDependencies.map(it => {
    const oldVersion = it.version;
    const newVersion = it.available.release || it.available.milestone || it.available.integration;
    let title = `${it.name} - ${it.version} => ${newVersion}`;
    let semverDiff = null;
    try {
      semverDiff = semver.diff(oldVersion, newVersion);
      if (semverDiff === 'patch') {
        title = title.green;
      } else if (semverDiff === 'minor') {
        title = title.yellow;
      } else if (semverDiff === 'major') {
        title = title.red;
      }
    } catch (err) {
      debugLog(`Semver for ${title} cannot be diffed.`);
      debugLog(err);
    }
    return {
      description: it.projectUrl,
      title: title,
      value: {
        group: it.group,
        name: it.name,
        oldVersion: it.version,
        version: newVersion,
        projectUrl: it.projectUrl,
        semverDiff: semverDiff
      }
    };
  });
  const includeSemverDiffs = argv.semver;
  if (includeSemverDiffs && includeSemverDiffs.length) {
    choices = choices.filter(it => !it.value.semverDiff || includeSemverDiffs.includes(it.value.semverDiff));
  }
  choices.sort((a, b) => a.title.localeCompare(b.title));
  debugLog(`Choices\n${JSON.stringify(choices)}\n\n`);
  let currentGradleRelease = dependencyUpdates.gradle.running.version;
  let latestGradleRelease = dependencyUpdates.gradle.current.version;
  if (gradleWrapper && currentGradleRelease !== latestGradleRelease) {
    choices.unshift({
      title: `Gradle - ${currentGradleRelease} => ${latestGradleRelease}`,
      value: 'gradle',
      description: 'Upgrades the gradle wrapper'
    });
  }
  return {
    choices,
    latestGradleRelease
  };
}

function findOutdatedDependencies() {
  const upgradeReportFiles = findUpgradeJsonReportFiles();
  debugLog(`Found ${upgradeReportFiles.length} report files`);
  debugLog(upgradeReportFiles.join('\n'));

  let gradle
  const mergedOutdatedDependencies = []

  upgradeReportFiles.forEach(reportFile => {
    const upgradeReportFileData = readFileSync(reportFile);
    let jsonReportData = JSON.parse(upgradeReportFileData);

    // Overwrite if it occurs multiple times
    if (jsonReportData.gradle) {
      gradle = jsonReportData.gradle
    }

    // Merge outdated dependencies
    jsonReportData.outdated.dependencies.forEach(outdatedDependency => {
      if (!mergedOutdatedDependencies.some(it => it === outdatedDependency)) {
        mergedOutdatedDependencies.push(outdatedDependency)
      }
    })
  })

  return {
    gradle,
    outdated: {
      dependencies: mergedOutdatedDependencies
    }
  };
}

function findUpgradeJsonReportFiles() {
  const reportJsonPath = 'build/dependencyUpdates/report.json';
  const upgradeReportFiles = [];
  if (existsSync(reportJsonPath)) {
    upgradeReportFiles.push(reportJsonPath);
  }
  subDirectories('./').forEach(subDirectory => {
    const reportDir = join(subDirectory, reportJsonPath);
    if (existsSync(reportDir)) {
      upgradeReportFiles.push(reportDir);
    }
  });
  return upgradeReportFiles;
}

function informUserAboutInstallingUpdatePlugin() {
  const newestVersion = '0.27.0'

  console.log(`Error executing gradle dependency updates (StatusCode=${gradleDependencyUpdateProcess.status})`.bgRed);
  console.log(gradleDependencyUpdateProcess.stderr.toString().red);
  console.log(`\nIn case you haven't installed the gradle-versions-plugin (https://github.com/ben-manes/gradle-versions-plugin), put one of the following in your gradle build file:\n`);
  console.log(`Either Plugins block`);
  console.log(` 
  plugins {
    id "com.github.ben-manes.versions" version "${newestVersion}"
  }\n`.green);
  console.log('or buildscript block');
  console.log(`
  buildscript {
    repositories {
      jcenter()
    }

    dependencies {
      classpath "com.github.ben-manes:gradle-versions-plugin:${newestVersion}"
    }
  }
  
  apply plugin: "com.github.ben-manes.versions"
  `.green);
}

function debugLog(message) {
  if (argv.debug) {
    console.log(message.blue)
  }
}