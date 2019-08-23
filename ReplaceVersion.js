module.exports = {
  replace: function replaceVersion (body, dependency) {
    const oldVersion = dependency.oldVersion
    const newVersion = dependency.version

    let modifiedBody = body

    const regexVersionVariable = new RegExp(dependency.group + ":" + dependency.name + ":\\${?(\\w+)}?", "ig")

    // 'de.kevcodez:pubg-api-wrapper:$myVar'
    // 'de.kevcodez:pubg-api-wrapper:${myVar}'
    const versionWithVariableMatches = regexVersionVariable.exec(modifiedBody)
    if (versionWithVariableMatches && versionWithVariableMatches.length === 2) {
      const variableName = versionWithVariableMatches[1]

      const regexVariableDefinition = new RegExp(`(${variableName}(\\s+)?=(\\s+)?('|")${oldVersion}('|"))`, "ig")
      const regexVariableDefinitionMatches = regexVariableDefinition.exec(modifiedBody)

      if (regexVariableDefinitionMatches && regexVariableDefinitionMatches.length) {
        regexVariableDefinitionMatches.filter(it => it.includes(dependency.oldVersion)).forEach(match => {
          modifiedBody = modifiedBody.replace(match, match.replace(dependency.oldVersion, dependency.version))
        })
      }
    }

    // compile 'de.kevcodez:pubg-api-wrapper:1.0.0'
    const regexVersionInline = new RegExp(`${dependency.group}:${dependency.name}:${dependency.oldVersion}`, "g")
    if (regexVersionInline.exec(modifiedBody)) {
      modifiedBody = modifiedBody.replace(regexVersionInline, `${dependency.group}:${dependency.name}:${dependency.version}`)
    }

    // id 'com.github.ben-manes.versions' version "0.21.0"
    const regexPluginVersionWithPrefix = new RegExp(`${dependency.group}("|')(\\s+)?version(\\s+)?("|')${oldVersion}("|')`)
    const regexVersionWithPrefixMatches = regexPluginVersionWithPrefix.exec(modifiedBody)
    if (regexVersionWithPrefixMatches && regexVersionWithPrefixMatches.length) {
      regexVersionWithPrefixMatches.filter(it => it.includes(oldVersion)).forEach(match => {
        modifiedBody = modifiedBody.replace(match, match.replace(oldVersion, newVersion))
      })
    }

    // compile group: 'de.kevcodez.pubg', name: 'pubg-api-wrapper', version: '0.8.1'
    const regexDependencyWithVersionPrefix = new RegExp(`${dependency.name}('|"),(\\s+)?version:(\\s+)('|")${dependency.oldVersion}('|")`)
    const regexDependencyWithVersionPrefixMatches = regexDependencyWithVersionPrefix.exec(modifiedBody)
    if (regexDependencyWithVersionPrefixMatches && regexDependencyWithVersionPrefixMatches.length) {
      regexDependencyWithVersionPrefixMatches.filter(it => it.includes(oldVersion)).forEach(match => {
        modifiedBody = modifiedBody.replace(match, match.replace(oldVersion, newVersion))
      })
    }

    return modifiedBody
  }
}
