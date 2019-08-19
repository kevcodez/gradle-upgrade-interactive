# Gradle Upgrade Interactive

CLI to interactively upgrade gradle dependencies, inspired by yarn.

[![asciicast](https://asciinema.org/a/MSr9LppJKjb2gyCW0ozsdFWdb.svg)](https://asciinema.org/a/MSr9LppJKjb2gyCW0ozsdFWdb)

## Requirements

- NodeJS 10+
- [gradle-versions-plugin](https://github.com/ben-manes/gradle-versions-plugin)

## Installation

To get the data for the outdated dependencies, the [gradle-versions-plugin](https://github.com/ben-manes/gradle-versions-plugin) is required.

build.gradle

```groovy
plugins {
  id "com.github.ben-manes.versions" version "0.22.0"
}
```

Install the CLI

```
npm i -g gradle-upgrade-interactive
```

## Usage

Simply run `gradle-upgrade-interactive`.

## How it works

The [gradle-versions-plugin](https://github.com/ben-manes/gradle-versions-plugin) is called to generate a JSON report containg the outdate dependencies.
The CLI will then prompt all outdated dependencies and the selected dependency upgrades will be written to the build.gradle file.
