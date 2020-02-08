const {
    spawnSync
} = require('child_process');

function determineGradleCommand() {
    let gradleCommand = null
    let gradleWrapper = false
    try {
        const isWindows = process.platform === 'win32'
        const gradleWrapperFile = isWindows ? 'gradlew.bat' : 'gradlew'
        if (existsSync(gradleWrapperFile)) {
            gradleCommand = (isWindows ? '' : './') + gradleWrapperFile
            gradleWrapper = true
        }
    } catch (err) {}

    if (!gradleCommand) {
        const gradleVersion = spawnSync('gradle', ['--version'])
        if (gradleVersion.status === 0) {
            gradleCommand = 'gradle'
        }
    }

    return {
        gradleCommand,
        gradleWrapper
    }
}

module.exports = {
    determineGradleCommand
}