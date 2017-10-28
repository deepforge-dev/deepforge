/*jshint node:true, mocha:true*/

'use strict';
var testFixture = require('../../globals'),
    path = testFixture.path,
    fs = require('fs'),
    BASE_DIR = testFixture.DF_SEED_DIR,
    SKIP_TESTS = [  // FIXME: This should be empty when actually committing
        'alexnet.lua',
        'basic3.lua',
        'basic4.lua'
    ],
    ONLY_TESTS = [
    ];

describe('ImportTorch', function () {
    this.timeout(7500);
    var gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        GraphChecker = testFixture.requirejs('deepforge/GraphChecker'),
        TEST_CASE_DIR = path.join(__dirname, '..', '..', 'test-cases', 'code'),
        YAML_DIR = path.join(__dirname, '..', '..', 'test-cases', 'models'),
        expect = testFixture.expect,
        logger = testFixture.logger.fork('ImportTorch'),
        PluginCliManager = testFixture.WebGME.PluginCliManager,
        BlobClient = require('webgme/src/server/middleware/blob/BlobClientWithFSBackend'),
        blobClient = new BlobClient(gmeConfig, logger),
        projectName = 'testProject',
        pluginName = 'ImportTorch',
        checker,
        core,
        project,
        gmeAuth,
        storage,
        commitHash;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                // This uses in memory storage. Use testFixture.getMongoStorage to persist test to database.
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                var importParam = {
                    projectSeed: testFixture.path.join(BASE_DIR, 'devTests', 'devTests.webgmex'),
                    projectName: projectName,
                    branchName: 'master',
                    logger: logger,
                    gmeConfig: gmeConfig
                };

                return testFixture.importProject(storage, importParam);
            })
            .then(function (importResult) {
                project = importResult.project;
                commitHash = importResult.commitHash;
                core = importResult.core;
                checker = new GraphChecker({
                    core: core,
                    ignore: {
                        attributes: ['ctor_arg_order']
                    }
                });
                return project.createBranch('test', commitHash);
            })
            .then(function () {
                return project.getBranchHash('test');
            })
            .nodeify(done);
    });

    after(function (done) {
        storage.closeDatabase()
            .then(function () {
                return gmeAuth.unload();
            })
            .nodeify(done);
    });

    it('should require Torch code', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            pluginConfig = {
            },
            context = {
                project: project,
                namespace: 'nn',
                commitHash: commitHash,
                branchName: 'test',
                activeNode: ''
            };

        manager.executePlugin(pluginName, pluginConfig, context, function (err, pluginResult) {
            expect(err).to.equal('Torch code not provided.');
            expect(pluginResult.success).to.equal(false);

            done();
        });
    });

    var runTest = function(name, done) {
        var data = fs.readFileSync(path.join(TEST_CASE_DIR, name), 'utf8'),
            ymlFile = path.join(YAML_DIR, name.replace(/lua$/, 'yml')),
            yml = fs.readFileSync(ymlFile, 'utf8');

        importTorch(name, data)
            // Use the check-model object to check the result models!
            .then(groups => {
                var children = groups[1],
                    initModels = groups[0],
                    newModel = children.find(model => 
                    initModels.indexOf(core.getPath(model)) === -1);

                expect(initModels.length+1).to.equal(children.length);
                expect(!!newModel).to.equal(true);  // found the new model
                return core.loadChildren(newModel);
            })
            .then(children => {
                // Retrieve the id of the newly generated node
                // wrong solution!!!
                var map = checker.gme(children).map.to.yaml(yml);

                expect(!!map).to.equal(true);
            })
            .fail(err => {
                throw err;
            })
            .nodeify(done);
    };

    var importTorch = function(name, code) {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            pluginConfig = {},
            context = {
                namespace: 'nn',
                project: project,
                branchName: 'test',
                activeNode: ''
            },
            initModels;

        // Load the children from the head of the 'test' branch
        return project.getBranchHash('test')
            .then(function (branchHash) {
                return Q.ninvoke(project, 'loadObject', branchHash);
            })
            .then(function (commitObject) {
                return Q.ninvoke(core, 'loadRoot', commitObject.root);
            })
            .then(function (root) {
                return core.loadChildren(root);
            })
            .then(children => {
                initModels = children.map(core.getPath);
                return blobClient.putFile(name, code);  // upload the file
            })
            .then(hash => {
                pluginConfig.srcHash = hash;
                return Q.nfcall(
                    manager.executePlugin.bind(manager),
                    pluginName,
                    pluginConfig,
                    context
                );
            })
            .then(pluginResult => {
                expect(typeof pluginResult).to.equal('object');
                expect(pluginResult.success).to.equal(true);
                return project.getBranchHash('test');
            })
            .then(function (branchHash) {
                return Q.ninvoke(project, 'loadObject', branchHash);
            })
            .then(function (commitObject) {
                return Q.ninvoke(core, 'loadRoot', commitObject.root);
            })
            .then(root => core.loadChildren(root))
            .then(children => [initModels, children]);
    };

    describe('run test cases', function() {
        var cases = fs.readdirSync(TEST_CASE_DIR)
                .filter(name => path.extname(name) === '.lua')
                // Skipping/only-ing tests
                .filter(name => SKIP_TESTS.indexOf(name) === -1)
                .filter(name => !ONLY_TESTS.length || ONLY_TESTS.indexOf(name) > -1);

        // one test for each test name
        cases.forEach(name => it(`should run test "${name}"`, runTest.bind(this, name)));
    });

    it('should support "require \'rnn\'"', function(done) {
        importTorch('test', 'require \'nn\'\nrequire \'rnn\'')
            .nodeify(done);
    });

    it('should not need require \'nn\'', function(done) {
        importTorch('test', 'nn.Sequential():add(nn.Linear(100, 50))')
            .nodeify(done);
    });
});
