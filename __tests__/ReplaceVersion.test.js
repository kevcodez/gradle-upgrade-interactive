const ReplaceVersion = require('../ReplaceVersion')

const dependency = {
    group: 'de.kevcodez',
    name: 'pubg-api-wrapper',
    oldVersion: '0.8.1',
    version: '1.0.0'
}

test('Replace inline version', () => {
    const replacedVersion = replaceText(`compile 'de.kevcodez:pubg-api-wrapper:0.8.1'`, dependency)

    expect(replacedVersion).toBe(`compile 'de.kevcodez:pubg-api-wrapper:1.0.0'`)
})
test('Replace version with variable and single quotation marks', () => {
    const replacedVersion = replaceText(`
        myVar = '0.8.1'
        compile 'de.kevcodez:pubg-api-wrapper:$myVar'
`, dependency)

    expect(replacedVersion).toContain(`myVar = '1.0.0'`)
})
test('Replace version with variable and double quotation marks', () => {
    const replacedVersion = replaceText(`
        myVar = "0.8.1"
        compile 'de.kevcodez:pubg-api-wrapper:$myVar'
`, dependency)

    expect(replacedVersion).toContain(`myVar = "1.0.0"`)
})
test('Replace version with variable with parenthensis and double quotation marks', () => {
    const replacedVersion = replaceText(`
        myVar = "0.8.1"
        compile 'de.kevcodez:pubg-api-wrapper:\$\{myVar\}'
`, dependency)

    expect(replacedVersion).toContain(`myVar = "1.0.0"`)
})
test('Replace leave variable if it is already updated', () => {
    const replacedVersion = replaceText(`
        myVar = "1.0.0"
        compile 'de.kevcodez:pubg-api-wrapper:\$\{myVar\}'
`, dependency)

    expect(replacedVersion).toContain(`myVar = "1.0.0"`)
})
test('Replace plugin version with single quotation marks', () => {
    const pluginDependency = {
        group: 'com.github.ben-manes.versions',
        name: 'com.github.ben-manes.versions.gradle.plugin',
        oldVersion: '0.21.0',
        version: '0.22.0'
    }
    const replacedVersion = replaceText(`id 'com.github.ben-manes.versions' version '0.21.0'`, pluginDependency)

    expect(replacedVersion).toBe(`id 'com.github.ben-manes.versions' version '0.22.0'`)
})
test('Replace plugin version with double quotation marks', () => {
    const pluginDependency = {
        group: 'com.github.ben-manes.versions',
        name: 'com.github.ben-manes.versions.gradle.plugin',
        oldVersion: '0.21.0',
        version: '0.22.0'
    }
    const replacedVersion = replaceText(`id 'com.github.ben-manes.versions' version "0.21.0"`, pluginDependency)

    expect(replacedVersion).toBe(`id 'com.github.ben-manes.versions' version "0.22.0"`)
})
test('Replace version with version prefix in dependency', () => {
    const replacedVersion = replaceText(`compile group: 'de.kevcodez.pubg', name: 'pubg-api-wrapper', version: '0.8.1'`, dependency)

    expect(replacedVersion).toBe(`compile group: 'de.kevcodez.pubg', name: 'pubg-api-wrapper', version: '1.0.0'`)
})
test('Replace kotlin plugin version', () => {
    const pluginDependency = {
        group: 'com.github.ben-manes.versions',
        name: 'com.github.ben-manes.versions.gradle.plugin',
        oldVersion: '0.22.0',
        version: '0.24.0'
    }
    const replacedVersion = replaceText(`id("com.github.ben-manes.versions") version "0.22.0"`, pluginDependency)
    expect(replacedVersion).toBe(`id("com.github.ben-manes.versions") version "0.24.0"`)
})
test('Replace kotlin version with extra val without braces in reference', () => {
    const replacedVersion = replaceText(`
    val PUBG_API_WRAPPER by extra("0.8.1")
    
    dependencies {
        implementation("de.kevcodez:pubg-api-wrapper:$PUBG_API_WRAPPER")
    }
    `, dependency)

    expect(replacedVersion).toContain(`val PUBG_API_WRAPPER by extra("1.0.0")`)
})
test('Replace kotlin version with extra val with braces in reference', () => {
    const replacedVersion = replaceText(`
    val PUBG_API_WRAPPER by extra("0.8.1")
    
    dependencies {
        implementation("de.kevcodez:pubg-api-wrapper:$\{PUBG_API_WRAPPER\}")
    }
    `, dependency)

    expect(replacedVersion).toContain(`val PUBG_API_WRAPPER by extra("1.0.0")`)
})

function replaceText(source, dependency) {
    const replaceVersionActions = ReplaceVersion.replace(source, dependency)

    let modifiedSource = source
    replaceVersionActions.forEach(replaceAction => {
        modifiedSource = modifiedSource.replace(replaceAction.searchValue, replaceAction.replaceValue)
    })

    return modifiedSource
}