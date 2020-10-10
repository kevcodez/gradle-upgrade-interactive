const argv = require("yargs")
  .option("resolution", {
    alias: "r",
    describe:
      "Controls the dependency resolution strategy.\nSupported options:\n* release: selects the latest release\n* milestone: select the latest version being either a milestone or a release (default)\n* integration: selects the latest revision of the dependency module (such as SNAPSHOT)",
    type: "string",
    nargs: 1,
    demand: false,
  })
  .option("semver", {
    alias: "s",
    describe:
      "Which semantic version diffs to include (https://semver.org). Flag can be used multiple times.\nSupported options:\n* major: Include upgrades with a major version change\n* minor: Include upgrades with a minor version change\n* patch: Include upgrades with a patch version change",
    type: "string",
    array: true,
    nargs: 1,
    demand: false,
  })
  .option("external-file", {
    alias: "e",
    describe: "Points to a file where dependencies have been declared, e.g. gradle/dependencies.gradle. Option can be used multiple times.",
    type: "array",
    nargs: 1,
    demand: false,
  })
  .option("debug", {
    alias: "d",
    describe: "Prints debugging information, such as commands executed and current status.",
    type: "boolean",
    demand: false,
    default: false,
  })
  .option("no-color", {
    describe: "Disables color output",
    nargs: 1,
    demand: false,
  }).argv;

module.exports = {
  argv,
};
