/* globals define */
import {Storage} from "../Storage"

define([
    '../StorageClient',
    'blob/BlobClient'
], function(
    StorageClient,
    BlobClient
) {
    //const URLPREFIX = 'https://wellcomewebgme.centralus.cloudapp.azure.com/rest/blob/download/'
    const UDCPStorage = function(id, name, logger) {
        StorageClient.apply(this, arguments);
        //this.blobClient = new BlobClient();
        this.Storage = new Storage()
    };

    UDCPStorage.prototype = Object.create(StorageClient.prototype);

    // UDCPStorage.prototype.getBlobClientParams = function() {
    //     const params = {
    //         logger: this.logger.fork('BlobClient')
    //     };
    //     if (!require.isBrowser) {
    //         const [url, isHttps] = this.getServerURL();
    //         const defaultPort = isHttps ? '443' : '80';
    //         const [server, port=defaultPort] = url.split(':');
    //         params.server = server;
    //         params.serverPort = +port;
    //         params.httpsecure = isHttps;
    //     }
    //     return params;
    // };

    UDCPStorage.prototype.getFile = async function(dataInfo) {
        const {data} = dataInfo;
        this.Storage.getFile(data)
    };

    UDCPStorage.prototype.getFileStream = async function(dataInfo) {
        const url = await this.getDownloadURL(dataInfo);
        const response = await this.fetch(url, {method: 'GET'});
        return response.body;
    };

    UDCPStorage.prototype.putFile = async function(filename, content) {
        const hash = await this.Storage.appendArtifact(filename, content);
        return this.createDataInfo(hash);
    };

    UDCPStorage.prototype.putFileStream = async function(filename, stream) {
        this.ensureStreamSupport();
        this.ensureReadableStream(stream);
        const hash = await this.Storage.appendArtifact(filename, stream);
        return this.createDataInfo(hash);
    };

    UDCPStorage.prototype.deleteDir =
    UDCPStorage.prototype.deleteFile = async function() {};

    UDCPStorage.prototype.getMetadata = async function(dataInfo) {
        const {data} = dataInfo;
        return await this.blobClient.getMetadata(data);
    };

    UDCPStorage.prototype.getDownloadURL = async function(dataInfo) {
        const {data} = dataInfo;
        return this.Storage.getDownloadURL(data);
    };

    UDCPStorage.prototype.getCachePath = async function(dataInfo) {
        const metadata = await this.getMetadata(dataInfo);
        const hash = metadata.content;
        const dir = hash.substring(0, 2);
        const filename = hash.substring(2);
        return `${this.id}/${dir}/${filename}`;
    };

    return UDCPStorage;
});
