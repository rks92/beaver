/*
 * MongoosePlugin.js
 *
 * Unit tests focused on the Mongoose Plugin for beaver.
 *
 */

var beaver = require('../lib/lib'),
    assert = require('assert'),
    async = require('async'),
    fs = require('fs'),
    Schema = require('mongoose').Schema,
    mongoose = require('mongoose'),
    path = require('path');


var globalTimeout = 30000;
var testPollingInterval = 100;

describe("MongoosePlugin", function ()
{
    var registry;

    before(function ()
    {
        if (mongoose.connection.readyState == 0)
        {
            var connection = mongoose.connect("mongodb://localhost/worker_tests");
            registry = new beaver.Registry({defaultTimeout: null});
            beaver.MongoosePlugin.initialize(connection, {registry: registry, createMongoJobs: true, mongoJobAutoDeleteTime: 1000});
        }
    });

    this.timeout(globalTimeout);
    it("should execute a Mongoose plugin based task", function (done)
    {
        // Create an in-memory queue - easiest for testing with
        var queue = new beaver.MemoryQueue(registry, {});

        // Initialize the queue and setup the worker
        queue.initialize(function (err)
        {
            // Create a worker and attach it to the queue
            var worker = new beaver.Worker(queue, {});

            queue.registerWorker(worker, function (err)
            {
                var TestTaskSchema = new Schema({
                    testVar: String,
                    state:   String
                });

                TestTaskSchema.plugin(beaver.MongoosePlugin.plugin, {
                    queue: queue,
                    model: "TestTask"
                });

                TestTaskSchema.task("test_task", {filter: {state: 'queued'}}, function (testObj, callback)
                {
                    assert.equal(testObj.testVar, "blah");

                    testObj.state = "finished";
                    testObj.save(function(err)
                    {
                        callback();
                        done();
                    });
                });

                var TestTask = mongoose.model('TestTask', TestTaskSchema);

                // Remove any previous TestTasks
                TestTask.remove({}, function (err)
                {
                    var task = new TestTask({
                        testVar: "blah",
                        state:   "queued"
                    });

                    task.save(function (err)
                    {

                    });
                });
            });
        });
    });


    it("should allow one to use a function to create the task query", function (done)
    {
        var registry = new beaver.Registry({defaultTimeout: null});

        // Create an in-memory queue - easiest for testing with
        var queue = new beaver.MemoryQueue(registry, {});

        // Initialize the queue and setup the worker
        queue.initialize(function (err)
        {
            // Create a worker and attach it to the queue
            var worker = new beaver.Worker(queue, {});

            queue.registerWorker(worker, function (err)
            {
                var FunctionQueryTestTaskSchema = new Schema({
                    testVar: String,
                    state:   String
                });

                FunctionQueryTestTaskSchema.plugin(beaver.MongoosePlugin.plugin, {
                    queue: queue,
                    model: "FunctionQueryTestTask"
                });

                FunctionQueryTestTaskSchema.task("FunctionQueryTest", {
                    filter: function ()
                    {
                        return {state: 'queued'};
                    }
                }, function (taskObj, callback)
                {
                    assert.equal(taskObj.testVar, "blah");

                    callback();
                    done();
                });

                var FunctionQueryTestTask = mongoose.model('FunctionQueryTestTask', FunctionQueryTestTaskSchema);

                // Remove any previous FunctionQueryTestTask
                FunctionQueryTestTask.remove({}, function (err)
                {
                    var task = new FunctionQueryTestTask({
                        testVar: "blah",
                        state:   "queued"
                    });

                    task.save(function (err)
                    {

                    });
                });
            });
        });
    });


    it("should correctly execute a multi-step sequence of tasks (just a more complicated scenario)", function (done)
    {
        var registry = new beaver.Registry({defaultTimeout: null});

        // Create an in-memory queue - easiest for testing with
        var queue = new beaver.MemoryQueue(registry, {});

        // Initialize the queue and setup the worker
        queue.initialize(function (err)
        {
            // Create a worker and attach it to the queue
            var worker = new beaver.Worker(queue, {});

            queue.registerWorker(worker, function (err)
            {
                var MultiStepTestTaskSchema = new Schema({
                    testVar: String,
                    state:   String
                });

                MultiStepTestTaskSchema.plugin(beaver.MongoosePlugin.plugin, {
                    queue: queue,
                    model: "MultiStepTestTask"

                });

                MultiStepTestTaskSchema.task("multi_step_task_step_1", {filter: {state: 'queued'}}, function (taskObj, callback)
                {
                    assert.equal(taskObj.testVar, "awesome");

                    taskObj.state = 'processing';
                    taskObj.testVar = 'sauce';
                    taskObj.save(function (err)
                    {
                        if (err)
                        {
                            return done(err);
                        }
                        callback();
                    });
                });


                MultiStepTestTaskSchema.task("multi_step_task_step_2", {filter: {state: 'processing'}}, function (taskObj, callback)
                {
                    assert.equal(taskObj.testVar, "sauce");

                    taskObj.state = 'almost_complete';
                    taskObj.testVar = 'is';
                    taskObj.save(function (err)
                    {
                        if (err)
                        {
                            return done(err);
                        }
                        callback();
                    });
                });


                MultiStepTestTaskSchema.task("multi_step_task_step_3", {filter: {state: 'almost_complete'}}, function (taskObj, callback)
                {
                    assert.equal(taskObj.testVar, "is");

                    taskObj.state = 'finished';
                    taskObj.testVar = 'your mom!';
                    taskObj.save(function (err)
                    {
                        if (err)
                        {
                            return done(err);
                        }
                        callback();
                    });
                });


                MultiStepTestTaskSchema.task("multi_step_task_step_4", {filter: {state: 'finished'}}, function (taskObj, callback)
                {
                    assert.equal(taskObj.testVar, "your mom!");
                    callback();
                    done();
                });


                var MultiStepTestTask = mongoose.model('MultiStepTestTask', MultiStepTestTaskSchema);

                // Remove any previous MultiStepTestTask
                MultiStepTestTask.remove({}, function (err)
                {
                    var task = new MultiStepTestTask({
                        testVar: "awesome",
                        state:   "queued"
                    });

                    task.save(function (err)
                    {

                    });
                });
            });
        });
    });

    it("shouldn't execute more then one task at a time if there is only a single beaver.", function (done)
    {
        var registry = new beaver.Registry({defaultTimeout: null});

        // Create an in-memory queue - easiest for testing with
        var queue = new beaver.MemoryQueue(registry, {});

        // Initialize the queue and setup the worker
        queue.initialize(function (err)
        {
            // Create a worker and attach it to the queue
            var worker1 = new beaver.Worker(queue, {});

            queue.registerWorker(worker1, function (err)
            {
                var QueueingTestTaskSchema = new Schema({
                    taskName: String,
                    state:    String
                });

                var QueueingTestTask;

                QueueingTestTaskSchema.plugin(beaver.MongoosePlugin.plugin, {
                    queue: queue,
                    model: "QueueingTestTask"
                });

                var numberExecuting = 0;

                function saveTaskAndCheckCount (taskObj, callback)
                {
                    numberExecuting += 1;
                    // Wait 100ms. If the code is broken, other tasks may slide in and execute while
                    // this timeout is waiting to execute.
                    setTimeout(function ()
                    {
                        taskObj.save(function (err)
                        {
                            if (err)
                            {
                                return done(err);
                            }

                            setTimeout(function ()
                            {
                                assert.equal(numberExecuting, 1);
                                numberExecuting -= 1;
                                return callback();
                            }, 100);
                        });
                    }, 100);
                }

                QueueingTestTaskSchema.task("queueing_test_task_step_1", {filter: {state: 'queued'}}, function (taskObj, callback)
                {
                    taskObj.state = 'processing';
                    saveTaskAndCheckCount(taskObj, callback);
                });


                QueueingTestTaskSchema.task("queueing_test_task_step_2", {filter: {state: 'processing'}}, function (taskObj, callback)
                {
                    taskObj.state = 'another';
                    saveTaskAndCheckCount(taskObj, callback);
                });


                var numberCompleted = 0;

                QueueingTestTaskSchema.task("queueing_test_task_step_3", {filter: {state: 'another'}}, function (taskObj, callback)
                {
                    taskObj.state = "finished";
                    taskObj.save(function (err)
                    {
                        numberCompleted += 1;

                        callback();

                        if (numberCompleted == 5)
                        {
                            done();
                        }
                    });
                });


                QueueingTestTask = mongoose.model('QueueingTestTask', QueueingTestTaskSchema);

                // Remove any previous MultiStepTestTask
                QueueingTestTask.remove({}, function (err)
                {
                    if (err)
                    {
                        return done(err);
                    }

                    async.times(5, function (n, callback)
                        {
                            var task = new QueueingTestTask({
                                taskName: "task-" + n.toString(),
                                state:    "queued"
                            });

                            task.save(callback);
                        },
                        function (err)
                        {
                            if (err)
                            {
                                return done(err);
                            }

                        });
                });
            });
        });
    });


    it("should create job objects in the Mongo database that allow persisting log information about the progress of certain jobs", function (done)
    {
        // Create an in-memory queue - easiest for testing with
        var queue = new beaver.MemoryQueue(registry, {});

        // Initialize the queue and setup the worker
        queue.initialize(function (err)
        {
            // Create a worker and attach it to the queue
            var worker = new beaver.Worker(queue, {});

            queue.registerWorker(worker, function (err)
            {
                var JobObjectTestSchema = new Schema({
                    testVar: String,
                    state:   String
                });

                JobObjectTestSchema.plugin(beaver.MongoosePlugin.plugin, {
                    queue: queue,
                    model: "JobObjectTest"
                });

                JobObjectTestSchema.task("job_object_test", {filter: {state: 'queued'}}, function (testObj, callback)
                {
                    var task = this;

                    // Check to see if there is metadata for the job object stored with the task
                    assert(task.metadata.jobId);

                    testObj.state = "finished";
                    testObj.save(function(err)
                    {
                        task.updatePercentageComplete(50, function (err)
                        {
                            if (err)
                            {
                                return done(err);
                            }
                            else
                            {
                                task.log("This is an awesome log message", function (err)
                                {
                                    if (err)
                                    {
                                        return done(err);
                                    }
                                    else
                                    {
                                        // Verify that there is a job object in the database for this task.
                                        beaver.MongoosePlugin.getJobModel().findById(task.metadata.jobId).exec(function (err, job)
                                        {
                                            if (err)
                                            {
                                                return done(err);
                                            }
                                            else
                                            {
                                                assert(job);

                                                assert.deepEqual(job.name, task.name);
                                                assert.deepEqual(job.parameters, task.parameters);
                                                assert(job.history.indexOf("This is an awesome log message") != -1);
                                                assert.deepEqual(job.percentageComplete, 50);
                                                // Make sure that hostname is filled in
                                                assert(job.hostname);
                                                // Make sure that the PID is the same as the current process PID
                                                assert.equal(job.pid, process.pid);

                                                callback();
                                                done();
                                            }
                                        })
                                    }
                                });
                            }
                        });
                    });
                });

                var JobObjectTest = mongoose.model('JobObjectTest', JobObjectTestSchema);

                // Remove any previous TestTasks
                JobObjectTest.remove({}, function (err)
                {
                    var task = new JobObjectTest({
                        testVar: "blah",
                        state:   "queued"
                    });

                    task.save(function (err)
                    {

                    });
                });
            });
        });
    });


    it("job objects created in the database should store all results that have been produced by a task.", function (done)
    {
        // Create an in-memory queue - easiest for testing with
        var queue = new beaver.MemoryQueue(registry, {});

        var testResult = {link: "www.iamawesome.com"};

        // Register a task
        registry.registerTask({
            name: "results_stored_on_job_object_test",
            func: function (parameters, callback)
            {
                var task = this;

                // Check to see if there is metadata for the job object stored with the task
                assert(task.metadata.jobId);

                // Trigger the hook
                task.addResult(testResult, function (err)
                {
                    if (err)
                    {
                        return done(err);
                    }
                    else
                    {
                        // Verify that there is a job object in the database for this task.
                        beaver.MongoosePlugin.getJobModel().findById(task.metadata.jobId).exec(function (err, job)
                        {
                            if (err)
                            {
                                return done(err);
                            }
                            else
                            {
                                assert(job);

                                assert.deepEqual(job.results[0], testResult);

                                callback();
                                done();
                            }
                        });
                    }
                });
            }
        });

        // Initialize the queue and setup the worker
        queue.initialize(function (err)
        {
            // Create a worker and attach it to the queue
            var worker = new beaver.Worker(queue, {});

            queue.registerWorker(worker, function (err)
            {
                if (err)
                {
                    return done(err);
                }
                else
                {
                    // Queue the task a few times. Since only one task can execute at a time for this worker, we should see a few consecutive timeouts.
                    queue.queueTask("results_stored_on_job_object_test", {});
                }
            });
        });
    });

    it("should save any metadata to the job object", function (done)
    {
        var Job;
        // Create an in-memory queue - easiest for testing with
        var queue = new beaver.MemoryQueue(registry, {});

        var checkForMetadataInJob = function (task, name, value, next)
        {
            Job.findOne({_id: task.metadata.jobId}, function (err, job)
            {
                assert.ifError(err, 'find job by task id error');
                assert(job, 'find job by id');
                assert(job.metadata, 'job has metadata');
                assert.equal(job.metadata[name], value, 'job meta data has expected value');
                next(err);
            });
        };

        // Register a task
        registry.registerTask({
            name: "metadata_stored_on_job_object_test",
            func: function (parameters, callback)
            {
                var task = this;

                // Check to see if there is metadata for the job object stored with the task
                assert(task.metadata.jobId, 'task has job id');

                task.addMetadata('no callback', 'works');

                async.series([
                    task.addMetadata.bind(task, 'with callback', 'also works'),
                    checkForMetadataInJob.bind(null, task, 'no callback', 'works'),
                    checkForMetadataInJob.bind(null, task, 'with callback', 'also works'),

                    task.addMetadata.bind(task, 'more data', 'should not remove previous'),
                    checkForMetadataInJob.bind(null, task, 'no callback', 'works'),
                    checkForMetadataInJob.bind(null, task, 'with callback', 'also works'),
                    checkForMetadataInJob.bind(null, task, 'more data', 'should not remove previous'),

                ], function (err)
                {
                    assert.ifError(err);
                    callback(err);
                    done(err);
                });

            }
        });

        // Initialize the queue and setup the worker
        queue.initialize(function (err)
        {
            Job = beaver.MongoosePlugin.getJobModel();
            // Create a worker and attach it to the queue
            var worker = new beaver.Worker(queue, {});
            queue.registerWorker(worker, function (err)
            {
                assert.ifError(err);
                queue.queueTask("metadata_stored_on_job_object_test", {});
            });
        });

    });

    it("should make sure any redaction parameters are properly redacted from the object", function (done)
    {
        // Create an in-memory queue - easiest for testing with
        var queue = new beaver.MemoryQueue(registry, {});

        var username = "amazing_user";
        var password = "this is a great freaking password!";

        // Register a task
        registry.registerTask({
            name:             "redaction_test",
            func:             function (parameters, callback)
            {
                var task = this;

                // Check to see if there is metadata for the job object stored with the task
                assert(task.metadata.jobId);

                // Make sure the task object still provides the username & password, as it will be required
                // for the operation of this task.
                assert.equal(task.parameters.username, username);
                assert.equal(task.parameters.password, password);


                // Verify that there is a job object in the database for this task.
                beaver.MongoosePlugin.getJobModel().findById(task.metadata.jobId).exec(function (err, job)
                {
                    if (err)
                    {
                        return done(err);
                    }
                    else
                    {
                        assert(job);

                        // make sure that username is still plain, but password was correctly redacted
                        assert.equal(job.parameters.username, username);
                        assert.notEqual(job.parameters.password, password);

                        callback();
                        done();
                    }
                });
            },
            redactParameters: ['password']
        });

        // Initialize the queue and setup the worker
        queue.initialize(function (err)
        {
            // Create a worker and attach it to the queue
            var worker = new beaver.Worker(queue, {});

            queue.registerWorker(worker, function (err)
            {
                if (err)
                {
                    return done(err);
                }
                else
                {
                    // Queue the task a few times. Since only one task can execute at a time for this worker, we should see a few consecutive timeouts.
                    queue.queueTask("redaction_test", {
                        username: username,
                        password: password
                    });
                }
            });
        });
    });


    it("Can set a timeout on a Mongoose plugin based task", function (done)
    {
        // Create an in-memory queue - easiest for testing with
        var queue = new beaver.MemoryQueue(registry, {});

        // Initialize the queue and setup the worker
        queue.initialize(function (err)
        {
            // Create a worker and attach it to the queue
            var worker = new beaver.Worker(queue, {});

            var executions = 0;

            queue.registerWorker(worker, function (err)
            {
                var HungTaskSchema = new Schema({
                    testVar: String,
                    state:   String
                });

                HungTaskSchema.plugin(beaver.MongoosePlugin.plugin, {
                    queue: queue,
                    model: "HungTask"
                });

                HungTaskSchema.task("hung_task_test", {filter: {}, timeout: 500}, function (testObj, callback)
                {
                    executions += 1;
                });

                var HungTask = mongoose.model('HungTask', HungTaskSchema);

                // Remove any previous TestTasks
                HungTask.remove({}, function (err)
                {
                    // Queue a couple of task objects. Since only one task can execute at a time for this worker, we should see a few consecutive timeouts.
                    var hungTask1 = new HungTask({});
                    hungTask1.save(function (err)
                    {
                    });

                    var hungTask2 = new HungTask({});
                    hungTask2.save(function (err)
                    {
                    });

                    setTimeout(function ()
                    {
                        assert.equal(executions, 1);
                    }, 200);

                    setTimeout(function ()
                    {
                        assert.equal(executions, 2);
                        return done();
                    }, 700);

                });
            });
        });
    });


    it("Mongo job objects should have a status field that gets updated as the task progresses", function (next)
    {
        // Register a task
        registry.registerTask({
            name: "status_field_test",
            func: function (parameters, done)
            {
                var task = this;

                // Verify the job object now has a status of "running"
                beaver.MongoosePlugin.getJobModel().findById(task.metadata.jobId).exec(function (err, job)
                {
                    if (err)
                    {
                        return next(err);
                    }
                    else
                    {
                        if (job.status != 'running')
                        {
                            return next(new Error("job.status != 'running'"));
                        }
                        else
                        {
                            done();

                            // After 500ms, make sure the status field then has been set to 'completed'
                            setTimeout(function ()
                            {
                                // Verify the job object now has a status of "running"
                                beaver.MongoosePlugin.getJobModel().findById(task.metadata.jobId).exec(function (err, job)
                                {
                                    if (err)
                                    {
                                        return next(err);
                                    }
                                    else
                                    {
                                        if (job.status != 'completed')
                                        {
                                            return next(new Error("job.status != 'completed'"));
                                        }
                                        else
                                        {
                                            // Make sure the job object has a start time and end time
                                            if(!job.startTime || !job.finishTime)
                                            {
                                                return next(new Error("Job object does not have both a start time and end time"));
                                            }

                                            return next();
                                        }
                                    }
                                });
                            }, 500);
                        }
                    }
                });
            }
        });

        // Create an in-memory queue - easiest for testing with
        var queue = new beaver.MemoryQueue(registry, {});

        queue.initialize(function (err)
        {
            // Create a worker and attach it to the queue
            var worker = new beaver.Worker(queue, {});

            // Queue the task, but don't attach the worker yet. make sure the job object status is queued
            queue.queueTask("status_field_test", {}, function (err, task)
            {
                // Verify the job object has a status of "queued"
                beaver.MongoosePlugin.getJobModel().findById(task.metadata.jobId).exec(function (err, job)
                {
                    if (err)
                    {
                        return next(err);
                    }
                    else
                    {
                        if (job.status != 'queued')
                        {
                            return next(new Error("job.status != 'queued'"));
                        }

                        // Register the worker to the queue so that it will start executing tasks
                        queue.registerWorker(worker, function (err)
                        {
                            if (err)
                            {
                                return next(err);
                            }
                        });
                    }
                });
            });
        });
    });


    it("Mongo job objects should store a copy of the error if the task fails", function (next)
    {
        var errorMessage = "Awesome error";

        // Register a task
        registry.registerTask({
            name: "error_field_test",
            func: function (parameters, done)
            {
                var task = this;

                done(new Error(errorMessage));

                // After 500ms, make sure the status field then has been set to 'failed'
                setTimeout(function ()
                {
                    // Verify the job object now has a status of "running"
                    beaver.MongoosePlugin.getJobModel().findById(task.metadata.jobId).exec(function (err, job)
                    {
                        if (err)
                        {
                            return next(err);
                        }
                        else
                        {
                            if (job.status != 'failed')
                            {
                                return next(new Error("job.status != 'failed'"));
                            }
                            else
                            {
                                // Make sure the job object has a copy of the error
                                if(!job.error || !job.error.message || job.error.message.indexOf(errorMessage) == -1)
                                {
                                    return next(new Error("Error message on the job object appears to be wrong or missing"));
                                }

                                // Make sure the job object has a stacktrace. Don't try to assert what it is. That could induce a quine
                                if(!job.error || !job.error.stacktrace)
                                {
                                    return next(new Error("Error stack trace on the job object appears to be missing"));
                                }

                                // Make sure the job object has a start time and end time, even though it was an error!
                                if(!job.startTime || !job.finishTime)
                                {
                                    return next(new Error("Job object does not have both a start time and end time"));
                                }

                                return next();
                            }
                        }
                    });
                }, 500);
            }
        });

        // Create an in-memory queue - easiest for testing with
        var queue = new beaver.MemoryQueue(registry, {});

        queue.initialize(function (err)
        {
            // Create a worker and attach it to the queue
            var worker = new beaver.Worker(queue, {});

            // Register the worker to the queue so that it will start executing tasks
            queue.registerWorker(worker, function (err)
            {
                if (err)
                {
                    return next(err);
                }

                // Queue the task
                queue.queueTask("error_field_test", {});
            });
        });
    });


    it("should execute a Mongoose plugin task even if the object was changed without using the save function by scanning the db", function (done)
    {
        // Create an in-memory queue - easiest for testing with
        var queue = new beaver.MemoryQueue(registry, {});

        // Create the scheduler attached to queue
        var scheduler = new beaver.Scheduler(queue, {});

        // Initialize the queue and setup the worker
        queue.initialize(function (err)
        {
            // Create a worker and attach it to the queue
            var worker = new beaver.Worker(queue, {});

            queue.registerWorker(worker, function (err)
            {
                var DBScanTestTaskSchema = new Schema({
                    testVar: String,
                    state:   String
                });

                DBScanTestTaskSchema.plugin(beaver.MongoosePlugin.plugin, {
                    queue: queue,
                    model: "DBScanTestTask"
                });

                DBScanTestTaskSchema.task("db_scan_test", {
                    filter: {state: 'queued'},
                    dbScanInterval: 500
                }, function (testObj, callback)
                {
                    assert.equal(testObj.testVar, "blah");

                    testObj.state = "finished";
                    testObj.save(function(err)
                    {
                        callback();
                        done();
                    });
                });

                var DBScanTestTask = mongoose.model('DBScanTestTask', DBScanTestTaskSchema);

                // Remove any previous TestTasks
                DBScanTestTask.remove({}, function (err)
                {
                    var task = new DBScanTestTask({
                        testVar: "blah",
                        state:   "not_queued_bitch"
                    });

                    // Because the state is not correct, this alone should not trigger the task to be executed
                    task.save(function (err)
                    {
                        // Sometime later, we change the object
                        setTimeout(function()
                        {
                            // If we update the object in the db, it should still get picked up by DB scanning
                            DBScanTestTask.update({}, {$set: {state: "queued"}}, {multi: true}).exec(function(err, count)
                            {
                                if(err)
                                {
                                    return done(err);
                                }
                            });
                        }, 1000);

                        // Start the scheduler
                        scheduler.start();
                    });

                });
            });
        });
    });


    it("Mongo job objects should get automatically deleted when mongoJobAutoDeleteTime is set.", function (next)
    {
        this.timeout(10000*90);

        // Register a task
        registry.registerTask({
            name: "auto_delete_test",
            concurrencyPerWorker: 8,
            func: function (parameters, done)
            {
                var task = this;

                // Verify the job object now has a status of "running"
                beaver.MongoosePlugin.getJobModel().findById(task.metadata.jobId).exec(function (err, job)
                {
                    if (err)
                    {
                        return next(err);
                    }
                    else
                    {
                        // Assert that we have a job object.
                        assert(job);

                        // Call done, indicating this task is completed
                        done();

                        // Set a couple of timeouts, in 500 milliseconds we should still be able to find this job object.
                        // but sometime in the next 60 seconds, mongo should automatically delete it.
                        setTimeout(function()
                        {
                            beaver.MongoosePlugin.getJobModel().count({_id: task.metadata.jobId}).exec(function (err, count)
                            {
                                if (err)
                                {
                                    return next(err);
                                }
                                else
                                {
                                    assert.equal(count, 1);
                                }
                            });
                        }, 500);

                        setTimeout(function()
                        {
                            beaver.MongoosePlugin.getJobModel().count({_id: task.metadata.jobId}).exec(function (err, count)
                            {
                                if (err)
                                {
                                    return next(err);
                                }
                                else
                                {
                                    assert.equal(count, 0);

                                    return next();
                                }
                            });
                        }, 60000);
                    }
                });
            }
        });

        // Create an in-memory queue - easiest for testing with
        var queue = new beaver.MemoryQueue(registry, {});

        queue.initialize(function (err)
        {
            // Create a worker and attach it to the queue
            var worker = new beaver.Worker(queue, {});

            // Register the worker to the queue so that it will start executing tasks
            queue.registerWorker(worker, function (err)
            {
                if (err)
                {
                    return next(err);
                }

                // Remove all of the existing job objects, so that they don't polute the test
                beaver.MongoosePlugin.getJobModel().remove({}).exec(function (err, count)
                {
                    // Queue the task, but don't attach the worker yet. make sure the job object status is queued
                    queue.queueTask("auto_delete_test", {}, function (err, task)
                    {

                    });
                });
            });
        });
    });
});
