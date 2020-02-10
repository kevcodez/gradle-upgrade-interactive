const {
    spawnSync
} = require('child_process');
const {join} = require('path')

function determineGradleCommand(debugLog) {
    let gradleCommand = null
    let gradleWrapper = false
    debugLog('Determining gradle command')
    try {
        const isWindows = process.platform === 'win32'
        debugLog('isWindows: ' + isWindows)
        const gradleWrapperFile = isWindows ? 'gradlew.bat' : 'gradlew'

        const gradleWrapperFilePath = join('./', gradleWrapperFile)

        debugLog(`Checking if wrapper file ${gradleWrapperFilePath} exists`)
        if (existsSync(gradleWrapperFilePath)) {
            debugLog('Wrapper file exists')
            gradleCommand = (isWindows ? '' : './') + gradleWrapperFile
            gradleWrapper = true
        } else {
            debugLog('Wrapper file not found')
        }
    } catch (err) {}

    if (!gradleCommand) {
        const gradleVersion = spawnSync('gradle', ['--version'])
        if (gradleVersion.status === 0) {
            gradleCommand = 'gradle'
        }
    }

    debugLog(`Determined gradle command: ${gradleCommand}, wrapper: ${gradleWrapper}`)

    return {
        gradleCommand,
        gradleWrapper
    }
}

module.exports = {
    determineGradleCommand
}