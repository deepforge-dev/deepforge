'use strict';

var config = require('./config.webgme'),
    validateConfig = require('webgme/config/validator');

require('dotenv').load({silent: true});

// Add/overwrite any additional settings here
config.server.port = +process.env.PORT || config.server.port;
config.server.timeout = 0;
config.mongo.uri = process.env.MONGO_URI || config.mongo.uri;
config.blob.fsDir = process.env.DEEPFORGE_BLOB_DIR || config.blob.fsDir;

config.requirejsPaths.deepforge = './src/common';
config.requirejsPaths['aws-sdk-min'] = './node_modules/aws-sdk/dist/aws-sdk.min';
config.requirejsPaths.ace = './src/visualizers/widgets/TextEditor/lib/ace';
config.requirejsPaths.vs = './node_modules/monaco-editor/min/vs';
config.requirejsPaths.MonacoThemes = './src/visualizers/widgets/MonacoEditor/styles/themes';
config.requirejsPaths.MonacoVim = './node_modules/monaco-vim/dist/monaco-vim';
config.requirejsPaths.Chance = './node_modules/chance/dist/chance.min';

config.seedProjects.defaultProject = 'project';

config.plugin.allowBrowserExecution = true;
config.plugin.allowServerExecution = true;

config.executor.enable = true;

config.visualization.extraCss.push('deepforge/styles/global.css');

config.storage.autoMerge.enable = true;

validateConfig(config);
module.exports = config;
