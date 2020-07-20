/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

define([
    'js/Constants',
    'deepforge/utils',
    'deepforge/viz/Execute'
], function (
    CONSTANTS,
    utils,
    Execute
) {

    'use strict';
    var ExecutionIndexControl;

    ExecutionIndexControl = function (options) {

        this._logger = options.logger.fork('Control');
        this._client = options.client;
        Execute.call(this, this._client, this._logger);
        this._embedded = options.embedded;

        // Initialize core collections and variables
        this._widget = options.widget;

        this._currentNodeId = null;
        this.displayedExecutions = [];
        this._graphsForExecution = {};
        this._graphToExec = {};
        this._pipelineNames = {};
        this.abbrToId = {};
        this.abbrFor = {};

        this._initWidgetEventHandlers();

        this._logger.debug('ctor finished');
    };

    ExecutionIndexControl.prototype = Object.create(Execute.prototype);

    ExecutionIndexControl.prototype._deleteExecution = function (id) {
        let node = this._client.getNode(id),
            name = '';
        if (node) {
            name = node.getAttribute('name');
        }

        this._client.startTransaction(`Deleted ${name} (${id}) execution.`);
        if (this.isRunning(node)) {
            this.stopExecution(id);
        }
        this._client.deleteNode(id);
        this._client.completeTransaction();
    };

    ExecutionIndexControl.prototype._initWidgetEventHandlers = function () {
        this._widget.setDisplayedExecutions = this.setDisplayedExecutions.bind(this);
        this._widget.deleteExecution = this._deleteExecution.bind(this);
    };

    ExecutionIndexControl.prototype.setDisplayedExecutions = function (displayedIds) {
        this.displayedExecutions = displayedIds;
        this._updateGraphWidget();
    };

    ExecutionIndexControl.prototype._updateGraphWidget = function () {
        const plotlyJSON = this._consolidateGraphData(this.displayedExecutions);
        const hasDisplayedMetadata = !!plotlyJSON;
        if (hasDisplayedMetadata) {
            this._widget.updateNode(plotlyJSON);
        } else {
            this._widget.removeNode();
        }
    };

    ExecutionIndexControl.prototype._consolidateGraphData = function (graphExecIDs) {
        let graphIds = graphExecIDs.map(execId => this._graphsForExecution[execId]);
        let graphDescs = graphIds.map(id => this._getObjectDescriptor(id))
            .filter(desc => !!desc);

        if (graphDescs.length > 1) {
            graphDescs.forEach(graphDesc => {
                graphDesc.plotlyData.layout.title =
                    getDisplayTitle(graphDesc, true);
            });
        }

        if (graphDescs.length > 0) {
            graphDescs.type = 'graph';
            return graphDescs;
        }
    };

    const getDisplayTitle = function (desc, includeAbbr = false) {
        let title = desc.plotlyData.layout.title ? desc.plotlyData.layout.title : 'Graph';
        if (includeAbbr) {
            title = `${title} (${desc.abbr})`;
        }
        return title;
    };

    ExecutionIndexControl.prototype.clearTerritory = function () {
        if (this._territoryId) {
            this._client.removeUI(this._territoryId);
            this._territoryId = null;
        }
    };

    /* * * * * * * * Visualizer content update callbacks * * * * * * * */
    ExecutionIndexControl.prototype.selectedObjectChanged = function (nodeId) {
        var self = this;

        self._logger.debug('activeObject nodeId \'' + nodeId + '\'');

        // Remove current territory patterns
        self.clearTerritory();
        self._currentNodeId = nodeId;

        if (typeof self._currentNodeId === 'string') {
            // Create a territory for the executions
            self._selfPatterns = {};

            self._territoryId = self._client.addUI(self, function (events) {
                self._eventCallback(events);
            });

            // Update the territory
            self._selfPatterns[nodeId] = {children: 5};
            self._client.updateTerritory(self._territoryId, self._selfPatterns);
        }
    };

    ExecutionIndexControl.prototype.getUniqAbbreviation = function (desc) {
        // Get a unique abbreviation for the given execution
        var base = utils.abbr(desc.name).toLowerCase(),
            abbr = base,
            oldAbbr = this.abbrFor[desc.id],
            i = 2;

        // Make sure it is unique!
        while (this.abbrToId[abbr] && this.abbrToId[abbr] !== desc.id) {
            abbr = base + i;
            i++;
        }

        if (oldAbbr !== undefined) {  // updating abbr
            delete this.abbrToId[oldAbbr];
        }

        this.abbrToId[abbr] = desc.id;
        this.abbrFor[desc.id] = abbr;
        return abbr;
    };

    // This next function retrieves the relevant node information for the widget
    ExecutionIndexControl.prototype._getObjectDescriptor = function (nodeId) {
        var node = this._client.getNode(nodeId),
            desc,
            base,
            type;

        if (node) {
            base = this._client.getNode(node.getBaseId());
            type = base.getAttribute('name');
            desc = {
                id: node.getId(),
                type: type,
                name: node.getAttribute('name')
            };


            if (type === 'Execution') {
                desc.status = node.getAttribute('status');
                desc.originTime = node.getAttribute('createdAt');
                desc.originId = node.getPointer('origin').to;
                desc.pipelineName = this._pipelineNames[desc.originId];
                desc.startTime = node.getAttribute('startTime');
                desc.endTime = node.getAttribute('endTime');
                this._logger.debug(`Looking up pipeline name for ${desc.name}: ${desc.pipelineName}`);
                // Add the (unique) abbreviation of the execution!
                desc.abbr = this.getUniqAbbreviation(desc);

                // Create a territory for this origin and update it!
                if (desc.originId) {
                    this._selfPatterns[desc.originId] = {children: 0};
                }
                setTimeout(() => this._client.updateTerritory(this._territoryId, this._selfPatterns), 0);
            } else if (type === 'Pipeline') {
                desc.execs = node.getMemberIds('executions');
                this._pipelineNames[desc.id] = desc.name;
            } else if (type === 'Graph') {
                desc = this.getGraphDesc(node);
            }
        }
        return desc;
    };

    ExecutionIndexControl.prototype.getGraphDesc = function (graphNode) {
        let id = graphNode.getId();
        const execId = this._client.getNode(graphNode.getParentId()).getParentId();
        let desc = {
            execId: execId,
            plotlyData: JSON.parse(graphNode.getAttribute('data'))
        };

        if (!this._graphToExec[id]) {
            this._graphsForExecution[desc.execId] = id;
            this._graphToExec[id] = desc.execId;
        }
        let displayedCnt = this.displayedExecCount(),
            execAbbr;

        if (displayedCnt > 1) {
            execAbbr = this.abbrFor[desc.execId] || this._getObjectDescriptor(desc.execId).abbr;
            desc.name = `${desc.name} (${execAbbr})`;
            desc.abbr = execAbbr;
        }
        return desc;
    };

    /* * * * * * * * Node Event Handling * * * * * * * */
    ExecutionIndexControl.prototype._eventCallback = function (events) {
        var event;

        events = events.filter(event => event.eid !== this._currentNodeId);

        this._logger.debug('received \'' + events.length + '\' events');

        for (var i = events.length; i--;) {
            event = events[i];
            switch (event.etype) {

            case CONSTANTS.TERRITORY_EVENT_LOAD:
                this._onLoad(event.eid);
                break;
            case CONSTANTS.TERRITORY_EVENT_UPDATE:
                this._onUpdate(event.eid);
                break;
            case CONSTANTS.TERRITORY_EVENT_UNLOAD:
                this._onUnload(event.eid);
                break;
            default:
                break;
            }
        }

        this._logger.debug('finished processing events!');
    };

    ExecutionIndexControl.prototype._onLoad = function (gmeId) {
        var desc = this._getObjectDescriptor(gmeId);
        this._logger.debug(`Loading node of type ${desc.type}`);
        if (desc.type === 'Execution') {
            this._logger.debug('Adding node to widget...');
            this._logger.debug('desc:', desc);
            this._widget.addNode(desc);
        } else if (desc.type === 'Pipeline') {
            this.updatePipelineNames(desc);
        } else if (desc.type === 'graph' && this.isGraphDisplayed(desc)) {
            this._updateGraphWidget(desc.execId, true);
        }
    };

    ExecutionIndexControl.prototype._onUpdate = function (gmeId) {
        var desc = this._getObjectDescriptor(gmeId);
        if (desc.type === 'Execution') {
            this._widget.updateNode(desc);
        } else if (desc.type === 'graph' && this.isGraphDisplayed(desc)) {
            this._updateGraphWidget(desc.execId, true);
        } else if (desc.type === 'Pipeline') {
            this.updatePipelineNames(desc);
        }
    };

    ExecutionIndexControl.prototype.updatePipelineNames = function (desc) {
        // Get all associated executions and update their pipeline name
        this._logger.debug('updating pipeline name for ' + desc.execs.join(', '));
        for (var i = desc.execs.length; i--;) {
            this._widget.updatePipelineName(desc.execs[i], desc.name);
        }

        if (desc.execs.length === 0) {
            // Executions have been deleted - no longer relevant
            this._logger.debug('pipeline has 0 executions... removing it', desc.id);
            delete this._selfPatterns[desc.id];
            delete this._pipelineNames[desc.id];
        }
    };

    ExecutionIndexControl.prototype._onUnload = function (id) {
        var execId = this._graphToExec[id],
            abbr;

        if (execId) {  // it is a graph
            delete this._graphToExec[id];
            delete this._graphsForExecution[execId];
        }
        if (this.abbrFor[id]) {
            abbr = this.abbrFor[id];
            delete this.abbrFor[id];
            delete this.abbrToId[abbr];
        }
        this._widget.removeNode(id);
    };

    ExecutionIndexControl.prototype.isGraphDisplayed = function (graph) {
        // lines are only displayed if their execution is checked
        return this.displayedExecutions.includes(graph.execId);
    };

    ExecutionIndexControl.prototype.displayedExecCount = function () {
        return this.displayedExecutions.length;
    };

    ExecutionIndexControl.prototype._stateActiveObjectChanged = function (model, activeObjectId) {
        if (this._currentNodeId === activeObjectId) {
            // The same node selected as before - do not trigger
        } else {
            this.selectedObjectChanged(activeObjectId);
        }
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    ExecutionIndexControl.prototype.destroy = function () {
        this._detachClientEventListeners();
        this.clearTerritory();
    };

    ExecutionIndexControl.prototype._attachClientEventListeners = function () {
        this._detachClientEventListeners();
        if (!this._embedded) {
            WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT,
                this._stateActiveObjectChanged, this);
        }
    };

    ExecutionIndexControl.prototype._detachClientEventListeners = function () {
        if (!this._embedded) {
            WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT,
                this._stateActiveObjectChanged);
        }
    };

    ExecutionIndexControl.prototype.onActivate = function () {
        this._attachClientEventListeners();

        if (typeof this._currentNodeId === 'string') {
            WebGMEGlobal.State.registerSuppressVisualizerFromNode(true);
            WebGMEGlobal.State.registerActiveObject(this._currentNodeId);
            WebGMEGlobal.State.registerSuppressVisualizerFromNode(false);
        }
    };

    ExecutionIndexControl.prototype.onDeactivate = function () {
        this._detachClientEventListeners();
    };

    return ExecutionIndexControl;
});
