/*globals define */
/*jshint node:true, browser:true, esversion: 6*/

define([
    'plugin/CreateExecution/CreateExecution/CreateExecution',
    'plugin/ExecuteJob/ExecuteJob/ExecuteJob',
    'common/storage/constants',
    'common/core/constants',
    'deepforge/Constants',
    'q',
    'text!./metadata.json',
    'underscore'
], function (
    CreateExecution,
    ExecuteJob,
    STORAGE_CONSTANTS,
    GME_CONSTANTS,
    CONSTANTS,
    Q,
    pluginMetadata,
    _
) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);
    /**
     * Initializes a new instance of ExecutePipeline.
     * @class
     * @augments {CreateExecution}
     * @classdesc This class represents the plugin ExecutePipeline.
     * @constructor
     */
    var ExecutePipeline = function () {
        // Call base class' constructor.
        CreateExecution.call(this);
        ExecuteJob.call(this);
        this.pluginMetadata = pluginMetadata;

        this.changes = {};
        this.currentChanges = {};  // read-only changes being applied
        this.creations = {};
        this.deletions = [];
        this.createIdToMetadataId = {};
        this.initRun();
    };

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructue etc.
     * This is also available at the instance at this.pluginMetadata.
     * @type {object}
     */
    ExecutePipeline.metadata = pluginMetadata;

    // Prototypical inheritance from CreateExecution.
    ExecutePipeline.prototype = Object.create(CreateExecution.prototype);
    ExecutePipeline.prototype.constructor = ExecutePipeline;

    _.extend(ExecutePipeline.prototype, ExecuteJob.prototype);

    ExecutePipeline.prototype.initRun = function () {
        // Cache
        this.nodes = {};

        // Record keeping for running operations
        this.opFor = {};
        this.incomingCounts = {};
        this.outputsOf = {};
        this.inputPortsFor = {};
        this.inputs = {};

        this.finished = {};
        this.completedCount = 0;
        this.totalCount = 0;
        this.outputLineCount = {};

        // When a pipeline fails, it will let all running jobs finish and record
        // the results of each job
        //
        // The following variables are used to...
        //   - keep track of the number of jobs currently running
        //   - keep track if the pipeline has errored
        //     - if so, don't start any more jobs
        this.pipelineError = null;
        this.canceled = false;
        this.runningJobs = 0;

        // metadata records
        this._metadata = {};
        this._markForDeletion = {};  // id -> node
        this._oldMetadataByName = {};  // name -> id
        this.lastAppliedCmd = {};
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
    ExecutePipeline.prototype.main = function (callback) {
        var startPromise,
            runId;

        this.initRun();
        if (this.core.isTypeOf(this.activeNode, this.META.Pipeline)) {
            // If starting with a pipeline, we will create an Execution first
            startPromise = this.createExecution(this.activeNode)
                .then(execNode => {
                    this.logger.debug(`Finished creating execution "${this.getAttribute(execNode, 'name')}"`);
                    this.activeNode = execNode;
                });
        } else if (this.core.isTypeOf(this.activeNode, this.META.Execution)) {
            this.logger.debug('Restarting execution');
            startPromise = Q();
        } else {
            return callback('Current node is not a Pipeline or Execution!', this.result);
        }

        this._callback = callback;
        this.currentForkName = null;

        startPromise
            .then(() => this.core.loadSubTree(this.activeNode))
            .then(subtree => {
                var children;

                children = subtree
                    .filter(n => this.core.getParent(n) === this.activeNode);

                this.pipelineName = this.getAttribute(this.activeNode, 'name');
                this.forkNameBase = this.pipelineName;
                this.logger.debug(`Loaded subtree of ${this.pipelineName}. About to build cache`);
                this.buildCache(subtree);
                this.logger.debug('Parsing execution for job inter-dependencies');
                this.parsePipeline(children);  // record deps, etc

                // Detect if resuming execution
                runId = this.getAttribute(this.activeNode, 'runId');
                return this.isResuming().then(resuming => {
                    if (resuming) {
                        this.currentRunId = runId;
                        this.startExecHeartBeat();
                        return this.resumePipeline();
                    }
                    return this.startPipeline();
                });

            })
            .fail(e => this.logger.error(e));
    };

    ExecutePipeline.prototype.isResuming = function () {
        var currentlyRunning = this.getAttribute(this.activeNode, 'status') === 'running',
            runId = this.getAttribute(this.activeNode, 'runId');

        if (runId && currentlyRunning) {
            // Verify that it is on the correct branch
            return this.originManager.getOrigin(runId)
                .then(origin => {
                    if (origin && origin.branch === this.branchName) {
                        return this.pulseClient.check(runId)
                            // If it is dead (not unknown!), then resume
                            .then(status => status === CONSTANTS.PULSE.DEAD);
                    } else {
                        return false;
                    }
                });
        }
        return Q().then(() => false);
    };

    ExecutePipeline.prototype.resumePipeline = function () {
        var nodes = Object.keys(this.nodes).map(id => this.nodes[id]),
            allJobs = nodes.filter(node => this.core.isTypeOf(node, this.META.Job)),
            status,
            jobs = {
                success: [],
                failed: [],
                running: [],
                pending: []
            };

        this.logger.info(`Resuming pipeline execution: ${this.currentRunId}`);

        // Get all completed jobs' operations and update records for these
        for (var i = allJobs.length; i--;) {
            status = this.getAttribute(allJobs[i], 'status');
            if (!jobs[status]) {
                jobs[status] = [];
            }

            // If any running jobs are missing jobIds, set them to pending
            if (status === 'running' && !this.canResumeJob(allJobs[i])) {
                jobs.pending.push(allJobs[i]);
            } else {
                jobs[status].push(allJobs[i]);
            }
        }

        // Remove finished jobs from incomingCounts
        jobs.success.concat(jobs.failed, jobs.running)
            .map(job => this.core.getPath(job))
            .forEach(id => delete this.incomingCounts[id]);

        return Q.all(allJobs.map(job => this.recordOldMetadata(job, true)))
            .then(() => Q.all(jobs.success.map(job => this.getOperation(job))))
            .then(ops => ops.forEach(op => this.updateJobCompletionRecords(op)))
            .then(() => {
                
                if (jobs.running.length) {  // Resume all running jobs
                    return Q.all(jobs.running.map(job => this.resumeJob(job)));
                } else if (this.completedCount === this.totalCount) {
                    return this.onPipelineComplete();
                } else {
                    // If none are running, try to start the next ones
                    return this.executeReadyOperations();
                }
            })
            .fail(err => this._callback(err));
    };

    ExecutePipeline.prototype.startPipeline = function () {
        var rand = Math.floor(Math.random()*10000),
            commit = this.commitHash.replace('#', '');

        this.logger.debug('Clearing old results');
        this.currentRunId = `Pipeline_${commit}_${Date.now()}_${rand}`;

        // Record the execution origin
        this.originManager.record(this.currentRunId, {
            nodeId: this.core.getPath(this.activeNode),
            job: 'N/A',
            execution: this.getAttribute(this.activeNode, 'name')
        });

        this.startExecHeartBeat();
        return this.clearResults()
            .then(() => this.executePipeline())
            .fail(e => this.logger.error(e));
    };

    ExecutePipeline.prototype.onSaveForked = function (forkName) {
        // Update the origin on fork
        this.originManager.fork(this.currentRunId, forkName);
        return ExecuteJob.prototype.onSaveForked.call(this, forkName);
    };

    ExecutePipeline.prototype.updateNodes = function (hash) {
        var result = ExecuteJob.prototype.updateNodes.call(this, hash);
        return result.then(() => this.updateCache());
    };

    ExecutePipeline.prototype.updateCache = function () {
        var nodeIds = Object.keys(this.nodes),
            nodes = nodeIds.map(id => this.core.loadByPath(this.rootNode, id));

        this.logger.debug(`updating node cache (${nodeIds.length} nodes)`);
        return Q.all(nodes).then(nodes => {
            for (var i = nodeIds.length; i--;) {
                this.nodes[nodeIds[i]] = nodes[i];
            }
        });
    };

    ExecutePipeline.prototype.isExecutionCanceled = function () {
        return this.getAttribute(this.activeNode, 'status') === 'canceled';
    };

    ExecutePipeline.prototype.isInputData = function (node) {
        var prnt = this.core.getParent(node);
        return this.core.isTypeOf(prnt, this.META.Inputs);
    };

    ExecutePipeline.prototype.clearResults = function () {
        var nodes = Object.keys(this.nodes).map(id => this.nodes[id]);
        // Clear the pipeline's results
        this.logger.info('Clearing all intermediate execution results');

        nodes.filter(node => this.core.isTypeOf(node, this.META.Data))
            // Only input data nodes should be cleared. Outputs will be overwritten
            .filter(node => this.isInputData(node))
            .forEach(conn => this.core.delAttribute(conn, 'data'));

        // Set the status for each job to 'pending'
        nodes.filter(node => this.core.isTypeOf(node, this.META.Job))
            .forEach(node => {
                this.recordOldMetadata(node);
                this.setAttribute(node, 'status', 'pending');
            });

        // Set the status of the execution to 'running'
        this.setAttribute(this.activeNode, 'status', 'running');
        this.logger.info('Setting all jobs status to "pending"');
        this.logger.debug(`Making a commit from ${this.currentHash}`);
        this.setAttribute(this.activeNode, 'startTime', Date.now());
        this.setAttribute(this.activeNode, 'runId', this.currentRunId);
        this.core.delAttribute(this.activeNode, 'endTime');
        return this.save(`Initializing ${this.pipelineName} for execution`);
    };

    //////////////////////////// Operation Preparation/Execution ////////////////////////////
    ExecutePipeline.prototype.buildCache = function (nodes) {
        // Cache all nodes
        nodes.forEach(node => this.nodes[this.core.getPath(node)] = node);
    };

    // For each child, we need to organize them by the number of incoming connections
    // AND the corresponding incoming connections. When a connection's src is
    // given data, all the operations using that data can be decremented.
    // If the remaining incoming connection count is zero for an operation,
    // execute the given operation
    ExecutePipeline.prototype.parsePipeline = function (nodes) {
        var conns,
            nodeId,
            srcPortId,
            dstPortId,
            i;

        this.completedCount = 0;

        // Get all connections
        conns = this.getConnections(nodes);

        // Get all operations
        nodes
            .filter(node => conns.indexOf(node) === -1)
            .forEach(node => {
                var nodeId = this.core.getPath(node);
                this.incomingCounts[nodeId] = 0;
                this.finished[nodeId] = false;
                this.inputs[nodeId] = [];

                this.totalCount++;
            });

        // Store the operations by their...
        //    - incoming conns (srcPortId => [ops]) (for updating which nodes come next)
        for (i = conns.length; i--;) {
            dstPortId = this.core.getPointerPath(conns[i], 'dst');
            nodeId = this.getSiblingIdContaining(dstPortId);

            srcPortId = this.core.getPointerPath(conns[i], 'src');
            if (!this.opFor[srcPortId]) {
                this.opFor[srcPortId] = [nodeId];
            } else {
                this.opFor[srcPortId].push(nodeId);
            }

            //    - incoming counts
            this.incomingCounts[nodeId]++;
            this.inputs[nodeId].push(srcPortId);
            if (!this.inputPortsFor[dstPortId]) {
                this.inputPortsFor[dstPortId] = [srcPortId];
            } else {
                this.inputPortsFor[dstPortId].push(srcPortId);
            }
        }

        //    - output conns
        for (i = conns.length; i--;) {
            srcPortId = this.core.getPointerPath(conns[i], 'src');
            nodeId = this.getSiblingIdContaining(srcPortId);

            dstPortId = this.core.getPointerPath(conns[i], 'dst');
            if (!this.outputsOf[nodeId]) {
                this.outputsOf[nodeId] = [dstPortId];
            } else {
                this.outputsOf[nodeId].push(dstPortId);
            }
        }
    };

    ExecutePipeline.prototype.getSiblingIdContaining = function (nodeId) {
        var parentId = this.core.getPath(this.activeNode) + GME_CONSTANTS.PATH_SEP,
            relid = nodeId.replace(parentId, '');

        return parentId + relid.split(GME_CONSTANTS.PATH_SEP).shift();
    };

    ExecutePipeline.prototype.executePipeline = function() {
        this.logger.debug('starting pipeline');
        this.executeReadyOperations();
    };

    ExecutePipeline.prototype.onOperationFail = function(node, err) {
        var job = this.core.getParent(node),
            id = this.core.getPath(node),
            name = this.getAttribute(node, 'name');

        this.logger.debug(`Operation ${name} (${id}) failed: ${err}`);
        this.setAttribute(job, 'status', 'fail');
        this.clearOldMetadata(job);
        this.onPipelineComplete(err);
    };

    ExecutePipeline.prototype.onOperationCanceled = function(op) {
        var job = this.core.getParent(op);
        this.setAttribute(job, 'status', 'canceled');
        this.runningJobs--;
        this.logger.debug(`${this.getAttribute(job, 'name')} has been canceled`);
        this.onPipelineComplete();
    };

    ExecutePipeline.prototype.onPipelineComplete = function(err) {
        var name = this.getAttribute(this.activeNode, 'name'),
            msg = `"${this.pipelineName}" `;

        if (err) {
            this.runningJobs--;
        }

        this.pipelineError = this.pipelineError || err;

        this.logger.debug(`${this.runningJobs} remaining jobs`);
        if ((this.pipelineError || this.canceled) && this.runningJobs > 0) {
            var action = this.pipelineError ? 'error' : 'cancel';
            this.logger.info(`Pipeline ${action}ed but is waiting for the running ` +
                'jobs to finish');
            return;
        }

        if (this.currentForkName) {
            // notify client that the job has completed
            this.sendNotification(`"${this.pipelineName}" execution completed on branch "${this.currentForkName}"`);
        }

        if (this.pipelineError) {
            msg += 'failed!';
        } else if (this.canceled) {
            msg += 'canceled!';
        } else {
            msg += 'finished!';
        }

        return this.isDeleted().then(isDeleted => {
            this.stopExecHeartBeat();
            if (!isDeleted) {

                this.logger.debug(`Pipeline "${name}" complete!`);
                this.setAttribute(this.activeNode, 'endTime', Date.now());
                this.setAttribute(this.activeNode, 'status',
                    (this.pipelineError ? 'failed' :
                    (this.canceled ? 'canceled' : 'success')
                    )
                );

                this._finished = true;
                this.resultMsg(msg);
                this.save('Pipeline execution finished')
                    .then(() => {
                        this.result.setSuccess(!this.pipelineError);
                        this._callback(this.pipelineError || null, this.result);
                    })
                    .fail(e => this.logger.error(e));
            } else {  // deleted!
                this.logger.debug('Execution has been deleted!');
                this.result.setSuccess(!this.pipelineError);
                this._callback(this.pipelineError || null, this.result);
            }
        });

    };

    ExecutePipeline.prototype.isDeleted = function () {
        var activeId = this.core.getPath(this.activeNode);

        // Check if the current execution has been deleted
        return this.project.getBranchHash(this.branchName)
            .then(hash => this.updateNodes(hash))
            .then(() => this.core.loadByPath(this.rootNode, activeId))
            .then(node => {
                var deleted = node === null,
                    msg = `Verified that execution is ${deleted ? '' : 'not '}deleted`;

                this.logger.debug(msg);
                return deleted;
            })
            .fail(err => this.logger.error(err));
    };

    ExecutePipeline.prototype.onPipelineDeleted = function () {
        var msg = `${this.pipelineName} has been deleted`;
        this.resultMsg(msg);
        this.result.setSuccess(true);
        this._callback(null, this.result);
    };

    ExecutePipeline.prototype.executeReadyOperations = function () {
        // Get all operations with incomingCount === 0
        var operations = Object.keys(this.incomingCounts),
            readyOps = operations.filter(name => this.incomingCounts[name] === 0);

        this.logger.info(`About to execute ${readyOps.length} operations`);

        // If the pipeline has errored don't start any more jobs
        if (this.pipelineError || this.canceled) {
            if (this.runningJobs === 0) {
                this.onPipelineComplete();
            }
            return 0;
        }

        // Execute all ready operations
        readyOps.forEach(jobId => {
            delete this.incomingCounts[jobId];
        });
        this.logger.info(`Found ${readyOps.length} ready job(s)`);
        readyOps.reduce((prev, jobId) => {
            return prev.then(() => this.executeJob(this.nodes[jobId]));
        }, Q());
        this.runningJobs += readyOps.length;
        this.logger.info(`There ${this.runningJobs === 1 ? 'is' : 'are'} now ${this.runningJobs} running job(s)`);

        return readyOps.length;
    };

    ExecutePipeline.prototype.onOperationComplete = function (opNode) {
        var name = this.getAttribute(opNode, 'name'),
            jNode = this.core.getParent(opNode),
            jobId = this.core.getPath(jNode),
            counts,
            hasReadyOps;

        // Set the operation to 'success'!
        this.clearOldMetadata(jNode);
        this.runningJobs--;
        this.setAttribute(jNode, 'status', 'success');
        this.logger.info(`Setting ${jobId} status to "success"`);
        this.logger.info(`There are now ${this.runningJobs} running jobs`);
        this.logger.debug(`Making a commit from ${this.currentHash}`);
        this.save(`Operation "${name}" in ${this.pipelineName} completed successfully`)
            .then(() => {

                counts = this.updateJobCompletionRecords(opNode);
                hasReadyOps = counts.indexOf(0) > -1;

                this.logger.debug(`Operation "${name}" completed. ` + 
                    `${this.totalCount - this.completedCount} remaining.`);
                if (hasReadyOps) {
                    this.executeReadyOperations();
                } else if (this.completedCount === this.totalCount) {
                    this.onPipelineComplete();
                }
            });
    };

    ExecutePipeline.prototype.updateJobCompletionRecords = function (opNode) {
        var nextPortIds = this.getOperationOutputIds(opNode),
            resultPorts,
            counts;

        // Transport the data from the outputs to any connected inputs
        //   - Get all the connections from each outputId
        //   - Get the corresponding dst outputs
        //   - Use these new ids for checking 'hasReadyOps'

        resultPorts = nextPortIds.map(id => this.inputPortsFor[id])  // dst -> src port
            .reduce((l1, l2) => l1.concat(l2), []);

        resultPorts
            .map((id, i) => [this.nodes[id], this.nodes[nextPortIds[i]]])
            .forEach(pair => {  // [ resultPort, nextPort ]
                var result = pair[0],
                    next = pair[1],
                    hash = this.getAttribute(result, 'data');
                
                this.logger.info(`forwarding data (${hash}) from ${this.core.getPath(result)} ` +
                    `to ${this.core.getPath(next)}`);
                this.setAttribute(next, 'data', hash);
                //this.logger.info(`Setting ${jobId} data to ${hash}`);
            });

        // For all the nextPortIds, decrement the corresponding operation's incoming counts
        counts = nextPortIds.map(id => this.getSiblingIdContaining(id))
            .reduce((l1, l2) => l1.concat(l2), [])

            // decrement the incoming counts for each operation id
            .map(opId => --this.incomingCounts[opId]);

        this.completedCount++;
        return counts;
    };

    ExecutePipeline.prototype.getOperationOutputIds = function(node) {
        var jobId = this.getSiblingIdContaining(this.core.getPath(node));

        // Map the job to it's output ports
        return this.outputsOf[jobId] || [];
    };

    ExecutePipeline.prototype.getOperationOutputs = function(node) {
        return this.getOperationOutputIds(node).map(id => this.nodes[id]);
    };

    return ExecutePipeline;
});
