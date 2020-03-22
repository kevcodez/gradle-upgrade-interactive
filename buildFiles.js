const {
    existsSync
} = require('fs');
const {
    subDirectories
} = require('./io')
const {
    join
} = require('path')

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

    const directoriesToCheck = ['./']
    directoriesToCheck.push(...subDirectories('./'))

    directoriesToCheck.forEach(directory => {
        const groovyBuildFile = join(directory, 'build.gradle');
        const kotlinBuildFile = join(directory, 'build.gradle.kts');
        if (existsSync(groovyBuildFile)) {
            buildFiles.push(groovyBuildFile);
        } else if (existsSync(kotlinBuildFile)) {
            buildFiles.push(kotlinBuildFile);
        }
    })

    return buildFiles
}

module.exports = {
    getBuildFiles
}