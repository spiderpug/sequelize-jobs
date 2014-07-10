var Sequelize = require('sequelize'),
  path = require('path'),
  chai = require('chai'),
  sinon = require('sinon'),
  moment = require('moment'),
  expect = chai.expect;

chai.use(require('chai-datetime'));

var url = 'sqlite://' + path.join(__dirname, '..', 'tmp', 'db.sqlite');

var Support = {
  chai: chai,

  sinon: sinon,

  expect: expect,

  moment: moment,

  Sequelize: Sequelize,

  requireSequelizeJobs: function(options) {
    var db = this.createInstance();

    return require(path.join(__dirname, '..', 'lib', 'sequelize-jobs'))
      (db, Sequelize, options);
  },

  createInstance: function() {
    var sequelize = new Sequelize(url, {
      dialect: 'sqlite',
      logging: false,
    });

    this.clearDatabase(sequelize);

    return sequelize;
  },

  truncateJobTable: function(Jobs) {
    return function(done) {
      Jobs.jobModel.destroy({}, {truncate: true})
      .success(function() { done() })
      .error(function(err) { done(err) });
    }
  },

  clearDatabase: function(sequelize) {
    return sequelize
      .getQueryInterface()
      .dropAllTables()
      .then(function() {
        sequelize.daoFactoryManager.daos = [];
        return sequelize
          .getQueryInterface()
          .dropAllEnums()
          .error(function (err) {
            console.log('Error in support.clearDatabase() dropAllEnums() :: ', err);
          });
      })
      .error(function(err) {
        console.log('Error in support.clearDatabase() dropAllTables() :: ', err);
      });
  }
};

module.exports = Support;