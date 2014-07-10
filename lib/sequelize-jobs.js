var Job = require('./sequelize-jobs/job_model');
var Worker = require('./sequelize-jobs/worker');

var util = require('util');

var NoMoreJobsError = function (msg) {
  NoMoreJobsError.super_.apply(this, arguments);
};

util.inherits(NoMoreJobsError, Error);

var SequelizeJobs = (function() {
  var _defaultOptions = {
    maxAttempts: 4,
  };

  var _defaultJobOptions = {
    priority: 0,
    handler: 'default',
    queue: 'default',
  };

  // Once 2.0 is final, we can get rid of sequelize param and use
  // this instead: https://github.com/sequelize/sequelize/pull/911
  function SequelizeJobs(db, sequelize, options) {
    this.db = db;
    this.Sequelize = sequelize;
    this._ = sequelize.Utils._;
    this.options = this._.extend({}, _defaultOptions, options);

    this.jobModel = Job(this);
    this.worker = Worker(this);
  }

  SequelizeJobs.prototype.NoMoreJobsError = NoMoreJobsError;

  SequelizeJobs.prototype.createJob = function(handler, _data, _options) {
    var options = this._.extend({
      data: _data,
      runAt: new Date(),
    }, _defaultJobOptions, _options);

    if (handler) options.handler = handler;

    return this.jobModel.create(options);
  };

  SequelizeJobs.prototype.createWorker = function(options) {
    return new this.worker(this, options);
  };

  return SequelizeJobs;
})();


module.exports = function(db, options) {
  return new SequelizeJobs(db, options);
};