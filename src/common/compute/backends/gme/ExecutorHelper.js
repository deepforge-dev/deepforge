/* globals define */
define([
    'superagent',
    'module',
    'q'
], function(
    superagent,
    module,
    Q
) {
    const WORKER_ENDPOINT = '/rest/executor/worker';
    const JOBS_ENDPOINT = '/rest/executor';
    const values = dict => Object.keys(dict).map(k => dict[k]);
    const ExecutorHelper = {};

    ExecutorHelper.url = function(urlPath) {
        if (typeof window === 'undefined') {
            const configPath = module.uri.replace('src/common/ExecutorHelper.js', 'config/index.js');
            const gmeConfig = require.nodeRequire(configPath);
            return `http://127.0.0.1:${gmeConfig.server.port}${urlPath}`;
        }
        return urlPath;
    };

    ExecutorHelper.get = function(urlPath) {
        const deferred = Q.defer();
        const url = this.url(urlPath);

        superagent.get(url)
            .end((err, res) => {
                if (err) {
                    return deferred.reject(err);
                }
                deferred.resolve(JSON.parse(res.text));
            });

        return deferred.promise;
    };

    ExecutorHelper.getWorkers = function() {
        return this.get(WORKER_ENDPOINT)
            .then(workerDict => values(workerDict));
    };

    ExecutorHelper.getJobs = function() {
        return this.get(JOBS_ENDPOINT);
    };

    return ExecutorHelper;
});
