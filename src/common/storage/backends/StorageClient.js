/* globals define, WebGMEGlobal */
define([
    'client/logger'
], function(
    Logger
) {
    const StorageClient = function(id, name, logger) {
        this.id = id;
        this.name = name;
        if (!logger) {
            let gmeConfig;
            if (require.isBrowser) {
                gmeConfig = WebGMEGlobal.gmeConfig;
            } else {
                gmeConfig = require.nodeRequire('../../../config');
            }
            logger = Logger.create(`gme:storage:${id}`, gmeConfig.client.log);
        }
        this.logger = logger.fork(`storage:${id}`);
    };

    StorageClient.prototype.getFile = async function(/*dataInfo*/) {
        throw new Error(`File download not implemented for ${this.name}`);
    };

    StorageClient.prototype.putFile = async function(/*filename, content*/) {
        throw new Error(`File upload not supported by ${this.name}`);
    };

    StorageClient.prototype.deleteFile = async function(/*dataInfo*/) {
        throw new Error(`File deletion not supported by ${this.name}`);
    };

    StorageClient.prototype.deleteDir = function(/*dirname*/) {
        throw new Error(`Directory deletion not supported by ${this.name}`);
    };

    StorageClient.prototype.getDownloadURL = async function(/*dataInfo*/) {
        // TODO: Remove this in favor of directly downloading w/ getFile, etc
        throw new Error(`getDownloadURL not implemented for ${this.name}`);
    };

    StorageClient.prototype.getMetadata = async function(/*dataInfo*/) {
        throw new Error(`getDownloadURL not implemented for ${this.name}`);
    };

    StorageClient.prototype.copy = async function(dataInfo, filename) {
        const content = await this.getFile(dataInfo);
        return this.putFile(filename, content);
    };

    StorageClient.prototype.createDataInfo = function(data) {
        return {backend: this.id, data};
    };

    return StorageClient;
});
