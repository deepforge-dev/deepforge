/*globals define*/
define([
    'common/util/assert',
    'deepforge/storage/index',
], function(
    assert,
    Storage,
) {

    const GeneratedFiles = function(blobClient) {
        this.blobClient = blobClient;
        this._files = {};
        this._data = {};
        this._auth = {};
    };

    GeneratedFiles.prototype.addUserAsset = function (path, dataInfo, creds) {
        assert(!!dataInfo, `Adding undefined user asset: ${path}`);
        dataInfo = typeof dataInfo === 'object' ? dataInfo : JSON.parse(dataInfo);
        this._data[path] = dataInfo;
        this._auth[path] = creds;
    };

    GeneratedFiles.prototype.getUserAssetPaths = function () {
        return Object.keys(this._data);
    };

    GeneratedFiles.prototype.getUserAsset = function (path) {
        return this._data[path];
    };

    GeneratedFiles.prototype.getUserAssetAuth = function (path) {
        return this._auth[path];
    };

    GeneratedFiles.prototype.getUserAssets = function () {
        return Object.entries(this._data);
    };

    GeneratedFiles.prototype.addFile = function (path, contents) {
        assert(typeof contents === 'string', `Cannot add non-string file ${path}.`);
        this._files[path] = contents;
    };

    GeneratedFiles.prototype.appendToFile = function (path, contents) {
        this._files[path] = (this._files[path] || '') + contents;
    };

    GeneratedFiles.prototype.getFile = function (path) {
        return this._files[path];
    };

    GeneratedFiles.prototype.getFilePaths = function () {
        return Object.keys(this._files);
    };

    GeneratedFiles.prototype.remove = function (path) {
        delete this._files[path];
        delete this._data[path];
        delete this._auth[path];
    };

    GeneratedFiles.prototype.save = async function (artifactName) {
        const artifact = this.blobClient.createArtifact(artifactName);

        // Transfer the data files to the blob and create an artifact
        const userAssets = this.getUserAssets();
        if (userAssets.length) {
            const objectHashes = {};
            for (let i = userAssets.length; i--;) {
                const [filepath, dataInfo] = userAssets[i];
                const creds = this.getUserAssetAuth(filepath);
                const config = {};
                config[dataInfo.backend] = creds;

                const contentsStream = await Storage.getFileStream(dataInfo, null, config);
                const filename = filepath.split('/').pop();
                const hash = await this.blobClient.putFile(filename, contentsStream);
                objectHashes[filepath] = hash;
            }
            await artifact.addObjectHashes(objectHashes);
        }
        await artifact.addFilesAsSoftLinks(this._files);
        return await artifact.save();
    };

    return GeneratedFiles;
});
