/*global define*/
define([
    'deepforge/udcpConfig',
], function(
    config,
) {
    const metadata = {
        name: 'UDCP Blob Storage',
        configStructure: [],
        url: ""
    };


    if (config.authentication.enable) {
        metadata.configStructure.push({
            name: 'apiToken',
            displayName: 'Access Token',
            value: '',
            valueType: 'string',
            readOnly: false,
            isAuth: true,
            isRequiredForBrowser: false,
        });
    }
    return metadata;
});
