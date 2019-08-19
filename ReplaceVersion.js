module.exports = {
  replace: function replaceVersion (body, dependency) {
    const oldVersion = dependency.oldVersion
    const newVersion = dependency.version

    let modifiedBody = body

    const regexVersionVariable = new RegExp(dependency.group + ":" + dependency.name + ":\\${?(\\w+)}?", "ig")

    const versionWithVariableMatches = regexVersionVariable.exec(modifiedBody)
    if (versionWithVariableMatches && versionWithVariableMatches.length === 2) {
      const variableName = versionWithVariableMatches[1]

      const regexVariableDefinition = new RegExp(`(${variableName}(\\s+)?=(\\s+)?('|")${oldVersion}('|"))`, "ig")
      const regexVariableDefinitionMatches = regexVariableDefinition.exec(modifiedBody)

      regexVariableDefinitionMatches.filter(it => it.includes(dependency.oldVersion)).forEach(match => {
        modifiedBody = modifiedBody.replace(match, match.replace(dependency.oldVersion, dependency.version))
      })
    }

    const regexVersionInline = new RegExp(`${dependency.group}:${dependency.name}:${dependency.oldVersion}`, "g")
    if (regexVersionInline.exec(modifiedBody)) {
      modifiedBody = modifiedBody.replace(regexVersionInline, `${dependency.group}:${dependency.name}:${dependency.version}`)
    }

    const regexVersionWithPrefix = new RegExp(`${dependency.group}("|')(\\s+)?version(\\s+)?("|')${oldVersion}("|')`)
    const regexVersionWithPrefixMatches = regexVersionWithPrefix.exec(modifiedBody)
    if (regexVersionWithPrefixMatches) {
      regexVersionWithPrefixMatches.filter(it => it.includes(oldVersion)).forEach(match => {
        modifiedBody = modifiedBody.replace(match, match.replace(oldVersion, newVersion))
      })
    }

    return modifiedBody
  }
}
