/*globals define */
/*jshint node:true, browser:true*/

define([
    'text!./metadata.json',
    'text!./deepforge.ejs',
    'plugin/PluginBase',
    'deepforge/plugin/PtrCodeGen',
    'deepforge/Constants',
    'underscore',
    'q'
], function (
    pluginMetadata,
    deepForgeTxt,
    PluginBase,
    PtrCodeGen,
    CONSTANTS,
    _,
    Q
) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);
    var HEADER_LENGTH = 60,
        SKIP_ATTRS = {
            lineOffset: true,
            code: true
        },
        RESERVED = /^(and|break|do|else|elseifend|false|for|function|if|in|local|nil|not|orrepeat|return|then|true|until|while|print)$/,
        INDENT = '   ',
        INIT_CLASSES_FN = '__initClasses',
        INIT_LAYERS_FN = '__initLayers',
        DEEPFORGE_CODE = _.template(deepForgeTxt)({
            initCode: `${INIT_CLASSES_FN}()\n${INDENT}${INIT_LAYERS_FN}()`
        });

    /**
     * Initializes a new instance of GenerateExecFile.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin GenerateExecFile.
     * @constructor
     */
    var GenerateExecFile = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;

        this._srcIdFor = {};  // input path -> output data node path

        this._nameFor = {};  // input path -> opname
        this._outputNames = {};
        this._baseNameFor = {};
        this._dataNameFor = {};  
        this._instanceNames = {};
        this._opBaseNames = {};
        this._fnNameFor = {};
        this._functions = {};  // function definitions for the operations

        // topo sort stuff
        this._nextOps = {};
        this._incomingCnts = {};

        this._operations = {};
        this.activeNodeId = null;
        this.activeNodeDepth = null;

        this.isInputOp = {};
        this.isOutputOp = {};
    };

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructue etc.
     * This is also available at the instance at this.pluginMetadata.
     * @type {object}
     */
    GenerateExecFile.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    GenerateExecFile.prototype = Object.create(PluginBase.prototype);
    GenerateExecFile.prototype.constructor = GenerateExecFile;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    GenerateExecFile.prototype.main = function (callback) {
        var name = this.core.getAttribute(this.activeNode, 'name');
        // Get all the children and call generate exec file
        this.activeNodeId = this.core.getPath(this.activeNode);
        this.activeNodeDepth = this.activeNodeId.split('/').length + 1;

        if (this.isMetaTypeOf(this.activeNode, this.META.Execution)) {
            this.activeNodeDepth++;
        }

        return this.core.loadChildren(this.activeNode)
            .then(nodes => this.createExecFile(nodes))
            .then(code => this.blobClient.putFile(`${name}.lua`, code))
            .then(hash => {
                this.result.addArtifact(hash);
                this.result.setSuccess(true);
                callback(null, this.result);
            })
            .fail(err => callback(err));
    };

    GenerateExecFile.prototype.createExecFile = function (children) {
        return this.createCodeSections(children)
            .then(sections => {
                var classes,
                    initClassFn,
                    initLayerFn,
                    code = [];

                // concat all the sections into a single file

                // wrap the class/layer initialization in a fn
                // Add the classes ordered wrt their deps
                classes = Object.keys(sections.classes)
                    .sort((a, b) => {
                        // if a depends on b, switch them (return 1)
                        if (sections.classDependencies[a].includes(b)) {
                            return 1;
                        }
                        return -1;
                    })
                    // Create fns from the classes
                    .map(name => [
                        `local function init${name}()`,
                        indent(sections.classes[name]),
                        'end',
                        `init${name}()`
                    ].join('\n'));

                initClassFn = [
                    `local function ${INIT_CLASSES_FN}()`,
                    indent(classes.join('\n\n')),
                    'end'
                ].join('\n');

                code = code.concat(initClassFn);

                // wrap the layers in a function
                initLayerFn = [
                    `local function ${INIT_LAYERS_FN}()`,
                    indent(_.values(sections.layers).join('\n\n')),
                    'end'
                ].join('\n');
                code = code.concat(initLayerFn);
                code = code.concat(_.values(sections.operations));

                code = code.concat(_.values(sections.pipelines));

                code.push(DEEPFORGE_CODE);
                code.push('deepforge.initialize()');
                code.push(sections.main);

                return code.join('\n\n');
            });
    };

    GenerateExecFile.prototype.createCodeSections = function (children) {
        // Convert opNodes' jobs to the nested operations
        var opNodes,
            nodes;

        return this.unpackJobs(children)
            .then(_nodes => {
                nodes = _nodes;
                opNodes = nodes
                    .filter(node => this.isMetaTypeOf(node, this.META.Operation));

                return Q.all(nodes.map(node => this.registerNode(node)));
            })
            .then(() => Q.all(opNodes
                .filter(n => {
                    var id = this.core.getPath(n);
                    return !this.isInputOp[id];
                })
                .map(node => this.createOperation(node)))
            )
            .then(operations => {
                var opDict = {},
                    firstOpIds;

                firstOpIds = opNodes.map(n => this.core.getPath(n))
                    .filter(id => !this._incomingCnts[id]);

                operations.forEach(op => opDict[op.id] = op);

                // Toposort!
                return this.sortOperations(opDict, firstOpIds);
            })
            .then(operations => this.generateCodeSections(operations))
            .fail(err => this.logger.error(err));
    };

    GenerateExecFile.prototype.unpackJobs = function (nodes) {
        return Q.all(
            nodes.map(node => {
                if (!this.isMetaTypeOf(node, this.META.Job)) {
                    return node;
                }
                return this.core.loadChildren(node)
                    .then(children =>
                        children.find(c => this.isMetaTypeOf(c, this.META.Operation))
                    );
            })
        );
    };

    GenerateExecFile.prototype.sortOperations = function (operationDict, opIds) {
        var nextIds = [],
            sorted = opIds,
            dstIds,
            id;

        if (!opIds.length) {
            return [];
        }

        // Decrement all next ops
        dstIds = opIds.map(id => this._nextOps[id])
            .reduce((l1, l2) => l1.concat(l2), []);

        for (var i = dstIds.length; i--;) {
            id = dstIds[i];
            if (--this._incomingCnts[id] === 0) {
                nextIds.push(id);
            }
        }

        // append
        return sorted
            .map(id => operationDict[id])
            .filter(op => !!op)
            .concat(this.sortOperations(operationDict, nextIds));
    };

    GenerateExecFile.prototype.generateCodeSections = function(sortedOps) {
        // Create the code sections:
        //  - operation definitions
        //  - pipeline definition
        //  - main
        var code = {},
            baseIds = [],
            outputOps = [],
            mainOps = [];

        // Define the operation functions...
        code.operations = {};
        for (var i = 0; i < sortedOps.length; i++) {
            if (!this.isInputOp[sortedOps[i].id] && !baseIds.includes(sortedOps[i].baseId)) {
                if (!this.isOutputOp[sortedOps[i].id]) {
                    code.operations[sortedOps[i].basename] = this.defineOperationFn(sortedOps[i]);
                    baseIds.push(sortedOps[i].baseId);
                    mainOps.push(sortedOps[i]);
                } else {
                    outputOps.push(sortedOps[i]);
                }
            }
        }

        // Define the pipeline function
        code.pipelines = this.definePipelineFn(mainOps, outputOps);

        // Define the main body
        this.addCodeMain(code);

        // Add custom class definitions
        this.addCustomClasses(code);

        // Add custom layer definitions
        this.addCustomLayers(code);

        // TODO: Add the 'deepforge' section

        return code;
    };

    var indent = function(text) {
        return text.replace(/^/mg, INDENT);
    };

    GenerateExecFile.prototype.defineOperationFn = function(operation) {
        var lines = [],
            args = operation.inputNames || [];

        // Create the function definition
        args.unshift('attributes');
        // Add the refs to the end
        args = args.concat(operation.refNames);

        args = args.join(', ');

        lines.push(`local function ${operation.basename}(${args})`);
        lines.push(indent(operation.code));
        lines.push('end');

        return lines.join('\n');
    };

    GenerateExecFile.prototype.definePipelineFn = function(sortedOps, outputOps) {
        var inputArgs = Object.keys(this.isInputOp).map(id => this._nameFor[id]),
            name = this.core.getAttribute(this.activeNode, 'name'),
            safename = getUniqueName(name, this._opBaseNames),
            results = [],
            result = {},
            returnStat,
            fnbody;

        // Call each function in order, with the respective attributes, etc
        fnbody = sortedOps.map(op => this.getOpInvocation(op)).join('\n');

        // Create the return statement
        results.push('\n\nresults = {}');
        outputOps.map(op => this.getOutputPair(op))
            .forEach(pair => results.push(`results['${pair[0]}'] = ${pair[1]}`));
        results.push('return results');
        returnStat = results.join('\n');

        // Merge the fnbody, return statement and the function def
        result[safename] = `local function ${safename} (${inputArgs.join(', ')})\n` +
            `${indent(fnbody + returnStat)}\nend`;

        return result;
    };

    GenerateExecFile.prototype.getOutputPair = function(operation) {
        var input = operation.inputValues[0].slice(),
            value;

        // Get the src operation name and data value name
        input[0] += '_results';
        value = input.join('.');
        return [this._nameFor[operation.id], value];
    };

    GenerateExecFile.prototype.addCodeMain = function(sections) {
        var pipelineName = Object.keys(sections.pipelines)[0],
            code = '',
            args;

        args = Object.keys(this.isInputOp).map((val, index) => `arg[${index+1}]`);

        // Should I check for the number of arguments? This would be nice if I knew the names of the arguments...
        // I might be able to just use the input names...
        // TODO
        //if (args.length > 0) {
            //code += `if #arg == 0 then print('Too few arguments. Expected ${args.length}.') end\n`;
        //}

        code += `return ${pipelineName}(${args.join(', ')})`;
        sections.main = code;
    };

    GenerateExecFile.prototype.addCustomClasses = function(sections) {
        // TODO: Refactor this (merge it w/ the logic in ExecuteJob.Files.js
        var metaDict = this.core.getAllMetaNodes(this.rootNode),
            isClass,
            metanodes,
            classNodes,
            inheritanceLvl = {};

        this.logger.info('Creating custom layer file...');
        metanodes = Object.keys(metaDict).map(id => metaDict[id]);
        isClass = this.getTypeDictFor('Complex', metanodes);

        // Store the dependencies for each class
        sections.classDependencies = {};

        classNodes = metanodes.filter(node => {
            var base = this.core.getBase(node),
                baseId = this.core.getPath(base),
                deps = [],
                name,
                count = 1;

            // Count the sets back to a class node
            while (base) {
                deps.push(this.core.getAttribute(base, 'name'));
                if (isClass[baseId]) {
                    inheritanceLvl[this.core.getPath(node)] = count;
                    name = this.core.getAttribute(node, 'name');
                    sections.classDependencies[name] = deps;
                    return true;
                }
                base = this.core.getBase(base);
                baseId = this.core.getPath(base);
                count++;
            }

            return false;
        });

        // Get the code definitions for each
        sections.classes = {};
        classNodes
            .sort((a, b) => {
                var aId = this.core.getPath(a),
                    bId = this.core.getPath(b);

                return inheritanceLvl[aId] > inheritanceLvl[bId];
            })
            .forEach(node => {
                var name = this.core.getAttribute(node, 'name'),
                    code = this.core.getAttribute(node, 'code');

                sections.classes[name] = code;
            });
    };

    GenerateExecFile.prototype.addCustomLayers = function(sections) {
        // TODO: Refactor this (merge it w/ the logic in ExecuteJob.Files.js
        var metaDict = this.core.getAllMetaNodes(this.rootNode),
            isCustomLayer,
            metanodes,
            customLayers;

        this.logger.info('Creating custom layer file...');
        metanodes = Object.keys(metaDict).map(id => metaDict[id]);
        isCustomLayer = this.getTypeDictFor('CustomLayer', metanodes);

        customLayers = metanodes.filter(node =>
            this.core.getMixinPaths(node).some(id => isCustomLayer[id]));

        // Get the code definitions for each
        sections.layers = {};
        customLayers
            .map(layer => [
                this.core.getAttribute(layer, 'name'),
                this.core.getAttribute(layer, 'code')
            ])
            .forEach(pair => sections.layers[pair[0]] = pair[1]);
    };


    GenerateExecFile.prototype.getTypeDictFor = function (name, metanodes) {
        var isType = {};
        // Get all the custom layers
        for (var i = metanodes.length; i--;) {
            if (this.core.getAttribute(metanodes[i], 'name') === name) {
                isType[this.core.getPath(metanodes[i])] = true;
            }
        }
        return isType;
    };

    var toAttrString = function(attr) {
        if (/^\d\.?\d$/.test(attr) || /^(true|false|nil)$/.test(attr)) {
            return attr;
        }
        return `"${attr}"`;
    };

    GenerateExecFile.prototype.getOpInvocation = function(op) {
        // TODO: get the attributes
        var lines = [],
            attrs,
            args;

        attrs = '{' +
            Object.keys(op.attributes).map(key => `${key}=${toAttrString(op.attributes[key])}`)
            .join(',') +
        '}';

        lines.push(`local ${op.name}_attrs = ${attrs}`);
        args = (op.inputValues || [])
            .map(val => val instanceof Array ? `${val[0]}_results.${val[1]}` : val);

        args.unshift(op.name + '_attrs');
            
        // FIXME: Add the refs
        //args = args.concat(op.refs);
        args = args.join(', ');
        lines.push(`local ${op.name}_results = ${op.name}(${args})`);

        return lines.join('\n');
    };

    GenerateExecFile.prototype.getOutputName = function(node) {
        var basename = this.core.getAttribute(node, 'saveName');

        return getUniqueName(basename, this._outputNames, true);
    };

    GenerateExecFile.prototype.getVariableName = function (/*node*/) {
        var c = Object.keys(this.isInputOp).length;

        if (c !== 1) {
            return `input${c}`;
        }

        return 'input';
    };

    GenerateExecFile.prototype.registerNode = function (node) {
        if (this.isMetaTypeOf(node, this.META.Operation)) {
            return this.registerOperation(node);
        } else if (this.isMetaTypeOf(node, this.META.Transporter)) {
            return this.registerTransporter(node);
        }
    };

    var getUniqueName = function(namebase, takenDict, unsafeAllowed) {
        var name,
            i = 2,
            isUnsafe = function(name) {
                return !unsafeAllowed && RESERVED.test(name);
            };

        if (!unsafeAllowed) {
            namebase = namebase.replace(/[^A-Za-z\d]/g, '_');
        }
        name = namebase;
        // Get a unique operation name
        while (takenDict[name] || isUnsafe(name)) {
            name = namebase + '_' + i;
            i++;
        }
        takenDict[name] = true;

        return name;
    };

    GenerateExecFile.prototype.registerOperation = function (node) {
        var name = this.core.getAttribute(node, 'name'),
            id = this.core.getPath(node),
            base = this.core.getBase(node),
            baseId = this.core.getPath(base),
            baseName = this.core.getAttribute(base, 'name');

        // If it is an Input/Output operation, assign it a variable name
        if (baseName === CONSTANTS.OP.INPUT) {
            this.isInputOp[id] = node;
            name = this.getVariableName(node);
        } else if (baseName === CONSTANTS.OP.OUTPUT) {
            this.isOutputOp[id] = node;
            name = this.getOutputName(node);
        } else {
            // Define a function for the base class of the given node...
            // TODO

            // Determine an argument order for the given node
            // TODO

            // get a unique operation instance name
            name = getUniqueName(name, this._instanceNames);
        }

        this._nameFor[id] = name;

        // get a unique operation base name
        if (!this._fnNameFor[baseId]) {
            name = this.core.getAttribute(base, 'name');
            name = getUniqueName(name, this._opBaseNames);
            this._fnNameFor[baseId] = name;
        }

        // For operations, register all output data node names by path
        return this.core.loadChildren(node)
            .then(cntrs => {
                var cntr = cntrs.find(n => this.isMetaTypeOf(n, this.META.Outputs));
                return this.core.loadChildren(cntr);
            })
            .then(outputs => {
                outputs.forEach(output => {
                    var dataId = this.core.getPath(output);

                    name = this.core.getAttribute(output, 'name');
                    this._dataNameFor[dataId] = name;
                });
            });
    };

    GenerateExecFile.prototype.registerTransporter = function (node) {
        var outputData = this.core.getPointerPath(node, 'src'),
            inputData = this.core.getPointerPath(node, 'dst'),
            srcOpId = this.getOpIdFor(outputData),
            dstOpId = this.getOpIdFor(inputData);

        this._srcIdFor[inputData] = outputData;

        // Store the next operation ids for the op id
        if (!this._nextOps[srcOpId]) {
            this._nextOps[srcOpId] = [];
        }
        this._nextOps[srcOpId].push(dstOpId);

        // Increment the incoming counts for each dst op
        this._incomingCnts[dstOpId] = this._incomingCnts[dstOpId] || 0;
        this._incomingCnts[dstOpId]++;
    };

    GenerateExecFile.prototype.getOpIdFor = function (dataId) {
        var ids = dataId.split('/'),
            depth = ids.length;

        ids.splice(this.activeNodeDepth - depth);
        return ids.join('/');
    };

    // For each operation...
    //   - unpack the inputs from prev ops
    //   - add the attributes table (if used)
    //     - check for '\<attributes\>' in code
    //   - add the references
    //     - generate the code
    //     - replace the `return <thing>` w/ `<ref-name> = <thing>`
    GenerateExecFile.prototype.createOperation = function (node) {
        var id = this.core.getPath(node),
            baseId = this.core.getPath(this.core.getBase(node)),
            attrNames = this.core.getValidAttributeNames(node),
            operation = {};

        operation.name = this._nameFor[id];
        operation.basename = this._fnNameFor[baseId];
        operation.baseId = baseId;
        operation.id = id;
        operation.code = this.core.getAttribute(node, 'code');
        operation.attributes = {};
        for (var i = attrNames.length; i--;) {
            if (!SKIP_ATTRS[attrNames[i]]) {
                operation.attributes[attrNames[i]] = this.core.getAttribute(node, attrNames[i]);
            }
        }

        // Update the 'code' attribute
        // Change the last return statement to assign the results to a table
        //operation.code = this.assignResultToVar(operation.code,
            //`${operation.name}_results`);

        // Get all the input names (and sources)
        return this.core.loadChildren(node)
            .then(containers => {
                var inputs;

                inputs = containers
                    .find(cntr => this.isMetaTypeOf(cntr, this.META.Inputs));

                this.logger.info(`${operation.name} has ${containers.length} cntrs`);
                return this.core.loadChildren(inputs);
            })
            .then(data => {
                // Get the input names and sources
                var inputNames = data.map(d => this.core.getAttribute(d, 'name')),
                    ids = data.map(d => this.core.getPath(d)),
                    srcIds = ids.map(id => this._srcIdFor[id]);

                operation.inputNames = inputNames || [];
                operation.inputValues = inputNames.map((name, i) => {
                    var id = srcIds[i],
                        srcDataName = this._dataNameFor[id],
                        srcOpId = this.getOpIdFor(id),
                        srcOpName = this._nameFor[srcOpId];

                    if (this.isInputOp[srcOpId]) {
                        return this._nameFor[srcOpId];
                    } else {
                        return [srcOpName, srcDataName];
                    }
                });

                return operation;

            })
            .then(operation => {

                // For each reference, run the plugin and retrieve the generated code
                operation.refNames = [];

                if (!this.isInputOp[operation.id]) {
                    operation.refNames = this.core.getPointerNames(node)
                        .filter(name => name !== 'base');
                }

                var refs = operation.refNames
                    .map(ref => [ref, this.core.getPointerPath(node, ref)]);

                return Q.all(
                    refs.map(pair => this.genPtrSnippet.apply(this, pair))
                );
            })
            .then(codeFiles => {
                operation.refs = codeFiles;
                return operation;
            });
    };

    GenerateExecFile.prototype.genPtrSnippet = function (ptrName, pId) {
        return this.getPtrCodeHash(pId)
            .then(hash => this.blobClient.getObjectAsString(hash))
            .then(code => this.createHeader(`creating ${ptrName}`, 40) + '\n' +
                this.assignResultToVar(code, ptrName));
    };

    GenerateExecFile.prototype.createHeader = function (title, length) {
        var len;
        title = ` ${title} `;
        length = length || HEADER_LENGTH;

        len = Math.max(
            Math.floor((length - title.length)/2),
            2
        );

        return [
            '',
            title,
            ''
        ].join(new Array(len+1).join('-')) + '\n';

    };

    GenerateExecFile.prototype.genOperationCode = function (operation) {
        var header = this.createHeader(`"${operation.name}" Operation`),
            codeParts = [],
            body = [];

        codeParts.push(header);
        codeParts.push(`local ${operation.name}_results`);
        codeParts.push('do');

        if (operation.inputs.length) {
            body.push(operation.inputs.join('\n'));
        }

        if (operation.refs.length) {
            body.push(operation.refs.join('\n'));
        }

        body.push(operation.code);

        codeParts.push(indent(body.join('\n')));
        codeParts.push('end');
        codeParts.push('');

        operation.code = codeParts.join('\n');
        return operation;
    };

    GenerateExecFile.prototype.assignResultToVar = function (code, name) {
        var i = code.lastIndexOf('return');

        return code.substring(0, i) +
            code.substring(i)
                .replace('return', `${name} = `);
    };

    _.extend(GenerateExecFile.prototype, PtrCodeGen.prototype);

    var OperationFn = function(/*operation*/) {
        // This is a class creates the fn for the given operation
        // This includes argument order and the body of the function
        // TODO
    };

    OperationFn.prototype.toString = function() {
    };

    return GenerateExecFile;
});
