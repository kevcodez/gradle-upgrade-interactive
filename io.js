const { readdirSync, lstatSync } = require("fs");

const isDirectory = (source) => lstatSync(source).isDirectory();

const subDirectories = (path) => readdirSync(path).filter(isDirectory);

module.exports = {
  subDirectories,
};
