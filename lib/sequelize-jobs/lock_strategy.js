var strategy = {};

var lockUpdateData = function(req) {
  return {
    lockedAt: req.now,
    lockedBy: req.worker.id,
  };
};

strategy._lockSingleRow = function(req, id) {
  var condition = req.Jobs.Sequelize.and(
    req.condition,
    {
      id: id,
    }
  );

  return req.model.update(lockUpdateData(req), condition);
};

strategy.mysql = function(req) {
  // FIXME: Support orderby priority.
  req.model.update(lockUpdateData(req), req.condition, {
    limit: 1,
  })
  .proxy(req.promise, { events: ['error'] })
  .success(function(result) {
    if (result >= 1) {
      // try to find locked job
      req.model.find({
        where: {
          lockedAt: req.now,
          lockedBy: req.worker.id,
          failedAt: null
        },
        order: [['priority', 'DESC']],
      }).proxy(req.promise, { events: ['error', 'success']});
    } else {
      req.promise.emit('error', new req.Jobs.NoMoreJobsError());
    }
  });
};

strategy.sqlite = function(req) {
  req.model.find({
    where: req.condition,
    limit: 1,
    order: [['priority', 'DESC']],
  }).proxy(req.promise, { events: ['error'] })
  .success(function(row) {
    if (!row) {
      return req.promise.emit('error', new req.Jobs.NoMoreJobsError());
    }

    strategy._lockSingleRow(req, row.id)
    .proxy(req.promise, { events: ['error'] })
    .success(function() {
      req.promise.emit('success', row);
    });
  });
};

strategy.default = strategy.sqlite;

module.exports = strategy;
