const { existsSync } = require("fs");
const { resolve } = require("path");
const fs = require("fs");

function getBuildFiles(externalFiles, debugLog) {
  let buildFiles = [];
  exports.buildFiles = buildFiles;
  if (externalFiles && externalFiles.length) {
    externalFiles.forEach((externalFile) => {
      if (!existsSync(externalFile)) {
        console.log(`Unable to find ${externalFile} file.`.bgRed);
        return;
      } else {
        buildFiles.push(externalFile);
      }
    });
  }

  const directoryToSearchIn = process.cwd();

  debugLog(`Recursively looking for build files in directory ${directoryToSearchIn}`);

  const allRecursiveFiles = getAllBuildFiles(directoryToSearchIn);

  const recursiveBuildFiles = allRecursiveFiles.filter((it) => it.endsWith("build.gradle") || it.endsWith("build.gradle.kts"));

  buildFiles.push(...recursiveBuildFiles);

  return buildFiles;
}

const getAllBuildFiles = function (dirPath, arrayOfFiles) {
  const files = fs
    .readdirSync(dirPath, {
      withFileTypes: true,
    })
    .filter((it) => !it.name.startsWith(".") && !it.name.startsWith("node_modules"));

  arrayOfFiles = arrayOfFiles || [];

  files.forEach((dirent) => {
    const resolvedFile = resolve(dirPath, dirent.name);
    if (dirent.isDirectory()) {
      arrayOfFiles = getAllBuildFiles(resolvedFile, arrayOfFiles);
    } else {
      arrayOfFiles.push(resolvedFile);
    }
  });

  return arrayOfFiles;
};

module.exports = {
  getBuildFiles,
};
