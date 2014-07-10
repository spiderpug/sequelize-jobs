var Support = require('./helper.js');

var expect = Support.expect,
  sinon = Support.sinon;

var jobs = Support.requireSequelizeJobs();

describe('job-worker', function() {
  this.timeout(500);

  describe('initialization', function() {
    it('should return object', function(done) {
      var worker = jobs.createWorker();

      expect(worker).to.be.object

      done();
    });
  });

  describe('#start', function() {
    var testCounterProcessor = function(testDone, worker, count) {
      var counter = 0;

      return function(job, done) {
        // simulate job here...
        done();

        counter += 1;

        if (counter == count) {
          worker.stop().success(function() {
            testDone();
          });
        }
      };
    };

    var testCounterFailProcessor = function(testDone, worker, count) {
      var counter = 0;

      return function(job, done) {
        var err = new Error(counter.toString());
        done(err);

        counter += 1;

        if (counter == count) {
          worker.stop().success(function() {
            expect(counter).to.eq(jobs.options.maxAttempts);
            testDone();
          });
        }
      };
    };

    var testExceptionProcessor = function(testDone, worker) {
      return function(job, done) {
        throw new Error('');
      };
    };

    afterEach(function(done) {
      jobs.db.options.logging = false;

      Support.truncateJobTable(jobs)(done);
    });

    it('should process job', function(done) {
      var worker = jobs.createWorker();
      var promise = jobs.createJob();

      jobs.createJob();
      jobs.createJob();

      promise
      .success(function() {
        // start worker, wait for 3 jobs to be processed
        worker.start(testCounterProcessor(done, worker, 3));
      })
      .error(function(err) {
        done(err);
      });
    });

    it('should process jobs of multiple queues', function(done) {
      var worker = jobs.createWorker({
        queue: ['test-1', 'test-2', 'test-3']
      });

      jobs.createJob('handler', null, { queue: 'test-1' });
      jobs.createJob('handler', null, { queue: 'test-2' });

      var promise =
      jobs.createJob('handler', null, { queue: 'test-3' });

      worker.eventEmitter.once('drain', function() {
        done(new Error('should not drain.'));
      });

      promise
      .success(function() {
        // start worker, wait for 3 jobs to be processed
        worker.start(testCounterProcessor(done, worker, 3));
      })
      .error(function(err) {
        done(err);
      });
    });

    it('should process jobs even if passed queue is undefined', function(done) {
      var worker = jobs.createWorker({
        queue: undefined
      });

      var promise = jobs.createJob('handler', null, { queue: 'test-3' });

      worker.eventEmitter.once('drain', function() {
        done(new Error('should not drain.'));
      });

      promise
      .success(function() {
        // start worker, wait for 3 jobs to be processed
        worker.start(testCounterProcessor(done, worker, 1));
      })
      .error(function(err) {
        done(err);
      });
    });

    it('should receive parsed data', function(done) {
      var worker = jobs.createWorker();
      var promise = jobs.createJob('default', { message: 'hello' });

      promise
      .success(function() {
        // start worker, wait for 3 jobs to be processed
        worker.start(function(job, jobDone) {

          jobDone(new Error('dd'));

          // change scope so that job does not catch expectations
          setImmediate(function() {
            var data = job.get('data');

            expect(data).to.be.an('object');
            expect(data.message).to.eq('hello');

            expect(job.data).to.be.an('object');
            expect(job.data.message).to.eq('hello');

            worker.stop().success(function() {
              done();
            });
          })
        });
      })
      .error(function(err) {
        done(err);
      });
    });

    it('should process job after fail', function(done) {
      var worker = jobs.createWorker();
      var promise = jobs.createJob();

      // fake _unlock to reset runAt date (consider test timeout)
      var oldUnlock = jobs.jobModel.DAO.prototype._unlock;

      jobs.jobModel.DAO.prototype._unlock = function() {
        oldUnlock.call(this);
        this.runAt = new Date();
      }

      promise
      .success(function(job) {
        worker.start(
          testCounterFailProcessor(done, worker, jobs.options.maxAttempts)
        );
      })
      .error(function(err) {
        done(err);
      });
    });

    it('should not stop after processor exception', function(done) {
      var worker = jobs.createWorker();
      var promise = jobs.createJob();

      promise
      .success(function() {
        worker.eventEmitter.once('drain', function() {
          worker.stop().success(function() {
            done();
          });
        });

        worker.start(
          testExceptionProcessor(done, worker)
        );
      })
      .error(function(err) {
        done(err);
      });
    });

    it('should stop after database exception', function(done) {
      var worker = jobs.createWorker();

      var promise = new jobs.Sequelize.Utils.CustomEventEmitter(function(emitter) {
        emitter.emit('error', 'sql error');
      });

      worker.Jobs.jobModel.reserve = function() {
        return promise.run();
      };

      worker.eventEmitter.once('stop', function(err) {
        worker.stop().success(function() {
          expect(err).to.be.exist;

          done();
        });
      });

      worker.start(function(job, done) {
        done('should not have processed a job');
      });
    });
  });
});
