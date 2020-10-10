const { spawnSync } = require("child_process");
const { existsSync } = require("fs");

function determineGradleCommand(debugLog) {
  let gradleCommand = null;
  let gradleWrapper = false;

  debugLog("Determining gradle command");

  try {
    const isWindows = process.platform === "win32";
    debugLog("isWindows: " + isWindows);
    const gradleWrapperFile = isWindows ? "gradlew.bat" : "gradlew";

    debugLog(`Checking if wrapper file ${gradleWrapperFile} exists`);
    if (existsSync(gradleWrapperFile)) {
      debugLog("Wrapper file exists");
      gradleCommand = (isWindows ? "" : "./") + gradleWrapperFile;
      gradleWrapper = true;
    } else {
      debugLog("Wrapper file not found");
    }
  } catch (err) {
    debugLog("Error trying to determine gradle command.");
    debugLog(err);
  }

  if (!gradleCommand) {
    const gradleVersion = spawnSync("gradle", ["--version"]);
    if (gradleVersion.status === 0) {
      gradleCommand = "gradle";
    }
  }

  debugLog(`Determined gradle command: ${gradleCommand}, wrapper: ${gradleWrapper}`);

  return {
    gradleCommand,
    gradleWrapper,
  };
}

module.exports = {
  determineGradleCommand,
};
