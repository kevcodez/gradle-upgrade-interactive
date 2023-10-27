import { readdirSync, lstatSync } from "fs";

const isDirectory = (source) => lstatSync(source).isDirectory();

const subDirectories = (path) => readdirSync(path).filter(isDirectory);

export { subDirectories };
