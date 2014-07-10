Sequelize-Jobs
==============
Sequelize-Jobs is inspired by Ruby's DelayedJob and allows processing of longer tasks in the background.

Installation
============
Sequelize-Jobs supports Sequelize 1.7.x.

As Sequelize supports multiple backends for storing the job queue, Sequelize-Jobs simply uses the defined backend.

    $ npm install sequelize-jobs


```javascript
var Sequelize = require('sequelize');

// create database as usual
var db = new Sequelize(
  "database",
  "username",
  "password",
  {}
);

// configure Sequelize-Jobs
var options = {
  maxAttempts: 1
};

SequelizeJobs = require('sequelize-jobs')(db, Sequelize, options);
```

Queuing Jobs
============
Call `createJob` on the `SequelizeJobs` object and pass the following parameters:

```javascript
SequelizeJobs.createJob('helloHandler', { message: "hello world" }, options);
```

Available options are:

- `queue`: the queue to put the job in (default: `default`)
- `priority`: priority of the job (higher numbers first, default: `0`)
- `runAt`: `Date` object to set the date at which the job is processed. (default: `NOW`)

Processing Jobs
===============
Create a worker and start processing:

```javascript
var worker = SequelizeJobs.createWorker();

var myJobProcessor = function(job, done) {
  // you may use job.handler to decide which class should process it

  var myHelloHandler = function(job, done) {
    console.log("myHelloHandler says", job.data.message);
  };

  switch (job.handler) {
    case 'helloHandler':
      return myHelloHandler(job, done);

    default:
      done()
  }
};

worker.start(myJobProcessor);
```

On failure, the job is scheduled again in 5 seconds + N ** 4, where N is the number of retries.

Named Queues
============
There is also support for named queues. The goal is to provide a system for grouping tasks to be worked by separate pools of workers, which may be scaled and controlled individually. The default queue name is `default`.

Jobs can be assigned to a queue by setting the `queue` option:

```javascript
SequelizeJobs.createJob('mailHandler', { data: 'here' }, { queue: 'mailing' });
```

Jobs will be processed by a worker of their queue only. You may pass the queue name to the worker as well:

```javascript
var mailingWorker = SequelizeJobs.createWorker({ queue: 'mailing' });
var multiQueueWorker = SequelizeJobs.createWorker({ queue: ['mailing', 'default'] });
```

License
=======
Copyright (c) 2014 Robert Wachs <github@robert-wachs.de>

sequelize-jobs is released under the LGPLv3 license (see LICENSE).