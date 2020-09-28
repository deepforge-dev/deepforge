/*globals define */

define([
    'panels/InteractiveExplorer/InteractiveExplorerControl',
    'deepforge/globals',
    'deepforge/CodeGenerator',
    'deepforge/OperationCode',
    './JSONImporter',
    'js/Constants',
    'q',
    'underscore',
], function (
    InteractiveExplorerControl,
    DeepForge,
    CodeGenerator,
    OperationCode,
    Importer,
    CONSTANTS,
    Q,
    _,
) {

    'use strict';

    class TrainKerasControl extends InteractiveExplorerControl {

        initializeWidgetHandlers (widget) {
            super.initializeWidgetHandlers(widget);
            const self = this;
            widget.getArchitectureCode = id => this.getArchitectureCode(id);
            widget.saveModel = function() {return self.saveModel(...arguments);};
            widget.getNodeSnapshot = id => this.getNodeSnapshot(id);
        }

        async getNodeSnapshot(id) {
            const {core, rootNode} = await Q.ninvoke(this.client, 'getCoreInstance', this._logger);
            const importer = new Importer(core, rootNode);
            const node = await core.loadByPath(rootNode, id);
            const state = await importer.toJSON(node);
            makeIDsForContainedNodes(state, id);
            return state;
        }

        async saveModel(modelInfo, storage, session) {
            const metadata = (await session.forkAndRun(
                session => session.exec(`cat outputs/${modelInfo.path}/metadata.json`)
            )).stdout;
            const {type} = JSON.parse(metadata);
            const projectId = this.client.getProjectInfo()._id;
            const savePath = `${projectId}/artifacts/${modelInfo.name}`;
            const dataInfo = await session.forkAndRun(
                session => session.saveArtifact(
                    modelInfo.path,
                    savePath,
                    storage.id,
                    storage.config
                )
            );

            const {core, rootNode} = await Q.ninvoke(this.client, 'getCoreInstance', this._logger);

            const parent = await core.loadByPath(rootNode, this._currentNodeId);
            const artifact = this.createModelArtifact(
                core,
                rootNode,
                modelInfo,
                dataInfo,
                type,
                parent
            );
            const trainState = this.createImplicitOperation(
                core,
                rootNode,
                modelInfo,
                artifact
            );
            core.setPointer(artifact, 'provenance', trainState);

            const operation = await this.createOperation(
                core,
                rootNode,
                modelInfo,
                trainState
            );
            core.setPointer(trainState, 'operation', operation);

            const importer = new Importer(core, rootNode);
            const {architecture} = modelInfo;
            const archNode = await importer.import(operation, architecture);
            core.setPointer(operation, 'model', archNode);

            // TODO: save the plot in the artifact?
            const {rootHash, objects} = core.persist(rootNode);
            const branch = this.client.getActiveBranchName();
            const startCommit = this.client.getActiveCommitHash();
            const project = this.client.getProjectObject();
            const commitMsg = `Saved trained neural network: ${modelInfo.name}`;
            await project.makeCommit(
                branch,
                [startCommit],
                rootHash,
                objects,
                commitMsg
            );
        }

        createModelArtifact(core, root, modelInfo, dataInfo, type, parent) {
            const metaNodes = Object.values(core.getAllMetaNodes(root));
            const base = metaNodes
                .find(node => core.getAttribute(node, 'name') === 'Data');

            const node = core.createNode({base, parent});
            core.setAttribute(node, 'name', modelInfo.name);
            core.setAttribute(node, 'type', type);
            core.setAttribute(node, 'data', JSON.stringify(dataInfo));
            core.setAttribute(node, 'createdAt', Date.now());
            return node;
        }

        createImplicitOperation(core, root, modelInfo, parent) {
            const metaNodes = Object.values(core.getAllMetaNodes(root));
            const base = metaNodes
                .find(node => core.getAttribute(node, 'name') === 'TrainKeras');
            const node = core.createNode({base, parent});

            core.setAttribute(node, 'name', `Train ${modelInfo.name}`);
            core.setAttribute(node, 'config', JSON.stringify(modelInfo.config));
            core.setAttribute(node, 'plotData', JSON.stringify(modelInfo.plotData));
            return node;
        }

        async createOperation(core, root, modelInfo, parent) {
            const META = _.object(
                Object.values(core.getAllMetaNodes(root))
                    .map(node => {
                        let prefix = core.getNamespace(node) || '';
                        if (prefix) {
                            prefix += '.';
                        }
                        return [prefix + core.getAttribute(node, 'name'), node];
                    })
            );
            const base = META['pipeline.Operation'];
            const node = core.createNode({base, parent});
            core.setAttribute(node, 'name', 'Train');

            const operation = OperationCode.findOperation(modelInfo.code);

            const references = {model: 'keras.Architecture'};
            operation.getAttributes().forEach(attr => {
                const {name} = attr;
                const isReference = references[name];
                if (isReference) {
                    const refTypeName = references[name];
                    const refType = META[refTypeName];
                    core.setPointerMetaLimits(node, name, 1, 1);
                    core.setPointerMetaTarget(node, name, refType, -1, 1);
                } else {
                    core.setAttribute(node, name, attr.value);
                    let type = 'string';
                    if (typeof attr.value === 'number') {
                        if (attr.value.toString().includes('.')) {
                            type = 'float';
                        } else {
                            type = 'integer';
                        }
                    } else if (typeof attr.value === 'boolean') {
                        type = 'boolean';
                    }
                    core.setAttributeMeta(node, name, {type});
                }
            });

            const [[inputs], [outputs]] = _.partition(
                await core.loadChildren(node),
                node => core.getAttribute(node, 'name') === 'Inputs'
            );

            const data = await core.loadByPath(root, modelInfo.config.dataset.id);
            core.copyNode(data, inputs);

            operation.getOutputs().forEach(output => {
                const outputNode = core.createNode({
                    base: META['pipeline.Data'],
                    parent: outputs
                });
                core.setAttribute(outputNode, 'name', output.name);
            });

            return node;
        }

        getObjectDescriptor(nodeId) {
            const desc = super.getObjectDescriptor(nodeId);

            if (desc) {
                const node = this.client.getNode(nodeId);
                desc.data = node.getAttribute('data');
                desc.type = node.getAttribute('type');
            }

            return desc;
        }

        getTerritory(nodeId) {
            const territory = {};
            const node = this.client.getNode(nodeId);
            const parentId = node.getParentId();
            territory[parentId] = {children: 1};

            const omitParentNode = event => event.eid !== parentId;
            this.territoryEventFilters = [omitParentNode];

            return territory;
        }

        async selectedObjectChanged (nodeId) {
            super.selectedObjectChanged(nodeId);
            this.removeAuxTerritories();
            const isNewNodeLoaded = typeof nodeId === 'string';
            if (isNewNodeLoaded) {
                await this.addArchitectureTerritory();
                await this.addDatasetTerritory();
            }
        }

        removeAuxTerritories() {
            if (this._archTerritory) {
                this.client.removeUI(this._archTerritory);
            }
            if (this._artifactTerritory) {
                this.client.removeUI(this._archTerritory);
            }
        }

        async addArchitectureTerritory() {
            const containerId = await DeepForge.places.MyResources();
            const territory = {};
            territory[containerId] = {children: 1};
            this._archTerritory = this.client.addUI(
                territory,
                events => this.onResourceEvents(events)
            );
            this.client.updateTerritory(this._archTerritory, territory);
        }

        async addDatasetTerritory() {
            const containerId = await DeepForge.places.MyArtifacts();
            const territory = {};
            territory[containerId] = {children: 1};
            this._artifactTerritory = this.client.addUI(
                territory,
                events => this.onArtifactEvents(events)
            );
            this.client.updateTerritory(this._artifactTerritory, territory);
        }

        async getArchitectureCode(nodeId) {
            const codeGen = await CodeGenerator.fromClient(this.client, this._logger);
            return await codeGen.getCode(nodeId);
        }

        async onResourceEvents(events) {
            events
                .filter(event => this.isKerasEvent(event))
                .forEach(event => {
                    switch (event.etype) {

                    case CONSTANTS.TERRITORY_EVENT_LOAD:
                        this.onResourceLoad(event.eid);
                        break;
                    case CONSTANTS.TERRITORY_EVENT_UPDATE:
                        this.onResourceUpdate(event.eid);
                        break;
                    case CONSTANTS.TERRITORY_EVENT_UNLOAD:
                        this.onResourceUnload(event.eid);
                        break;
                    default:
                        break;
                    }
                });
        }

        isKerasEvent(event) {
            const nodeId = event.eid;
            const node = this.client.getNode(nodeId);
            if (node) {
                const kerasRootId = node.getLibraryRootId('keras');
                const metaId = node.getMetaTypeId();
                return this.isContainedIn(metaId, kerasRootId);
            }
            return true;
        }

        isContainedIn(possibleChildId, parentId) {
            return possibleChildId.startsWith(parentId);
        }

        onResourceLoad(nodeId) {
            const desc = this.getArchitectureDesc(nodeId);
            this._widget.addArchitecture(desc);
        }

        getArchitectureDesc(nodeId) {
            const node = this.client.getNode(nodeId);
            // TODO: include the input/output of the network?
            return {
                id: nodeId,
                name: node.getAttribute('name'),
            };
        }

        onResourceUpdate(nodeId) {
            const desc = this.getArchitectureDesc(nodeId);
            this._widget.updateArchitecture(desc);
        }

        onResourceUnload(nodeId) {
            this._widget.removeArchitecture(nodeId);
        }

        async onArtifactEvents(events) {
            events
                .filter(event => this.isArtifact(event.eid))
                .forEach(event => {
                    switch (event.etype) {

                    case CONSTANTS.TERRITORY_EVENT_LOAD:
                        this.onArtifactLoad(event.eid);
                        break;
                    case CONSTANTS.TERRITORY_EVENT_UPDATE:
                        this.onArtifactUpdate(event.eid);
                        break;
                    case CONSTANTS.TERRITORY_EVENT_UNLOAD:
                        this.onArtifactUnload(event.eid);
                        break;
                    default:
                        break;
                    }
                });
        }

        isArtifact(nodeId) {
            const node = this.client.getNode(nodeId);
            if (node) {
                return node.getAttribute('data');
            }
            return true;
        }

        getArtifactDesc(nodeId) {
            const node = this.client.getNode(nodeId);
            const name = node.getAttribute('name').replace(/\..*$/, '');
            return {
                id: nodeId,
                name,
                type: node.getAttribute('type'),
                dataInfo: JSON.parse(node.getAttribute('data')),
            };
        }

        onArtifactLoad(nodeId) {
            const desc = this.getArtifactDesc(nodeId);
            this._widget.addArtifact(desc);
        }

        onArtifactUpdate(nodeId) {
            const desc = this.getArtifactDesc(nodeId);
            this._widget.updateArtifact(desc);
        }

        onArtifactUnload(nodeId) {
            this._widget.removeArtifact(nodeId);
        }
    }

    function makeIDsForContainedNodes(state, id) {
        state.id = `@id:${state.path}`;
        const updateID = nodeId => nodeId.startsWith(id) ? `@id:${nodeId}` : nodeId;
        const updateNodeIDKeys = oldSet => {
            const set = _.object(Object.entries(oldSet).map(entry => {
                const [nodeId, value] = entry;
                return [updateID(nodeId), value];
            }));

            return set;
        };

        state.pointers = _.mapObject(state.pointers, target => updateID(target));
        state.member_attributes = _.mapObject(state.member_attributes, updateNodeIDKeys);
        state.member_registry = _.mapObject(state.member_registry, updateNodeIDKeys);
        state.sets = _.mapObject(state.sets, members => members.map(updateID));

        state.children.forEach(child => makeIDsForContainedNodes(child, id));
        return state;
    }

    return TrainKerasControl;
});
