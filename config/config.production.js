/* eslint-env node */
// Please Generate Your token keys before using this configuration
// If using linux run the utility script provided in utils/generate_token_keys.sh to generate keys
// Further details on user management and authentication
// can be found on https://github.com/webgme/tutorials/tree/master/_session6_auth
'use strict';

const config = require('./config.base'),
    validateConfig = require('webgme/config/validator');
const path = require('path');

// These two paths are necessary for JWT based authentication that webgme uses.
const privateKeyPath = process.env.DEEPFORGE_PRIVATE_KEY || path.join(__dirname, '..', '..', 'token_keys', 'private_key');
const publicKeyPath = process.env.DEEPFORGE_PUBLIC_KEY || path.join(__dirname, '..', '..','token_keys', 'public_key');

config.seedProjects.basePaths = ['src/seeds/project'];

config.authentication.enable = true;
config.authentication.jwt.publicKey = publicKeyPath;
config.authentication.jwt.privateKey = privateKeyPath;

// Change this to true if you want to have guest account
config.authentication.allowGuests = false;

// Change this to true if you want to allow user registration in your deployment.
config.authentication.allowUserRegistration = false;


config.authentication.guestAccount = 'guest';
config.authentication.userManagementPage = 'deepforge-user-management-page';

config.authentication.logInUrl = '/profile/login';
config.authentication.logOutUrl = '/profile/login';

validateConfig(config);
module.exports = config;