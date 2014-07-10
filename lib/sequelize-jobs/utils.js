var Utils = {};

// duplicate of async.whilst
Utils.whilst = function (test, iterator, callback) {
  if (test()) {
    iterator(function (err) {
      if (err) {
        return callback(err);
      }

      Utils.whilst(test, iterator, callback);
    });
  } else {
    callback();
  }
};

module.exports = Utils;