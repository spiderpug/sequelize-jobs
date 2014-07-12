var events = require('events'),
  os = require('os'),
  utils = require('./utils');

var _defaultWorkerOptions = {
  queue: 'default',
};

module.exports = function(Jobs) {

  var Worker = (function() {
    function Worker(Jobs, options) {
      this.Jobs = Jobs;
      this._ = Jobs._;

      this.shouldStop = false;
      this.id = this._.uniqueId([
        os.hostname(),
        process.pid,
        "worker-"
      ].join('-'));
      this.options = this._.extend({}, _defaultWorkerOptions, options);
      this.eventEmitter = new events.EventEmitter();
    }

    Worker.prototype.clearLocks = function() {
      return this.Jobs.jobModel.update({
        lockedBy: null,
        lockedAt: null,
      }, { lockedBy: this.id });
    };

    Worker.prototype.shouldProcess = function() {
      return this.shouldStop === false;
    };

    Worker.prototype.processWrapper = function(processor) {
      var self = this;

      return function(resumeCallback) {
        self.reserveAndProcess(processor, resumeCallback);
      };
    };

    Worker.prototype.reserveAndProcess = function(processor, resumeCallback) {
      var jobPromise = this.Jobs.jobModel.reserve(this);
      var self = this;

      jobPromise.success(function(jobRecord) {
        var jobHandled = function(err) {
          var promise = null;

          if (err) {
            promise = jobRecord._handleFailed(err);
          } else {
            promise = jobRecord._completed();
          }

          promise.then(function() {
            resumeCallback();
          });
        };

        try {
          processor(jobRecord, jobHandled);
        } catch(err) {
          jobRecord._handleFailed(err);

          resumeCallback();
        }

      }).error(function(err) {
        if (err instanceof Jobs.NoMoreJobsError) {
          self.eventEmitter.emit('drain');

          // wait for some time and try to find next job
          setTimeout(resumeCallback, 5000);
        } else {
          resumeCallback(err);
        }
      });
    };

    Worker.prototype.onError = function(err) {
      this.stop(err);
    };

    Worker.prototype.stop = function(err) {
      this.shouldStop = true;

      this.eventEmitter.emit('stop', err);

      return this.clearLocks();
    };

    Worker.prototype.start = function(processor) {
      var self = this;

      this.shouldStop = false;

      this.eventEmitter.emit('start');

      utils.whilst(
        function() { return self.shouldProcess(); },
        self.processWrapper(processor),
        function(err) { self.onError(err); }
      );

      return self;
    };

    return Worker;
  })();

  return Worker;
};