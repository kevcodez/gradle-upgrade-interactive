#! /usr/bin/env node

const colors = require("colors");
const semver = require("semver");
const ora = require("ora");

const { argv } = require("./args");

function debugLog(message) {
  if (argv.debug) {
    console.log(message.blue);
  }
}

const prompts = require("prompts");
const { existsSync, readFileSync, writeFileSync } = require("fs");
const { subDirectories } = require("./io");
const { join } = require("path");
const { spawn } = require("child_process");
const { version } = require("./package.json");

const ReplaceVersion = require("./ReplaceVersion");

const { determineGradleCommand } = require("./gradleCommand");
const { getBuildFiles } = require("./buildFiles");

const { gradleCommand, gradleWrapper } = determineGradleCommand(debugLog);

if (!gradleCommand) {
  console.log("Unable to find Gradle Wrapper or Gradle CLI.".bgRed);
  process.exit();
}

const externalFiles = argv["external-file"];
const buildFiles = getBuildFiles(externalFiles, debugLog);
debugLog(`Build Files:\n ${buildFiles.join("\n")}`);
if (!buildFiles.length) {
  console.log("Unable to find build.gradle, build.gradle.kts or external build file.".bgRed);
  process.exit();
}

exports.debugLog = debugLog;

async function executeCommandAndWaitForExitCode(command, args) {
  let commandExitCode;

  const child = spawn(command, args);
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (data) => {
    debugLog(data);
  });

  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (data) => {
    console.error(data);
  });

  child.on("close", (code) => {
    commandExitCode = code;
  });

  child.on("exit", (code) => {
    commandExitCode = code;
  });

  while (commandExitCode === undefined) {
    debugLog("Waiting for command to finish");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return commandExitCode;
}

(async () => {
  console.log(`gradle-upgrade-interactive v${version}
${"info".blue} Color legend :
"${"<red>".red}"    : Major Update backward-incompatible updates
"${"<yellow>".yellow}" : Minor Update backward-compatible features
"${"<green>".green}"  : Patch Update backward-compatible bug fixes
  `);

  const spinner = ora({ text: "Checking for upgrades", spinner: "dots8Bit" }).start();

  //   info Color legend :

  const gradleDependencyUpdateArgs = ["dependencyUpdates", "-DoutputFormatter=json", "-DoutputDir=build/dependencyUpdates"];
  const gradleDependencyUpdateResolution = argv.resolution;
  if (gradleDependencyUpdateResolution) {
    gradleDependencyUpdateArgs.push(`-Drevision=${gradleDependencyUpdateResolution}`);
  }

  debugLog(`Executing command\n${gradleCommand} ${gradleDependencyUpdateArgs.join(" ")}\n`);

  let gradleDependencyUpdateProcessExitCode = await executeCommandAndWaitForExitCode(gradleCommand, gradleDependencyUpdateArgs);

  if (gradleDependencyUpdateProcessExitCode !== 0) {
    informUserAboutInstallingUpdatePlugin(gradleDependencyUpdateProcessExitCode);
    spinner.stop();
    process.exit();
  }

  if (!buildFiles.length) {
    console.log("Unable to find build.gradle, build.gradle.kts or external build file.".bgRed);
    spinner.stop();
    process.exit();
  }

  debugLog(`Reading JSON report file\n`);

  const dependencyUpdates = findOutdatedDependencies();
  const outdatedDependencies = dependencyUpdates.outdated.dependencies;

  debugLog(`Outdated dependencies parsed\n${JSON.stringify(outdatedDependencies)}\n\n`);

  let { choices, latestGradleRelease } = buildUpgradeChoicesForUser(outdatedDependencies, dependencyUpdates);

  if (!choices.length) {
    console.log("success".green + " All of your dependencies are up to date.");
    spinner.stop();
    process.exit();
  }

  spinner.stop();

  const response = await prompts({
    type: "multiselect",
    name: "upgrades",
    message: "Pick upgrades",
    choices: choices,
  });

  if (!response.upgrades || !response.upgrades.length) {
    console.log("No upgrades selected");
    process.exit();
  }

  if (latestGradleRelease && response.upgrades.some((it) => it === "gradle")) {
    console.log("Upgrading gradle wrapper");
    const upgradeArgs = ["wrapper", "--gradle-version=" + latestGradleRelease];

    debugLog(`Executing command\n${gradleCommand}${upgradeArgs.join(" ")}\n`);
    let upgradeGradleWrapperExitCode = await executeCommandAndWaitForExitCode(gradleCommand, upgradeArgs);

    if (upgradeGradleWrapperExitCode !== 0) {
      console.log(`Error upgrading gradle wrapper (StatusCode=${upgradeGradleWrapperExitCode}).`.bgRed);
      process.exit();
    }
  }

  const allReplacements = [];
  const buildFileContentMap = new Map();

  buildFiles.forEach((buildFile) => {
    debugLog(`Reading Gradle build file ${buildFile}\n`);

    const fileDataBuffer = readFileSync(buildFile);

    let buildFileAsString = fileDataBuffer.toString();

    response.upgrades
      .filter((it) => it !== "gradle")
      .forEach((dependency) => {
        debugLog(`Replacing version\n${JSON.stringify(dependency)}\n`);
        const replaceVersionActions = ReplaceVersion.replace(buildFileAsString, dependency);

        replaceVersionActions.forEach((action) => {
          if (!allReplacements.some((it) => it.searchValue === action.searchValue && it.replaceValue === action.replaceValue)) {
            allReplacements.push(action);

            debugLog(`${action.searchValue} => ${action.replaceValue}`);
          }
        });
      });

    buildFileContentMap.set(buildFile, buildFileAsString);
  });

  buildFileContentMap.forEach((content, buildFile) => {
    let modifiedContent = content;

    allReplacements.forEach((replaceAction) => {
      modifiedContent = modifiedContent.replace(replaceAction.searchValue, replaceAction.replaceValue);
    });

    debugLog(`Writing Gradle build file: ${buildFile}\n`);
    try {
      writeFileSync(buildFile, modifiedContent, "utf8");
    } catch (err) {
      console.log(`Unable to write gradle build file.\n${err}`.bgRed);
      process.exit();
    }
  });

  process.exit();
})();

