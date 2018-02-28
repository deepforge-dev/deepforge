/*globals define*/
/*jshint node:true, browser:true*/

define([
    'text!./metadata.json',
    'plugin/PluginBase',
    'q'
], function (
    pluginMetadata,
    PluginBase,
    Q
) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of ImportArtifact.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin ImportArtifact.
     * @constructor
     */
    var ImportArtifact = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructue etc.
     * This is also available at the instance at this.pluginMetadata.
     * @type {object}
     */
    ImportArtifact.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    ImportArtifact.prototype = Object.create(PluginBase.prototype);
    ImportArtifact.prototype.constructor = ImportArtifact;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    ImportArtifact.prototype.main = function (callback) {
        var self = this,
            config = this.getCurrentConfig(),
            hash = config.dataHash,
            baseName = config.dataTypeId,
            name,
            baseType,
            dataNode,

            metaDict,
            metanodes;

        // Create node of type "typeId" in the activeNode and set the hash, name
        metaDict = this.core.getAllMetaNodes(this.activeNode);
        metanodes = Object.keys(metaDict).map(id => metaDict[id]);
        baseType = metanodes.find(node =>
            this.core.getAttribute(node, 'name') === 'Data'
        );

        if (!baseType) {
            callback(`Could not find data type "${baseName}"`, this.result);
            return;
        }

        // Get the base node
        this.getArtifactsDir()
            .then(targetDir => {
                dataNode = this.core.createNode({
                    base: baseType,
                    parent: targetDir
                });

                this.core.setAttribute(dataNode, 'data', hash);
                this.core.setAttribute(dataNode, 'type', baseName);
                this.core.setAttribute(dataNode, 'createdAt', Date.now());
                baseName = this.core.getAttribute(baseType, 'name');

                var getName;
                if (config.name) {
                    getName = Q().then(() => config.name);
                } else {
                    getName = this.blobClient.getMetadata(hash)
                        .then(md => {
                            name = baseName[0].toLowerCase() + baseName.substring(1);
                            if (md) {
                                name = md.name.replace(/\.[^\.]*?$/, '');
                            }
                            return name;
                        });
                }
                return getName;
            })
            .then(name => this.core.setAttribute(dataNode, 'name', name))
            .then(() => this.save(`Uploaded "${name}" data`))
            .then(function () {
                self.result.setSuccess(true);
                callback(null, self.result);
            })
            .fail(function (err) {
                callback(err, self.result);
            });

    };

    ImportArtifact.prototype.getArtifactsDir = function() {
        // Find the artifacts dir
        return this.core.loadChildren(this.rootNode)
            .then(children => children
                .find(child => this.core.getAttribute(child, 'name') === 'MyArtifacts') ||
                    this.activeNode
            );
    };

    return ImportArtifact;
});
