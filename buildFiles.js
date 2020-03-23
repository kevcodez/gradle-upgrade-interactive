const {
    existsSync
} = require('fs');
const {
    join
} = require('path')
const fs = require('fs')

function getBuildFiles(externalFiles, debugLog) {
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

    const directoryToSearchIn = __dirname

    debugLog(`Recursively looking for build files in directory ${directoryToSearchIn}`)

    const allRecursiveFiles = getAllBuildFiles(directoryToSearchIn)

    const recursiveBuildFiles = allRecursiveFiles.filter(it => it.endsWith('build.gradle') || it.endsWith('build.gradle.kts'))

    buildFiles.push(...recursiveBuildFiles)

    return buildFiles
}

const getAllBuildFiles = function (dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath)

    arrayOfFiles = arrayOfFiles || []

    files.forEach((file) => {
        const fsStat = fs.statSync(join(dirPath, "/", file))

        if (fsStat.isDirectory()) {
            arrayOfFiles = getAllBuildFiles(join(dirPath, "/", file), arrayOfFiles)
        } else {
            arrayOfFiles.push(join(dirPath, "/", file))
        }
    })

    return arrayOfFiles
}

module.exports = {
    getBuildFiles
}