function buildUpgradeChoicesForUser(outdatedDependencies, dependencyUpdates) {
  let choices = outdatedDependencies.map((it) => {
    const oldVersion = it.version;
    const newVersion = it.available.release || it.available.milestone || it.available.integration;
    let title = `${it.name} - ${it.version} => ${newVersion}`;
    let semverDiff = null;
    try {
      semverDiff = semver.diff(oldVersion, newVersion);
      if (semverDiff === "patch") {
        title = title.green;
      } else if (["minor", "preminor"].includes(semverDiff)) {
        title = title.yellow;
      } else if (["major", "premajor"].includes(semverDiff)) {
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
        semverDiff: semverDiff,
      },
    };
  });
  const includeSemverDiffs = argv.semver;
  if (includeSemverDiffs && includeSemverDiffs.length) {
    choices = choices.filter((it) => !it.value.semverDiff || includeSemverDiffs.includes(it.value.semverDiff));
  }
  choices.sort((a, b) => a.title.localeCompare(b.title));
  debugLog(`Choices\n${JSON.stringify(choices)}\n\n`);

  let latestGradleRelease;
  if (dependencyUpdates.gradle) {
    let currentGradleRelease = dependencyUpdates.gradle.running.version;
    latestGradleRelease = dependencyUpdates.gradle.current.version;
    if (gradleWrapper && currentGradleRelease !== latestGradleRelease) {
      choices.unshift({
        title: `Gradle - ${currentGradleRelease} => ${latestGradleRelease}`,
        value: "gradle",
        description: "Upgrades the gradle wrapper",
      });
    }
  }

  return {
    choices,
    latestGradleRelease,
  };
}

function findOutdatedDependencies() {
  const upgradeReportFiles = findUpgradeJsonReportFiles();
  debugLog(`Found ${upgradeReportFiles.length} report files`);
  debugLog(upgradeReportFiles.join("\n"));

  let gradle;
  const mergedOutdatedDependencies = [];

  upgradeReportFiles.forEach((reportFile) => {
    const upgradeReportFileData = readFileSync(reportFile);
    let jsonReportData = JSON.parse(upgradeReportFileData);

    // Overwrite if it occurs multiple times
    if (jsonReportData.gradle) {
      gradle = jsonReportData.gradle;
    }

    // Merge outdated dependencies
    jsonReportData.outdated.dependencies.forEach((outdatedDependency) => {
      if (!mergedOutdatedDependencies.some((it) => it === outdatedDependency)) {
        mergedOutdatedDependencies.push(outdatedDependency);
      }
    });
  });

  return {
    gradle,
    outdated: {
      dependencies: mergedOutdatedDependencies,
    },
  };
}

function findUpgradeJsonReportFiles() {
  const reportJsonPath = "build/dependencyUpdates/report.json";
  const upgradeReportFiles = [];
  if (existsSync(reportJsonPath)) {
    upgradeReportFiles.push(reportJsonPath);
  }
  subDirectories("./").forEach((subDirectory) => {
    const reportDir = join(subDirectory, reportJsonPath);
    if (existsSync(reportDir)) {
      upgradeReportFiles.push(reportDir);
    }
  });
  return upgradeReportFiles;
}

function informUserAboutInstallingUpdatePlugin(exitCode) {
  const newestVersion = "0.36.0";

  console.log(`Error executing gradle dependency updates (StatusCode=${exitCode})`.bgRed);
  console.log(
    `\nIn case you haven't installed the gradle-versions-plugin (https://github.com/ben-manes/gradle-versions-plugin), put one of the following in your gradle build file:\n`
  );
  console.log(`Either Plugins block`);
  console.log(
    ` 
  plugins {
    id "com.github.ben-manes.versions" version "${newestVersion}"
  }\n`.green
  );
  console.log("or buildscript block");
  console.log(
    `
  buildscript {
    repositories {
      jcenter()
    }

    dependencies {
      classpath "com.github.ben-manes:gradle-versions-plugin:${newestVersion}"
    }
  }
  
  apply plugin: "com.github.ben-manes.versions"
  `.green
  );
}
