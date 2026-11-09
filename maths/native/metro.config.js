const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const repositoryRoot = path.resolve(projectRoot, '..');
const config = getDefaultConfig(projectRoot);

// The curriculum and marking engine stay shared with the web app.
config.watchFolders = [repositoryRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;
