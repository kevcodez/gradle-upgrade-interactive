#! /usr/bin/env node

const prompts = require('prompts');
const fs = require('fs');
const { spawnSync } = require('child_process');

let gradleCommand = ''
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
  console.log('Unable to find Gradle Wrapper or Gradle CLI ')
  return
}

console.log('Checking for upgrades')

const gdu = spawnSync(gradleCommand, ['dependencyUpdates', '-Drevision=release', '-DoutputFormatter=json', '-DoutputDir=build/dependencyUpdates']);

if (gdu.status !== 0) {
  console.log(`Error executing gradle dependency updates (StatusCode=${gdu.status}), have you installed the gradle versions plugin?`)
  console.log('https://github.com/ben-manes/gradle-versions-plugin')
  return
}

(async () => {

  const upgradeReport = fs.readFileSync('build/dependencyUpdates/report.json');
  let dependencyUpdates = JSON.parse(upgradeReport);
  let outdatedDependencies = dependencyUpdates.outdated.dependencies
  let currentGradleRelease = dependencyUpdates.gradle.running.version
  let latestGradleRelease = dependencyUpdates.gradle.current.version

  let choices = outdatedDependencies.map(it => {
    const newVersion = it.available.release
    return { description: `Group ${it.group}`, title: `${it.name} - ${it.version} => ${newVersion}`, value: { group: it.group, name: it.name, oldVersion: it.version, version: newVersion } }
  })

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
      const oldVersion = it.oldVersion
      const newVersion = it.version

      const regexVersionVariable = new RegExp(it.group + "." + it.name + ":\\${?(\\w+)}?", "ig")

      let versionWithVariableMatches = regexVersionVariable.exec(buildFileAsString)
      if (versionWithVariableMatches && versionWithVariableMatches.length === 2) {
        let variableName = versionWithVariableMatches[1]

        const regexVariableDefinition = new RegExp(`${variableName}(\\s+)?=(\\s+)?('|")${oldVersion}('|")`, "ig")

        if (regexVariableDefinition) {
          buildFileAsString = buildFileAsString.replace(regexVariableDefinition, `${variableName} = '${newVersion}'`)
        }
      }

      let regexVersionInline = new RegExp(it.group + "." + it.name + ":" + it.oldVersion, "g")
      if (regexVersionInline.exec(buildFileAsString)) {
        buildFileAsString = buildFileAsString.replace(regexVersionInline, it.group + "." + it.name + ":" + it.version)
      }

      let regexVersionWithPrefix = new RegExp(it.group + `"(\\s+)?version(\\s+)?"${oldVersion}"`)

      buildFileAsString = buildFileAsString.replace(regexVersionWithPrefix, it.group + `" version "${newVersion}"`)
    })

    fs.writeFile('build.gradle', buildFileAsString, 'utf8', function (err) {
      if (err) return console.log(err);
    });

  });


})();
