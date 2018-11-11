define([
    'executor/ExecutorClient'
], function(
    ExecutorClient
) {
    // TODO
    const GMEExecutor = function(logger, gmeConfig) {
        const isHttps = typeof window === 'undefined' ? false :
            window.location.protocol !== 'http:';

        this.logger = logger.fork('GME');
        this.pollInterval = 1500;
        this.executor = new ExecutorClient({
            logger: this.logger,
            serverPort: gmeConfig.server.port,
            httpsecure: isHttps
        });

        this._events = {};  // FIXME: there must be a better way...
    };

    GMEExecutor.prototype.cancelJob = function(job) {
        return this.executor.cancelJob(job.hash, job.secret);
    };

    // TODO: Standardize this
    GMEExecutor.prototype.getInfo = function(job) {
        return this.executor.getInfo(job.hash);
    };

    GMEExecutor.prototype.createJob = async function(hash) {
        const result = await this.executor.createJob({hash});

        this.startPolling(hash);
        // When to stop polling?
        // TODO

        return result;
    };

    GMEExecutor.prototype.on = function(ev, cb) {
        this._events[ev] = this._events[ev] || [];
        this._events[ev].push(cb);
    };

    GMEExecutor.prototype.emit = function(ev) {
        const args = Array.prototype.slice.call(arguments, 1);
        const handlers = this._events[ev] || [];
        handlers.forEach(fn => fn.apply(this, args));
    };

    GMEExecutor.prototype.startPolling = async function(id) {
        const info = await this.executor.getInfo(id);

        // Check for new stdout. Emit 'data' with the content
        // TODO

        if (info.status === 'CREATED' || info.status === 'RUNNING') {
            setTimeout(() => this.startPolling(id), this.pollInterval);
        } else {
            this.emit('end', id, info);
        }
    };

    // What is the API for the executor?
    // It should "push" the data to the client
    //   - createJob
    //   - cancelJob
    //     - getInfo
    //     - getOutput
    // TODO

    return GMEExecutor;
});
