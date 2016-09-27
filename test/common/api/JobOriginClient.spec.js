var testFixture = require('../../globals'),
    expect = testFixture.expect,
    gmeConfig = testFixture.getGmeConfig(),
    server = testFixture.WebGME.standaloneServer(gmeConfig),
    Logger = require('webgme/src/server/logger'),
    logger = Logger.createWithGmeConfig('gme', gmeConfig, true),
    JobOriginClient = testFixture.requirejs('deepforge/api/JobOriginClient');

describe('JobOriginClient', function() {
    var client = new JobOriginClient({
            logger: logger,
            origin: server.getUrl(),
            projectId: 'testProject',
            branchName: 'master'
        }),
        hashes = {},
        getJobInfo = function() {
            var hash = 'hashOrigin'+Math.ceil(Math.random()*100000);

            while (hashes[hash]) {
                hash = 'hashOrigin'+Math.ceil(Math.random()*100000);
            }
            hashes[hash] = true;

            return {
                hash: hash,
                job: 'SomeJob',
                execution: 'train_execution',
                nodeId: 'K/6/1'
            };
        };

    before(function(done) {
        server.start(done);
    });

    after(function(done) {
        server.stop(done);
    });

    it('should store job info', function(done) {
        var job = getJobInfo();

        client.record(job.hash, job)
            .nodeify(done);
    });

    it('should read job info', function(done) {
        var job = getJobInfo();

        client.record(job.hash, job)
            .then(() => client.getOrigin(job.hash))
            .then(jobInfo => {
                Object.keys(job).forEach(key => {
                    expect(jobInfo[key]).equal(job[key]);
                });
            })
            .nodeify(done);
    });

    it('should delete job info', function(done) {
        var job = getJobInfo();

        client.record(job.hash, job)
            .then(() => client.deleteRecord(job.hash))
            .then(() => client.getOrigin(job.hash))
            .then(res => expect(res).equal(null))
            .nodeify(done);
    });
});
