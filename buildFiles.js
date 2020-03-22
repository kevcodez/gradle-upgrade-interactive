const {
    existsSync
} = require('fs');
const {
    subDirectories
} = require('./io')
const {
    join
} = require('path')
const fs = require('fs')

function getBuildFiles(externalFiles) {
    let buildFiles = [];
    exports.buildFiles = buildFiles;
    if (externalFiles && externalFiles.length) {
        externalFiles.forEach(externalFile => {
            if (!existsSync(externalFile)) {
                console.log(`Unable to find ${externalFile} file.`.bgRed);
                return;
            } else {
                buildFiles.push(externalFile);
            }
        });
    }

    const allRecursiveFiles = getAllBuildFiles('.')

    const recursiveBuildFiles = allRecursiveFiles.filter(it => it.endsWith('build.gradle') ||it.endsWith('build.gradle.kts'))

    buildFiles.push(...recursiveBuildFiles)

    return buildFiles
}

const getAllBuildFiles = function(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath)
   
    arrayOfFiles = arrayOfFiles || []
   
    files.forEach(function(file) {
      if (fs.statSync(dirPath + "/" + file).isDirectory()) {
        arrayOfFiles = getAllBuildFiles(dirPath + "/" + file, arrayOfFiles)
      } else {
        arrayOfFiles.push(join(__dirname, dirPath, "/", file))
        
      }
    })
   
    return arrayOfFiles
  }

module.exports = {
    getBuildFiles
}