/*globals define*/
/*jshint node:true, browser:true*/

define([
    'plugin/PluginBase',
    'common/util/guid',
    'deepforge/Constants',
    'deepforge/utils',
    'js/RegistryKeys',
    'js/Panels/MetaEditor/MetaEditorConstants',
    'underscore',
    './schemas/index',
    'text!./metadata.json'
], function (
    PluginBase,
    generateGuid,
    Constants,
    utils,
    REGISTRY_KEYS,
    META_CONSTANTS,
    _,
    Schemas,
    metadata
) {
    'use strict';

    /**
     * Initializes a new instance of CreateTorchMeta.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin CreateTorchMeta.
     * @constructor
     */
    var CreateTorchMeta = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = CreateTorchMeta.metadata;
        this.metaSheets = {};
        this.sheetCounts = {};
    };

    CreateTorchMeta.metadata = JSON.parse(metadata);

    // Prototypal inheritance from PluginBase.
    CreateTorchMeta.prototype = Object.create(PluginBase.prototype);
    CreateTorchMeta.prototype.constructor = CreateTorchMeta;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    CreateTorchMeta.prototype.main = function (callback) {
        if (!this.META.Language) {
            return callback('"Language" container required to run plugin', this.result);
        }

        // Extra layer names
        // The format is...
        //      - (Abstract) CategoryLayerTypes
        //          - LayerName
        //              - Attributes (if exists)
        var layers,
            content = {},
            categories,
            config = this.getCurrentConfig(),
            nodes = {};

        try {
            layers = this.getJsonLayers();
        } catch (e) {
            return callback('JSON parse error: ' + e, this.result);
        }
        layers.forEach(layer => {
            if (!content[layer.type]) {
                content[layer.type] = [];
            }
            content[layer.type].push(layer);
        });

        categories = Object.keys(content);
        // Create the base class, if needed
        if (!this.META.Layer) {
            this.META.Layer = this.createMetaNode('Layer', this.META.FCO);
        }

        // Create the category nodes
        categories
            .forEach(name => {
                // Create a tab for each
                this.metaSheets[name] = this.createMetaSheetTab(name);
                this.sheetCounts[name] = 0;
                nodes[name] = this.createMetaNode(name, this.META.Layer, name);
            });

        // Make them abstract
        categories
            .forEach(name => this.core.setRegistry(nodes[name], 'isAbstract', true));

        if (config.removeOldLayers) {
            var isNewLayer = {},
                newLayers = layers.map(layer => layer.name),
                oldLayers,
                oldNames;

            newLayers = newLayers.concat(categories);  // add the category nodes
            newLayers.forEach(name => isNewLayer[name] = true);

            // Set the newLayer nodes 'base' to 'Layer' so we don't accidentally
            // delete them
            newLayers
                .map(name => this.META[name])
                .filter(layer => !!layer)
                .forEach(layer => this.core.setBase(layer, this.META.Layer));

            oldLayers = Object.keys(this.META)
                    .filter(name => name !== 'Layer')
                    .map(name => this.META[name])
                    .filter(node => this.isMetaTypeOf(node, this.META.Layer))
                    .filter(node => !isNewLayer[this.core.getAttribute(node, 'name')]);

            oldNames = oldLayers.map(l => this.core.getAttribute(l, 'name'));
            // Get the old layer names
            this.logger.debug(`Removing layers: ${oldNames.join(', ')}`);
            oldLayers.forEach(layer => this.core.deleteNode(layer));
        }

        // Create the actual nodes
        categories.forEach(cat => {
            content[cat]
                .forEach(layer => {
                    var name = layer.name,
                        node;

                    node = this.createMetaNode(name, nodes[cat], cat, layer);
                    // Make the node non-abstract
                    if (node) {
                        this.core.setRegistry(node, 'isAbstract', false);
                        nodes[name] = node;
                    }
                });
        });

        this.save('CreateTorchMeta updated model.')
            .then(() => {
                this.result.setSuccess(true);
                callback(null, this.result);
            })
            .fail(err => callback(err, this.result));
    };

    CreateTorchMeta.prototype.removeFromMeta = function (nodeId) {
        var sheets = this.core.getRegistry(this.rootNode, REGISTRY_KEYS.META_SHEETS),
            sheet;

        // Remove from meta
        this.core.delMember(this.rootNode, META_CONSTANTS.META_ASPECT_SET_NAME, nodeId);

        // Remove from the given meta sheet
        sheet = sheets.find(sheet => {
            var paths = this.core.getMemberPaths(this.rootNode, sheet.SetID);
            return paths.indexOf(nodeId) > -1;
        });

        if (sheet) {
            this.core.delMember(this.rootNode, sheet.SetID, nodeId);
        }
    };

    CreateTorchMeta.prototype.createMetaSheetTab = function (name) {
        var sheets = this.core.getRegistry(this.rootNode, REGISTRY_KEYS.META_SHEETS),
            id = META_CONSTANTS.META_ASPECT_SHEET_NAME_PREFIX + generateGuid(),
            sheet,
            desc = {
                SetID: id,
                order: sheets.length,
                title: name
            };

        sheet = sheets.find(sheet => sheet.title === name);
        if (!sheet) {
            sheet = desc;
            this.logger.debug(`creating meta sheet "${name}"`);
            this.core.createSet(this.rootNode, sheet.SetID);
            sheets.push(sheet);
            this.core.setRegistry(this.rootNode, REGISTRY_KEYS.META_SHEETS, sheets);
        }
        return sheet.SetID;
    };

    CreateTorchMeta.prototype.getJsonLayers = function () {
        var config = this.getCurrentConfig(),
            schema = config.layerSchema;

        if (schema === 'all') {
            return Object.keys(Schemas).map(key => JSON.parse(Schemas[key]))
                .reduce((l1, l2) => l1.concat(l2), []);
        }

        return JSON.parse(Schemas[schema]);
    };

    // Some helper methods w/ attribute handling
    var PYTHON_TO_GME = {
        boolean: 'boolean',
        float: 'float',
        int: 'integer',
        string: 'string'
    };

    var isLayerAttribute = type => type && type.substring(0, 3) === 'nn.';

    CreateTorchMeta.prototype.createMetaNode = function (name, base, tabName, layer) {
        var node = this.META[name],
            nodeId = node && this.core.getPath(node),
            tabId = this.metaSheets[tabName],
            position = this.getPositionFor(name, tabName),
            setters = {},
            defaults = {},
            types = {},
            type,
            attrs,
            desc;

        if (layer) {
            attrs = layer.params;
            setters = layer.setters;
            defaults = layer.defaults;
            types = layer.types || types;
        }
        if (!tabId) {
            this.logger.error(`No meta sheet for ${tabName}`);
        }

        if (!node) {
            // Create a node
            node = this.core.createNode({
                parent: this.META.Language,
                base: base
            });
            this.core.setAttribute(node, 'name', name);

            nodeId = this.core.getPath(node);
        } else {
            // Remove from meta
            this.removeFromMeta(nodeId);
            this.core.setBase(node, base);
        }

        // Add it to the meta sheet
        this.core.addMember(this.rootNode, META_CONSTANTS.META_ASPECT_SET_NAME, node);
        this.core.addMember(this.rootNode, tabId, node);

        this.core.setMemberRegistry(
            this.rootNode,
            META_CONSTANTS.META_ASPECT_SET_NAME,
            nodeId,
            REGISTRY_KEYS.POSITION,
            position
        );
        this.core.setMemberRegistry(
            this.rootNode,
            tabId,
            nodeId,
            REGISTRY_KEYS.POSITION,
            position
        );

        if (attrs) {  // Add the attributes
            // Remove attributes not in the given list
            var currentAttrs = this.core.getValidAttributeNames(node),
                defVal,
                rmAttrs,
                simpleAttrs,
                rmPtrs;

            simpleAttrs = attrs.filter(name => !isLayerAttribute(types[name]));
            rmAttrs = _.difference(currentAttrs, simpleAttrs)  // old attribute names
                .filter(attr => attr !== 'name')
                .filter(attr => !setters[attr]);

            rmAttrs.forEach(attr => {
                this.core.delAttributeMeta(node, attr);
                if (this.core.getOwnAttribute(node, attr) !== undefined) {
                    this.core.delAttribute(node, attr);
                }
            });

            // Remove all old pointers
            rmPtrs = _.difference(this.core.getPointerNames(node), currentAttrs)
                .filter(ptr => ptr !== 'base');

            if (rmPtrs.length + rmAttrs.length) {
                this.logger.debug(`Removing ${rmPtrs.concat(rmAttrs).join(', ')} from ${name}`);
            }
            rmPtrs.forEach(ptr => this.core.delPointerMeta(node, ptr));

            attrs.forEach(name => {
                desc = {};
                defVal = defaults.hasOwnProperty(name) ? defaults[name] : '';
                type = PYTHON_TO_GME[types[name]];
                if (type) {
                    desc.type = type;
                }
                if (isLayerAttribute(types[name])) {  // Check if it is an nn layer type
                    // If so, create a pointer rather than attribute
                    this.addLayerAttribute(name, node);
                    this.logger.debug(`${name} is a layer type attribute`);
                } else {
                    this.addAttribute(name, node, desc, defVal);
                }
            });
            this.core.setAttribute(node, Constants.CTOR_ARGS_ATTR, attrs.join(','));

            // Add the setters to the meta
            Object.keys(setters).forEach(name => {
                desc = utils.getSetterSchema(name, setters, defaults);
                defVal = desc.default;
                delete desc.default;
                this.addAttribute(name, node, desc, defVal);
            });
        }
        this.logger.debug(`added ${name} to the meta`);

        return node;
    };

    CreateTorchMeta.prototype.getPositionFor = function(name, tabName) {
        var index = this.sheetCounts[tabName],
            dx = 140,
            dy = 100,
            MAX_WIDTH = 1200,
            x;

        if (tabName === 'Convolution') {
            dx *= 1.3;
            dy *= 1.5;
        }

        this.sheetCounts[tabName]++;
        if (index === 0) {
            return {
                x: MAX_WIDTH/2,
                y: 50
            };
        }

        x = dx*index;
        return {
            x: x%MAX_WIDTH,
            y: Math.floor(x/MAX_WIDTH+1)*dy + 50
        };
    };

    CreateTorchMeta.prototype.addLayerAttribute = function (name, node) {
        // No default value support for now...
        // Create a pointer of the given type on the node
        this.core.setPointerMetaTarget(node, name, this.META.Architecture, 1, 1);
        this.core.setPointerMetaLimits(node, name, 1, 1);
    };

    CreateTorchMeta.prototype.addAttribute = function (name, node, schema, defVal) {
        schema.type = schema.type || 'string';
        if (schema.type === 'list') {  // FIXME: add support for lists
            schema.type = 'string';
        }

        if (schema.min !== undefined) {
            schema.min = +schema.min;
        }

        if (schema.max !== undefined) {
            // Set the min, max
            schema.max = +schema.max;
        }
        // Add the enum for booleans so we use python style True/False
        if (schema.type === 'boolean') {
            schema.enum = ['True', 'False'];
            schema.type = 'string';
        }

        // Create the attribute and set the schema
        this.core.setAttributeMeta(node, name, schema);

        if (defVal) {
            this.core.setAttribute(node, name, defVal);
        }
    };

    return CreateTorchMeta;
});
