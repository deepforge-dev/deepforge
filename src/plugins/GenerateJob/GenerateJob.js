/*globals define, requirejs*/
/*jshint node:true, browser:true*/

define([
    './templates/index',
    'q',
    'underscore',
    'deepforge/Constants',
    'deepforge/plugin/Operation',
    'deepforge/OperationCode',
    'deepforge/plugin/PtrCodeGen',
    'deepforge/plugin/GeneratedFiles',
    'deepforge/storage/index',
    'text!./metadata.json',
    'plugin/PluginBase',
    'module'
], function (
    Templates,
    Q,
    _,
    CONSTANTS,
    OperationHelpers,
    OperationCode,
    PtrCodeGen,
    GeneratedFiles,
    Storage,
    pluginMetadata,
    PluginBase,
    module
) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);
    const DATA_DIR = 'artifacts/';
    const DEFAULT_SETTINGS = {enableJobCaching: false};
    var OUTPUT_INTERVAL = 1500,
        STDOUT_FILE = 'job_stdout.txt';

    /**
     * Initializes a new instance of GenerateJob.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin GenerateJob.
     * @constructor
     */
    var GenerateJob = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;

        this.settings = _.extend({}, DEFAULT_SETTINGS);
        if (require.isBrowser) {
            const ComponentSettings = requirejs('js/Utils/ComponentSettings');
            ComponentSettings.resolveWithWebGMEGlobal(
                this.settings,
                this.getComponentId()
            );
        } else {  // Running in NodeJS
            const path = require('path');
            const dirname = path.dirname(module.uri);
            const deploymentSettings = JSON.parse(requirejs('text!' + dirname + '/../../../config/components.json'));
            _.extend(this.settings, deploymentSettings[this.getComponentId()]);
        }
    };

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructue etc.
     * This is also available at the instance at this.pluginMetadata.
     * @type {object}
     */
    GenerateJob.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    GenerateJob.prototype = Object.create(PluginBase.prototype);
    GenerateJob.prototype.constructor = GenerateJob;

    GenerateJob.prototype.getComponentId = function () {
        return 'GenerateJob';
    };

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    GenerateJob.prototype.main = async function (callback) {
        const name = this.getAttribute(this.activeNode, 'name');
        const opId = this.core.getPath(this.activeNode);

        const files = await this.createExecutableOperationFiles(this.activeNode);
        this.logger.info('Created operation files!');
        const artifactName = `${name}_${opId.replace(/\//g, '_')}-execution-files`;

        // Remove user assets as they are downloaded by the worker
        files.getUserAssetPaths().forEach(path => files.remove(path));
        const hash = await files.save(artifactName);
        this.result.setSuccess(true);
        this.result.addArtifact(hash);
        callback(null, this.result);
    }; 

    GenerateJob.prototype.createRunScript = async function (files) {
        let runsh = [
            '# Bash script to download data files and run job',
            !this.settings.enableJobCaching ? `# Created at ${Date.now()}` : '',
            'if [ -z "$DEEPFORGE_URL" ]; then',
            '  echo "Please set DEEPFORGE_URL and re-run:"',
            '  echo ""',
            '  echo "  DEEPFORGE_URL=http://my.deepforge.server.com:8080 bash run.sh"',
            '  echo ""',
            '  exit 1',
            'fi',
            'mkdir outputs',
            `mkdir -p ${DATA_DIR}\n`
        ].join('\n');

        const assetPaths = files.getUserAssetPaths();
        const configs = this.getAllStorageConfigs();
        for (let i = assetPaths.length; i--;) {
            const dataPath = assetPaths[i];
            const dataInfo = files.getUserAsset(dataPath);
            const url = await Storage.getDownloadURL(dataInfo, this.logger, configs);
            runsh += `wget $DEEPFORGE_URL${url} -O ${dataPath}\n`;
        }

        runsh += 'python main.py';
        files.addFile('run.sh', runsh);
        return runsh;
    };

    GenerateJob.prototype.createDataMetadataFile = async function (files) {
        const inputData = _.object(files.getUserAssets());
        const content = JSON.stringify(inputData, null, 2);
        files.addFile('input-data.json', content);
        return content;
    };

    GenerateJob.prototype.createExecConfig = function (node, outputNodes, files) {
        const fileList = files.getFilePaths();
        const outputs = outputNodes.map(pair => pair[0])
            .map(name => {
                return {
                    name: name,
                    resultPatterns: [`outputs/${name}`]
                };
            });

        outputs.push(
            {
                name: 'stdout',
                resultPatterns: [STDOUT_FILE]
            },
            {
                name: 'results',
                resultPatterns: ['results.json']
            },
            {
                name: 'debug-files',
                resultPatterns: fileList
            }
        );

        const config = JSON.stringify({
            cmd: 'node',
            args: ['start.js'],
            outputInterval: OUTPUT_INTERVAL,
            resultArtifacts: outputs
        }, null, 2);

        files.addFile('executor_config.json', config);
        return config;
    };

    GenerateJob.prototype.createExecutableOperationFiles = async function (node) {
        const files = await this.createOperationFiles(node);
        const metaDict = this.core.getAllMetaNodes(node);
        const metanodes = Object.keys(metaDict).map(id => metaDict[id]);
        const operations = metanodes
            .filter(node => this.core.isTypeOf(node, this.META.Operation))
            .filter(node => this.core.getAttribute(node, 'code'))  // remove local ops
            .map(node => {
                const name = this.core.getAttribute(node, 'name');
                const filename = GenerateJob.toSnakeCase(name);
                const code = this.core.getAttribute(node, 'code');

                return [filename, name, code];
            });

        operations.forEach(tuple => {
            const [filename, name, code] = tuple;

            // Add file to `operations/`
            files.addFile(`operations/${filename}.py`, code);

            files.appendToFile(
                'operations/__init__.py',
                `from operations.${filename} import ${name}\n`
            );
        });

        await this.createRunScript(files);
        await this.createDataMetadataFile(files);
        const outputs = await this.getOutputs(this.activeNode);
        await this.createExecConfig(node, outputs, files);

        return files;
    };

    GenerateJob.prototype.isUtilsNode = function (node) {
        return this.core.getAttribute(node, 'name').includes('Utilities');
    };

    GenerateJob.prototype.createCustomUtils = async function (files) {
        // Load all custom utilities defined by the user
        const children = await this.core.loadChildren(this.rootNode);
        const utilsNode = children.find(child => this.isUtilsNode(child));
        const modules = utilsNode ? await this.core.loadChildren(utilsNode) : [];

        modules.forEach(node => {
            const name = this.core.getAttribute(node, 'name');
            const code = this.core.getAttribute(node, 'code');
            files.addFile(`utils/${name}`, code);
        });

        return files;
    };

    GenerateJob.prototype.createOperationFiles = async function (node, files) {
        // For each operation, generate the output files:
        //   artifacts/<arg-name>  (respective serialized input data)
        //   outputs/ (make dir for the outputs)
        //
        //   main.py (main file -> calls main and serializes outputs)

        // add the given files
        files = files || new GeneratedFiles(this.blobClient);
        this.logger.info('About to generate operation execution files');
        await this.createEntryFile(node, files);
        await this.createCustomUtils(files);
        await this.createInputs(node, files);
        await this.createMainFile(node, files);
        return files;
    };

    GenerateJob.prototype.createEntryFile = function (node, files) {
        this.logger.info('Creating deepforge.py file...');
        const serializeTpl = _.template(Templates.DEEPFORGE_SERIALIZATION);
        files.addFile('deepforge/serialization.py', serializeTpl(CONSTANTS));
        files.addFile('deepforge/__init__.py', Templates.DEEPFORGE_INIT);
        //const outputs = await this.getOutputs(node);
        //const name = this.getAttribute(node, 'name');
        //const content = {};

        // inputs and outputs
        //content.name = name;
        //content.outputs = outputs.map(output => output[0]);
    };

    GenerateJob.prototype.getConnectionContainer = function () {
        var container = this.core.getParent(this.activeNode);

        if (this.isMetaTypeOf(container, this.META.Job)) {
            container = this.core.getParent(container);
        }

        return container;
    };

    GenerateJob.prototype.getInputPortsFor = function (nodeId) {
        var container = this.getConnectionContainer();

        // Get the connections to this node
        return this.core.loadChildren(container)
            .then(children => {
                return children.filter(child =>
                    this.core.getPointerPath(child, 'dst') === nodeId)
                    .map(conn => this.core.getPointerPath(conn, 'src'))[0];
            });
    };

    GenerateJob.prototype.getStorageConfig = function () {
        const storage = this.getCurrentConfig().storage || {};
        storage.id = storage.id || 'gme';
        storage.config = storage.config || {};
        return storage;
    };

    GenerateJob.prototype.getAllStorageConfigs = function () {
        const storage = this.getStorageConfig();
        const configs = {};
        configs[storage.id] = storage.config;
        return configs;
    };

    GenerateJob.prototype.createInputs = async function (node, files) {
        this.logger.info('Retrieving inputs and deserialize fns...');
        const allInputs = await this.getInputs(node);
        // For each input, match the connection with the input name
        //   [ name, type ] => [ name, type, node ]
        //
        // For each input,
        //  - store the data in /inputs/<name>
        const inputs = allInputs
            .filter(pair => !!this.getAttribute(pair[2], 'data'));  // remove empty inputs

        const storage = this.getStorageConfig();
        const jobId = this.core.getPath(this.activeNode).replace(/\//g, '_');
        const storageDir = `${this.projectId}/executions/${jobId}/`;

        const configs = {
            storage: {
                id: storage.id,
                dir: storageDir,
            },
            storageConfigs: this.getAllStorageConfigs(),
            HOST: process.env.DEEPFORGE_HOST || '',
        };
        files.addFile('config.json', JSON.stringify(configs));
        files.addFile('start.js', Templates.START);
        files.addFile('utils.build.js', Templates.UTILS);
        files.addFile('backend_deepforge.py', Templates.MATPLOTLIB_BACKEND);

        inputs.forEach(pair => {
            const dataInfo = this.getAttribute(pair[2], 'data');
            const datapath = DATA_DIR + pair[0];
            files.addUserAsset(datapath, dataInfo);
        });

        return files;
    };

    GenerateJob.prototype.createMainFile = async function (node, files) {
        this.logger.info('Creating main file...');
        const inputs = await this.getInputs(node);
        const name = this.getAttribute(node, 'name');
        const code = this.getAttribute(node, 'code');

        // Add remaining code
        const outputs = await this.getOutputs(node);
        const initCode = await this.getAllInitialCode();
        const references = await this.getReferencedContent(node);

        const content = {};
        content.name = name;
        content.initCode = initCode;
        content.code = code;
        content.inputs = inputs
            .map(pair => [  // [name, type, isNone?]
                pair[0],
                this.getAttribute(pair[2], 'type'),
                !this.getAttribute(pair[2], 'data')
            ]);  // remove empty inputs
        content.outputs = outputs.map(output => output[0]);
        content.arguments = this.getOperationArguments(node)
            .map(arg => arg.value).join(', ');
        content.references = references;

        files.addFile('main.py', _.template(Templates.MAIN)(content));

        const filename = GenerateJob.toSnakeCase(content.name);
        files.addFile(`operations/${filename}.py`, content.code);
        files.appendToFile(
            'operations/__init__.py',
            `from operations.${filename} import ${content.name}\n`
        );
    };

    GenerateJob.validateVariableName = function (word) {
        return word.replace(/[^a-zA-Z\d]+/g, '_');
    };

    GenerateJob.toSnakeCase = function (word) {
        word = GenerateJob.validateVariableName(word);
        word = word[0].toLowerCase() + word.slice(1);
        return word
            .replace(/[A-Z]/g, match => `_${match.toLowerCase()}`)
            .replace(/_+/g, '_');
    };

    GenerateJob.toUpperCamelCase = function (word) {
        word = GenerateJob.validateVariableName(word);
        word = word[0].toUpperCase() + word.slice(1);
        return word
            .replace(/_+./g, match => match[1].toUpperCase());
    };

    GenerateJob.prototype.getAllInitialCode = function () {
        return this.core.loadChildren(this.rootNode)
            .then(children => {
                const codeNodes = children.filter(child => this.isMetaTypeOf(child, this.META.Code));
                codeNodes.sort((n1, n2) => {  // move library code to be in the front
                    const v1 = this.isMetaTypeOf(n1, this.META.LibraryCode) ? 1 : 0;
                    const v2 = this.isMetaTypeOf(n2, this.META.LibraryCode) ? 1 : 0;
                    return v2 - v1;
                });

                return codeNodes.map(node => this.core.getAttribute(node, 'code')).join('\n');
            });
    };

    GenerateJob.getAttributeString = function(value) {
        const numOrBool = /^(-?\d+\.?\d*((e|e-)\d+)?|(true|false))$/;
        const isBool = /^(true|false)$/;

        if (!numOrBool.test(value)) {
            value = `"${value}"`;
        }
        if (isBool.test(value)) {  // Convert to python bool
            value = value.toString();
            value = value[0].toUpperCase() + value.slice(1);
        }
        return value;
    };

    GenerateJob.prototype.getOperationArguments = function (node) {
        const code = this.getAttribute(node, 'code');
        const operation = new OperationCode(code);
        const pointers = this.core.getPointerNames(node).filter(name => name !== 'base');

        // Enter the attributes in place
        const argumentValues = operation.getAttributes().map(attr => {
            const name = attr.name;
            const isPointer = pointers.includes(name);
            const arg = {
                name: name,
                isPointer: isPointer,
            };

            // Check if it is a reference... (if so, just return the pointer name)
            if (isPointer) {
                arg.rawValue = this.core.getPointerPath(node, name);
                arg.value = arg.rawValue ? name : 'None';
            } else {  // get the attribute and it's value
                arg.rawValue = this.getAttribute(node, name);
                arg.value = GenerateJob.getAttributeString(arg.rawValue);
            }
            return arg;
        });

        return argumentValues;
    };

    GenerateJob.prototype.getReferencedContent = function (node) {
        this.logger.info('Creating referenced library content...');
        // Convert pointer names to use _ instead of ' '
        const pointers = this.core.getPointerNames(node)
            .filter(name => name !== 'base')
            .filter(id => this.core.getPointerPath(node, id) !== null);

        const targetIds = pointers.map(p => this.core.getPointerPath(node, p));
        const name = this.getAttribute(node, 'name');
        return Q.all(targetIds.map(nId => this.getPtrCode(nId)))
            .then(resultContents => {
                this.logger.info(`Pointer generation for ${name} FINISHED!`);

                const references = resultContents.map((code, index) => {
                    const pointer = pointers[index];
                    return [pointer, code];
                });

                return references;
            })
            .fail(e => {
                this.logger.error(`Could not generate resource files for ${this.getAttribute(node, 'name')}: ${e.toString()}`);
                throw e;
            });
    };

    GenerateJob.prototype.getAttribute = function (node, attr) {
        return this.core.getAttribute(node, attr);
    };

    GenerateJob.prototype.setAttribute = function (node, attr, value) {
        return this.core.setAttribute(node, attr, value);
    };

    _.extend(
        GenerateJob.prototype,
        OperationHelpers.prototype,
        PtrCodeGen.prototype
    );

    return GenerateJob;
});
