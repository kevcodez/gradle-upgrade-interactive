# Gradle Upgrade Interactive

[![Build Status](https://travis-ci.org/kevcodez/gradle-upgrade-interactive.svg?branch=master)](https://travis-ci.org/kevcodez/gradle-upgrade-interactive)
[![NPM](https://img.shields.io/npm/v/gradle-upgrade-interactive)](https://www.npmjs.com/package/gradle-upgrade-interactive)

CLI to interactively upgrade Gradle dependencies, inspired by yarn.

![](https://raw.githubusercontent.com/kevcodez/gradle-upgrade-interactive/master/cli.gif)

Easily upgrade your dependencies and Gradle itself by simply selecting what you want to upgrade.

## Requirements

- NodeJS 10+
- [gradle-versions-plugin](https://github.com/ben-manes/gradle-versions-plugin)

## Installation

To get the data for the outdated dependencies, the [gradle-versions-plugin](https://github.com/ben-manes/gradle-versions-plugin) is required.

build.gradle

```groovy
plugins {
  id "com.github.ben-manes.versions" version "0.36.0"
}
```

Install the CLI

```sh
npm i -g gradle-upgrade-interactive
```

## Usage

Simply run `gradle-upgrade-interactive`.

```
Options:
  --help               Show help                                        [boolean]
  --version            Show version number                              [boolean]
  --resolution, -r     Controls the dependency resolution strategy.
                       Supported options:
                       * release: selects the latest release
                       * milestone: select the latest version being either a
                       milestone or a release (default)
                       * integration: selects the latest revision of the
                       dependency module (such as SNAPSHOT)             [string]
  --semver, -s         Which semantic version diffs to include
                       (https://semver.org). Flag can be used multiple times.
                       Supported options:
                       * major: Include upgrades with a major version change
                       * minor: Include upgrades with a minor version change
                       * patch: Include upgrades with a patch version change
                                                                         [array]
  --external-file, -e  Points to a file where dependencies have been declared,
                       e.g. gradle/dependencies.gradle. Option can be used
                       multiple times.                                   [array]
  --debug, -d          Prints debugging information, such as commands executed
                       and current status.           [boolean] [Standard: false]
  --no-color           Disables color output
```

## How it works

The [gradle-versions-plugin](https://github.com/ben-manes/gradle-versions-plugin) is called to generate a JSON report containing the outdated dependencies.
The CLI will then prompt all outdated dependencies and the selected dependency upgrades will be written to the Gradle build file.
