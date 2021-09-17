/*globals WebGMEGlobal, $, define, $klay*/
/*jshint browser: true*/

define([
    'js/DragDrop/DropTarget',
    'deepforge/Constants',
    'widgets/EasyDAG/AddNodeDialog',
    'deepforge/viz/widgets/Thumbnail',
    'deepforge/viz/PipelineControl',
    'deepforge/viz/Utils',
    'deepforge/globals',
    './OperationNode',
    './Connection',
    './SelectionManager',
    'underscore',
    './klay',
    'css!./styles/PipelineEditorWidget.css'
], function (
    DropTarget,
    CONSTANTS,
    AddNodeDialog,
    ThumbnailWidget,
    PipelineControl,
    Utils,
    DeepForge,
    OperationNode,
    Connection,
    SelectionManager,
    _
) {
    'use strict';

    var REMOVE_ICON = '<td><div class="input-group"><i class="glyphicon ' +
            'glyphicon-remove"></i></div></td>',
        PipelineEditorWidget,
        WIDGET_CLASS = 'pipeline-editor',
        STATE = {
            DEFAULT: 'default',
            CONNECTING: 'connecting'
        };

    PipelineEditorWidget = function (logger, container, execCntr) {
        container.addClass(WIDGET_CLASS);
        ThumbnailWidget.call(this, logger, container);
        this._emptyMsg = 'Click to add an operation';
        this.portIdToNode = {};
        this.PORT_STATE = STATE.DEFAULT;
        this.srcPortToConnectArgs = null;
        this._connForPort = {};
        this._itemsShowingPorts = [];
        container.addClass(`${WIDGET_CLASS} container`);
        this._initializeEventHandlers(container);

        this.updateExecutions = _.debounce(this._updateExecutions, 50);
        this.initExecs(execCntr);
    };

    _.extend(PipelineEditorWidget.prototype, ThumbnailWidget.prototype);

    PipelineEditorWidget.prototype.ItemClass = OperationNode;
    PipelineEditorWidget.prototype.SelectionManager = SelectionManager;
    PipelineEditorWidget.prototype.Connection = Connection;

    PipelineEditorWidget.prototype.onCreateInitialNode =
        PipelineControl.prototype.onCreateInitialNode;

    PipelineEditorWidget.prototype._initializeEventHandlers = function (container) {
        
        DropTarget.makeDroppable(container, {
            drop: (event, dragInfo) => {
                this.onBackgroundDrop(event, dragInfo);
            }
        });
    };

    PipelineEditorWidget.prototype.getComponentId = function() {
        return 'PipelineEditor';
    };

    PipelineEditorWidget.prototype.onCreateInitialNode = function() {
        var initialNodes = this.getValidInitialNodes().map(node => {
            var colorAttr = node.attributes[CONSTANTS.OPERATION.DISPLAY_COLOR];
            node.decoratorOpts = {color: colorAttr && colorAttr.value};
            return {node};
        });

        AddNodeDialog.prompt(initialNodes)
            .then(selected => this.createNode(selected.node.id));
    };

    PipelineEditorWidget.prototype.setupItemCallbacks = function() {
        ThumbnailWidget.prototype.setupItemCallbacks.call(this);
        this.ItemClass.prototype.connectPort =
            PipelineEditorWidget.prototype.connectPort.bind(this);
        this.ItemClass.prototype.disconnectPort =
            PipelineEditorWidget.prototype.disconnectPort.bind(this);

        this.ItemClass.prototype.canShowPorts = () => {
            // when the widget is connecting ports, the items
            // will ignore hover event behaviors wrt showing
            // ports
            return !this.isConnectingPorts();
        };
    };

    //////////////////// Port Support ////////////////////
    PipelineEditorWidget.prototype.addConnection = function(desc) {
        ThumbnailWidget.prototype.addConnection.call(this, desc);
        // Record the connection with the input (dst) port
        var dstItem = this.items[desc.dst],
            dstPort;

        this._connForPort[desc.dstPort] = desc.id;
        if (dstItem) {
            dstPort = dstItem.inputs.find(port => port.id === desc.dstPort);

            if (!dstPort) {
                this.logger.error(`Could not find port ${desc.dstPort}`);
                return;
            }

            dstPort.connection = desc.id;
            // Update the given port...
            dstItem.refreshPorts();
        }
    };

    PipelineEditorWidget.prototype.addNode = function(desc) {
        ThumbnailWidget.prototype.addNode.call(this, desc);
        // Update the input port connections (if not connection)
        var item = this.items[desc.id];
        if (item) {
            item.inputs.forEach(port => 
                port.connection = this._connForPort[port.id]
            );
            // Update the item's ports
            item.refreshPorts();
        }

        // If in a "connecting-port" state, refresh the port
        if (this.isConnectingPorts()) {
            this.PORT_STATE = STATE.DEFAULT;
            this.connectPort.apply(this, this.srcPortToConnectArgs);
        }
    };

    PipelineEditorWidget.prototype._removeConnection = function(id) {
        // Update the input node (dstPort)
        var conn = this.connections[id].desc,
            dst = this.items[conn.dst],
            port;

        if (dst) {
            port = dst.inputs.find(port => port.id === conn.dstPort);
            port.connection = null;
            dst.refreshPorts();
        }
        ThumbnailWidget.prototype._removeConnection.call(this, id);
    };

    // May not actually need these port methods
    PipelineEditorWidget.prototype.addPort = function(desc) {
        this.items[desc.nodeId].addPort(desc);
        this.portIdToNode[desc.id] = desc.nodeId;
        this.refreshUI();
    };

    PipelineEditorWidget.prototype.updatePort = function(desc) {
        this.items[desc.nodeId].updatePort(desc);
        this.refreshUI();
    };

    PipelineEditorWidget.prototype.removeNode = function(gmeId) {
        if (this.portIdToNode.hasOwnProperty(gmeId)) {
            this.removePort(gmeId);
        } else {
            ThumbnailWidget.prototype.removeNode.call(this, gmeId);
        }
    };

    PipelineEditorWidget.prototype.removePort = function(portId) {
        var nodeId = this.portIdToNode[portId];
        if (this.items[nodeId]) {
            this.items[nodeId].removePort(portId);
            this.refreshUI();
        }
    };

    PipelineEditorWidget.prototype.disconnectPort = function(portId, connId) {
        this.removeConnection(connId);
    };

    PipelineEditorWidget.prototype.isConnectingPorts = function() {
        return this.PORT_STATE === STATE.CONNECTING;
    };

    PipelineEditorWidget.prototype.connectPort = function(nodeId, id, isOutput) {
        this.logger.info('port ' + id + ' has been clicked! (', isOutput, ')');
        if (this.PORT_STATE === STATE.DEFAULT) {
            this.srcPortToConnectArgs = arguments;
            return this.startPortConnection(nodeId, id, isOutput);
        } else if (this._selectedPort !== id) {
            this.logger.info('connecting ' + this._selectedPort + ' to ' + id);
            var src = !isOutput ? this._selectedPort : id,
                dst = isOutput ? this._selectedPort : id;

            this.createConnection(src, dst);
        } else if (!this._selectedPort) {
            this.logger.error(`Invalid connection state: ${this.PORT_STATE} w/ ${this._selectedPort}`);
        }

        this.resetPortState();
    };

    PipelineEditorWidget.prototype.startPortConnection = function(nodeId, id, isOutput) {
        var existingMatches = this.getExistingPortMatches(id, isOutput);
        
        // Hide all ports except 'id' on 'nodeId'
        this._selectedPort = id;

        // Get all existing potential port destinations for the id
        existingMatches.forEach(match =>
            this.showPorts(match.nodeId, match.portIds, isOutput)
        );
        this.showPorts(nodeId, id, !isOutput);

        this.PORT_STATE = STATE.CONNECTING;
    };

    PipelineEditorWidget.prototype.onDeselect = function() {
        this.resetPortState();
        return ThumbnailWidget.prototype.onDeselect.apply(this, arguments);
    };

    PipelineEditorWidget.prototype.resetPortState = function() {
        // Reset connecting state
        this._itemsShowingPorts.forEach(item => item.hidePorts());
        this.PORT_STATE = STATE.DEFAULT;
    };

    PipelineEditorWidget.prototype.showPorts = function(nodeId, portIds, areInputs) {
        var item = this.items[nodeId];
        item.showPorts(portIds, areInputs);
        this._itemsShowingPorts.push(item);
    };

    // No extra buttons - just the empty message!
    PipelineEditorWidget.prototype.refreshExtras =
        PipelineEditorWidget.prototype.updateEmptyMsg;

    //////////////////// Action Overrides ////////////////////

    PipelineEditorWidget.prototype.onAddItemSelected = function(item, selected) {
        this.createConnectedNode(item.id, selected.node.id);
    };

    //////////////////// Execution Support ////////////////////

    PipelineEditorWidget.prototype.initExecs = function(execCntr) {
        this.execTabOpen = false;
        this.executions = {};
        // Add the container for the execution info
        this.$execCntr = execCntr;
        this.$execCntr.addClass('panel panel-success');

        // Add click to expand
        this.$execHeader = $('<div>', {class: 'execution-header panel-header'});
        this.$execCntr.append(this.$execHeader);

        this.$execBody = $('<div>', {class: 'execution-body'});
        this.$execList = $('<table>', {class: 'table'});
        var thead = $('<thead>'),
            tr = $('<tr>'),
            td = $('<td>');

        // Create the table header
        td.text('Name');
        tr.append(td);
        td = td.clone();
        td.text('Creation Date');
        tr.append(td);
        tr.append($('<td>'));
        thead.append(tr);
        this.$execList.append(thead);

        // Create the table header
        this.$execContent = $('<tbody>');
        this.$execList.append(this.$execContent);

        this.$execBody.append(this.$execList);
        this.$execCntr.append(this.$execBody);

        this.$execHeader.on('click', this.toggleExecutionTab.bind(this));
        this.updateExecutions();
    };

    PipelineEditorWidget.prototype.addExecution =
    PipelineEditorWidget.prototype.updateExecution = function(desc) {
        this.executions[desc.id] = desc;
        this.updateExecutions();
    };

    PipelineEditorWidget.prototype.removeExecution = function(id) {
        delete this.executions[id];
        this.updateExecutions();
    };

    PipelineEditorWidget.prototype._updateExecutions = function() {
        var keys = Object.keys(this.executions),
            hasExecutions = !!keys.length,
            msg = `${keys.length || 'No'} Associated Execution` +
                (keys.length === 1 ? '' : 's');

        // Update the appearance
        if (this.execTabOpen && hasExecutions) {
            var execs = keys.map(id => this.executions[id])
                    .sort((a, b) => a.createdAt < b.createdAt ? -1 : 1)
                    .map(exec => this.createExecutionRow(exec));

            // Create the body of the tab
            this.$execContent.empty();
            execs.forEach(html => this.$execContent.append(html));

            this.$execBody.show();
        } else {
            // Set the height to 0
            this.$execBody.hide();
            this.$execContent.height(0);
            this.execTabOpen = false;
        }
        this.$execHeader.text(msg);
    };

    PipelineEditorWidget.prototype.createExecutionRow = function(exec) {
        var row = $('<tr>'),
            title = $('<td>', {class: 'execution-name'}),
            timestamp = $('<td>'),
            className = Utils.ClassForJobStatus[exec.status] || '',
            date = Utils.getDisplayTime(exec.createdAt),
            rmIcon = $(REMOVE_ICON);

        timestamp.text(date);

        title.append($('<a>').text(exec.name));
        title.on('click',
            () => WebGMEGlobal.State.registerActiveObject(exec.id));

        // Add the remove icon
        rmIcon.on('click', () => this.deleteExecution(exec.id));
        row.append(title, timestamp, rmIcon);
        row[0].className = className;
        return row;
    };

    PipelineEditorWidget.prototype.toggleExecutionTab = function() {
        this.execTabOpen = !this.execTabOpen;
        this.updateExecutions();
    };

    ////////////////////////// Action Overrides //////////////////////////
    PipelineEditorWidget.prototype.selectTargetFor = function(itemId) {
        // If it is an input operation, then we will need to add 'upload artifact'
        // options
        if (this.items[itemId].desc.baseName === CONSTANTS.OP.INPUT) {
            return this.selectTargetForLoader.apply(this, arguments);
        } else if (this.isArchitecturePtr.apply(this, arguments)) {
            // Create new architecture from the "set ptr" dialog
            return this.selectArchitectureTarget.apply(this, arguments);
        } else {
            return ThumbnailWidget.prototype.selectTargetFor.apply(this, arguments);
        }
    };

    PipelineEditorWidget.prototype.addCreationNode = function(name, targets) {
        var nodeId = targets.length ? targets[0].node.id : null,
            creationNode;

        creationNode = {
            node: {
                id: `creation-node-${name}`,
                name: name,
                class: 'create-node',
                attributes: {},
                Decorator: this.getDecorator(nodeId)
            }
        };

        targets.push(creationNode);
        return creationNode.node.id;
    };

    PipelineEditorWidget.prototype.selectArchitectureTarget = function(itemId, ptr, filter) {
        return this.selectTargetWithCreationNode('New Architecture',
            DeepForge.create.Architecture, itemId, ptr, filter);
    };

    PipelineEditorWidget.prototype.selectTargetForLoader = function(itemId, ptr, filter) {
        return this.selectTargetWithCreationNode('Upload Artifact',
            DeepForge.create.Artifact, itemId, ptr, filter);
    };

    PipelineEditorWidget.prototype.selectTargetWithCreationNode = function(name, fn, itemId, ptr, filter) {
        var validTargets = this.getValidTargetsFor(itemId, ptr, filter),
            creationNodeId = this.addCreationNode(name, validTargets);

        // Add the 'Upload Artifact' option
        AddNodeDialog.prompt(validTargets)
            .then(selected => {
                if (selected.node.id === creationNodeId) {
                    fn();
                } else {
                    var item = this.items[itemId];
                    if (item.decorator.savePointer) {
                        return item.decorator.savePointer(ptr, selected.node.id);
                    } else {
                        this.setPointerForNode(itemId, ptr, selected.node.id);
                    }
                }
            });
    };

    ////////////////////////// Action Overrides END //////////////////////////

    // Changing the layout to klayjs
    PipelineEditorWidget.prototype.refreshScreen = function() {
        if (!this.active) {
            return;
        }

        // WRITE UPDATES
        // Update the locations of all the nodes

        var graph = {
            id: 'root',
            properties: {
                direction: 'DOWN',
                'de.cau.cs.kieler.spacing': 25,
                'de.cau.cs.kieler.edgeRouting': 'ORTHOGONAL'
                //'de.cau.cs.kieler.klay.layered.nodePlace': 'INTERACTIVE'
            },
            edges: [],
            children: []
        };

        graph.children = Object.keys(this.items).map(itemId => {
            var item = this.items[itemId],
                ports;

            ports = item.inputs.map(p => this._getPortInfo(item, p, true))
                .concat(item.outputs.map(p => this._getPortInfo(item, p)));
            return {
                id: itemId,
                height: item.height,
                width: item.width,
                ports: ports,
                properties: {
                    'de.cau.cs.kieler.portConstraints': 'FIXED_POS'
                }
            };
        });

        graph.edges = Object.keys(this.connections).map(connId => {
            var conn = this.connections[connId];
            return {
                id: connId,
                source: conn.src,
                target: conn.dst,
                sourcePort: conn.srcPort,
                targetPort: conn.dstPort
            };
        });

        $klay.layout({
            graph: graph,
            success: graph => {
                this.resultGraph = graph;
                this.queueFns([
                    this.applyLayout.bind(this, graph),
                    this.updateTranslation.bind(this),
                    this.refreshItems.bind(this),
                    this.refreshConnections.bind(this),
                    this.selectionManager.redraw.bind(this.selectionManager),
                    this.updateContainerWidth.bind(this),
                    this.refreshExtras.bind(this)
                ]);
            }
        });
    };

    PipelineEditorWidget.prototype._getPortInfo = function(item, port, isInput) {
        var position = item.decorator.getPortLocation(port.id, isInput),
            side = isInput ? 'NORTH' : 'SOUTH';

        position.y += (item.height/2) - 1;
        return {
            id: port.id,
            width: 1,  // Ports are rendered outside the node in this library;
            height: 1,  // we want it to look like it goes right up to the node
            properties: {
                'de.cau.cs.kieler.portSide': side
            },
            x: position.x,
            y: position.y
        };
    };

    PipelineEditorWidget.prototype.applyLayout = function (graph) {
        var id,
            item,
            lItem,  // layout item
            i;

        for (i = graph.children.length; i--;) {
            // update the x, y
            lItem = graph.children[i];
            id = lItem.id;
            item = this.items[id];
            item.x = lItem.x + item.width/2;
            item.y = lItem.y + item.height/2;
        }

        for (i = graph.edges.length; i--;) {
            // update the connection.points
            lItem = graph.edges[i];
            id = lItem.id;
            item = this.connections[id];
            item.points = lItem.bendPoints || [];
            item.points.unshift(lItem.sourcePoint);
            item.points.push(lItem.targetPoint);
        }
    };

    return PipelineEditorWidget;
});
