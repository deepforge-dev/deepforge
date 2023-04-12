/* globals define */
define([
    '../StorageClient',
    'blob/BlobClient'
], function(
    StorageClient,
    BlobClient
) {
    const URLPREFIX = "https://wellcomewebgme.centralus.cloudapp.azure.com/rest/blob/download/"
    const UDCPStorage = function(id, name, logger, config={}) {
        StorageClient.apply(this, arguments);
        // const params = this.getBlobClientParams();
        // params.apiToken = config.apiToken;
        // this.blobClient = new BlobClient(params);
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
        //return await this.fetch(`${URLPREFIX}${dataInfo}`)
        return await this.blobClient.getObject(`${URLPREFIX}${dataInfo}`);
    };

    UDCPStorage.prototype.getFileStream = async function(dataInfo) {
        const url = await this.getDownloadURL(dataInfo);
        const response = await this.fetch(`${URLPREFIX}${dataInfo}`, {method: 'GET'});
        return response.body;
    };

    UDCPStorage.prototype.putFile = async function(filename, content) {
        const hash = await this.blobClient.putFile(filename, content);
        return this.createDataInfo(hash);
    };

    UDCPStorage.prototype.putFileStream = async function(filename, stream) {
        this.ensureStreamSupport();
        this.ensureReadableStream(stream);
        const hash = await this.blobClient.putFile(filename, stream);
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
        return this.blobClient.getDownloadURL(`${URLPREFIX}${dataInfo}`);
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
