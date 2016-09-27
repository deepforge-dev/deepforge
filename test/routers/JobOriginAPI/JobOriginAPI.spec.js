var testFixture = require('../../globals'),
    superagent = testFixture.superagent,
    assert = testFixture.assert,
    expect = testFixture.expect,
    gmeConfig = testFixture.getGmeConfig(),
    server = testFixture.WebGME.standaloneServer(gmeConfig),
    mntPt = 'job/origins';

describe('JobOriginAPI', function() {
    var hashes = {},
        getUrl = function(hash) {
            return [
                server.getUrl(),
                mntPt,
                hash
            ].join('/');
        },
        getJobInfo = function() {
            var hash = 'hash'+Math.ceil(Math.random()*100000);

            while (hashes[hash]) {
                hash = 'hash'+Math.ceil(Math.random()*100000);
            }
            hashes[hash] = true;

            return {
                hash: hash,
                job: 'SomeJob',
                execution: 'train_execution',
                project: 'guest+example',
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

        superagent.post(getUrl(job.hash))
            .send(job)
            .end(function (err, res) {
                expect(res.status).equal(201, err);
                done();
            });
    });

    it('should read job info', function(done) {
        var job = getJobInfo(),
            url = getUrl(job.hash);

        superagent.post(url)
            .send(job)
            .end(function (err, res) {
                expect(res.status).equal(201, err);
                superagent.get(url)
                    .end((err, res) => {
                        var jobInfo = JSON.parse(res.text);
                        console.log('jobInfo:', jobInfo);
                        console.log('job:', job);
                        Object.keys(jobInfo).forEach(key => {
                            expect(jobInfo[key]).equal(job[key]);
                        });
                        done();
                    });
            });
    });

    it('should delete job info', function(done) {
        var job = getJobInfo(),
            url = getUrl(job.hash);

        superagent.post(url)
            .send(job)
            .end(function (err, res) {
                expect(res.status).equal(201, err);
                superagent.delete(url).end(err => {
                    expect(err).equal(null);
                    superagent.get(url)
                        .end((err, res) => {
                            expect(res.status).equal(404, err);
                            done();
                        });
                });
            });
    });
});
