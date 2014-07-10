var Support = require('./helper.js');
var jobs = Support.requireSequelizeJobs();

var expect = Support.expect,
  sinon = Support.sinon;

describe('job-model', function() {
  describe('initialization', function() {
    it('should be stored in db', function(done) {
      var promise = jobs.createJob();

      promise
      .success(function() {
        done();
      })
      .error(function(err) {
        done(err);
      });
    });
  });

  describe('#reserve', function() {
    beforeEach(Support.truncateJobTable(jobs));

    describe('with unknown sql dialect', function() {
      it('should find a job and lock it', function(done) {
        var promise = jobs.createJob();

        var dialect = sinon.stub().returns('unknown');

        jobs.db.getDialect = dialect;

        promise
        .success(function(job) {
          var worker = jobs.createWorker();

          // try to reserver job
          jobs.jobModel.reserve(worker)
          .success(function(lockedJob) {
            expect(lockedJob.id).to.eq(job.id);
            done()
          })
          .error(function(err) { done(err) });
        })
        .error(function(err) { done(err) });
      });
    });

    it('should find a job and lock it', function(done) {
      var promise = jobs.createJob();

      promise
      .success(function(job) {
        var worker = jobs.createWorker();

        jobs.jobModel.reserve(worker)
        .success(function(lockedJob) {
          expect(lockedJob.id).to.eq(job.id);
          done()
        })
        .error(function(err) { done(err) });
      })
      .error(function(err) { done(err) });
    });

    it('should lock job with higher priority', function(done) {
      jobs.createJob('default', null, { priority: 10})
      .success(function(lowJob) {

        jobs.createJob('default', null, { priority: 20})
        .success(function(highJob) {

          var worker = jobs.createWorker();

          jobs.jobModel.reserve(worker)
          .success(function(lockedJob) {
            expect(lockedJob.id).to.eq(highJob.id);
            done()
          })
        })
        .error(function(err) { done(err) });
      })
      .error(function(err) { done(err) });
    });

    it('should find no job if queue differs', function(done) {
      var promise = jobs.createJob('handler', null, {
        queue: 'not_default',
      });

      promise
      .success(function(job) {
        var worker = jobs.createWorker();

        // try to reserver job
        jobs.jobModel.reserve(worker)
        .success(function(job) {
          done(new Error("should not find job, but got: " + JSON.stringify(job)));
        })
        .error(function(err) { done() });

      })
      .error(function(err) { done(err) });
    });

    it('should find no job to lock', function(done) {
      var worker = jobs.createWorker();

      jobs.jobModel.reserve(worker)
      .success(function(job) {
        done(new Error("should not find job, but got: " + JSON.stringify(job)));
      })
      .error(function(err) { done() });
    });
  });

  describe('#data (setter)', function() {
    describe('with string', function() {
      var testData = 'blibibibi';

      it('using build, should not cast data to json', function(done) {
        var model = jobs.jobModel.build({
          data: testData
        });

        expect(model.data).to.be.a('string');
        expect(model.data).to.eq(testData);

        done()
      });

      it('using setter, should not cast data to json', function(done) {
        var model = jobs.jobModel.build({});

        model.set('data', testData);

        expect(model.data).to.be.a('string');
        expect(model.data).to.eq(testData);

        done()
      });
    });

    describe('with object', function() {
      var testData = { test: 'value' };

      it('using setter, should not cast data to json', function(done) {
        jobs.createJob('default', testData).success(function(res) {
          jobs.jobModel.find(res.id).success(function(model) {
            var data = model.get('data');

            expect(data).to.be.an('object');
            expect(data.test).to.be.a('string');

            data = model.data;

            expect(data).to.be.an('object');
            expect(data.test).to.be.a('string');

            done()
          });
        });
      });
    });
  });

  describe('#reschedule', function() {
    it('should set a date in the future', function(done) {
      var now = new Date();

      var difference = function(date) {
        return Support.moment
          .duration(date - now).seconds();
      }

      jobs.createJob().success(function(job) {
        // check initial timestamp
        expect(job.runAt).to.equalTime(now);

        job._reschedule();

        expect(job.runAt).to.be.afterTime(now);
        expect(difference(job.runAt)).to.eq(5 + 1); // seconds

        job._reschedule();

        expect(job.runAt).to.be.afterTime(now);
        expect(difference(job.runAt)).to.eq(5 + 16); // seconds

        done();
      });
    });
  });
});
