/*
 * amqp_queue_test.js
 *
 * A set of basic unit tests for the Worker framework.
 *
 */

var beaver = require('../lib/lib'),
    assert = require('assert');


var globalTimeout = 30000;

describe("AMQPQueue", function()
{
    this.timeout(globalTimeout);
    it("Should be able to initialize a Registry, register a task, create an AMQP Queue, connect it to RabbitMQ, create a Worker for that Queue, queue a task and have it executed", function(next)
    {
        // Construct the registry
        var registry = new beaver.Registry({defaultTimeout: null});

        // Register a task
        registry.registerTask({
            name: "awesome_test_task",
            func: function (parameters, done)
            {
                // Call the next function indicating the task has executed successfully.
                next();
                done();
            }
        });

        // Create a worker queue which hooks into AMQP
        var queue = new beaver.AMQPQueue(registry, {
            url: "amqp://localhost"
        });

        queue.initialize(function (err)
        {
            if (err)
            {
                return next(err);
            }
            else
            {
                // Create a worker and attach it to the queue
                var worker = new beaver.Worker(queue, {});

                // Register the worker to the queue so that it will start executing tasks
                queue.registerWorker(worker, function(err)
                {
                    if(err)
                    {
                        return next(err);
                    }
                    else
                    {
                        // Queue a task to the queue, and the worker should pick it up and execute it
                        queue.queueTask("awesome_test_task", {}, function(err, task)
                        {
                            if(err)
                            {
                                return next(err);
                            }
                            else
                            {
                                // Make sure we get a task object back
                                assert(task);
                            }
                        });
                    }
                });
            }
        });
    });


    it("Ensure that metadata added in pre-queue hook is preserved when the task is sent to the queue", function(next)
    {
        // Construct the registry
        var registry = new beaver.Registry({defaultTimeout: null});

        var metadataValue = "sweet ass value!";

        // Register a task
        registry.registerTask({
            name: "metadata_preservation_test",
            func: function (parameters, done)
            {
                var task = this;

                assert.equal(task.metadata.test, metadataValue);

                // Call the next function indicating the task has executed successfully.
                next();
                done();
            }
        });

        registry.registerHook('queue', function(task, callback)
        {
            task.addMetadata("test", metadataValue);
            return callback();
        });

        // Create a worker queue which hooks into AMQP
        var queue = new beaver.AMQPQueue(registry, {
            url: "amqp://localhost"
        });

        queue.initialize(function (err)
        {
            if (err)
            {
                return next(err);
            }
            else
            {
                // Create a worker and attach it to the queue
                var worker = new beaver.Worker(queue, {});

                // Register the worker to the queue so that it will start executing tasks
                queue.registerWorker(worker, function(err)
                {
                    if(err)
                    {
                        return next(err);
                    }
                    else
                    {
                        // Queue a task to the queue, and the worker should pick it up and execute it
                        queue.queueTask("metadata_preservation_test", {});
                    }
                });
            }
        });
    });

    it("Shouldn't be able to initialize a Queue to a RabbitMQ node that doesn't exist.", function(next)
    {
        // Construct the registry
        var registry = new beaver.Registry({defaultTimeout: null});

        // Create a worker queue which hooks into AMQP
        var queue = new beaver.AMQPQueue(registry, {
            url: "amqp://does_not_exist_example"
        });

        queue.initialize(function (err)
        {
            assert(err);
            assert.equal(err.class, "AMQPConnectionError");
            return next();
        });
    });


    it("Shouldn't be able to queue a task at the queue that isn't registered in the registry.", function(next)
    {
        // Construct the registry
        var registry = new beaver.Registry({defaultTimeout: null});

        // Create a worker queue which hooks into AMQP
        var queue = new beaver.AMQPQueue(registry, {
            url: "amqp://localhost"
        });

        queue.initialize(function (err)
        {
            if (err)
            {
                return next(err);
            }
            else
            {
                // Should get an error if we attempt to queue a non-existent task.
                assert.throws(function()
                {
                    queue.queueTask("awesome_test_task", {});
                }, beaver.errors.TaskNotRegisteredError);

                return next();
            }
        });
    });

    it("Should ensure that a task gets retried several times when its set to retry", function (next)
    {
        // Construct the registry
        var registry = new beaver.Registry({
            defaultTimeout: null
        });

        var testError = "Error!";
        var attemptsCounter = 0;

        // Register a task
        registry.registerTask({
            name: "retry_test",
            maximumAttempts: 3,
            func: function (parameters, done)
            {
                var task = this;

                // This should get called 3 times, the first time and 2 retries
                attemptsCounter += 1;

                if(attemptsCounter == 3)
                {
                    // Wait an additional 2 seconds, and check that the counter hasn't increased.
                    // This is to ensure that the task isn't continuing to retry beyond the
                    // maximum count.
                    setTimeout(function()
                    {
                        assert.equal(attemptsCounter, 3);

                        return next();
                    }, 2000);
                }

                return done(testError);
            }
        });

        var queue = new beaver.AMQPQueue(registry, {
            url: "amqp://localhost"
        });

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
                else
                {
                    // Queue the task.
                    queue.queueTask("retry_test", {});
                }
            });
        });
    });

    it("Should be able to remove a worker and have no more tasks get executed.", function (next)
    {
        // Construct the registry
        var registry = new beaver.Registry({
            defaultTimeout: null
        });

        var executionsCounter = 0;
        var worker;

        // Register a task
        registry.registerTask({
            name: "worker_removal_test",
            func: function (parameters, done)
            {
                var task = this;

                // Count the number of times the task gets executed
                executionsCounter += 1;

                if(executionsCounter == 2)
                {
                    // Now after the second execution, we remove the worker from the queue.
                    queue.removeWorker(worker, function(err)
                    {
                        assert(!err);

                        // Now tee up some more tasks to be executed. None of these should execute,
                        // because we have removed the worker from the queue.
                        queue.queueTask("worker_removal_test", {});
                        queue.queueTask("worker_removal_test", {});


                        // Wait an additional 2 seconds, and check that the counter hasn't increased.
                        setTimeout(function()
                        {
                            assert.equal(executionsCounter, 2);

                            return next();
                        }, 2000);
                    });
                }

                return done();
            }
        });

        var queue = new beaver.AMQPQueue(registry, {
            url: "amqp://localhost"
        });

        queue.initialize(function (err)
        {
            // Create a worker and attach it to the queue
            worker = new beaver.Worker(queue, {});

            // Register the worker to the queue so that it will start executing tasks
            queue.registerWorker(worker, function (err)
            {
                if (err)
                {
                    return next(err);
                }
                else
                {
                    // Queue several tasks to get executed.
                    queue.queueTask("worker_removal_test", {});
                    queue.queueTask("worker_removal_test", {});
                }
            });
        });
    });

    it("Should be able to remove a worker and get a callback executed when all the current tasks are finished.", function (next)
    {
        // Construct the registry
        var registry = new beaver.Registry({
            defaultTimeout: null
        });

        var executionsCounter = 0;
        var worker;
        var finished = false;

        // Register a task
        registry.registerTask({
            name: "wait_for_finish_callback_test",
            concurrencyPerWorker: 2,
            func: function (parameters, done)
            {
                var task = this;

                // Count the number of times the task gets executed
                executionsCounter += 1;

                // If this is the second execution, pop off the worker.
                if(executionsCounter == 2)
                {
                    // Now after the second execution, we remove the worker from the queue.
                    queue.removeWorker(worker, function(err)
                    {
                        assert(!err);

                        // Wait for all remaining tasks
                        worker.waitForAllTasksToFinish(function(err)
                        {
                            assert(!err);
                            assert(finished);
                            return next();
                        });

                        // Wait an additional 2 seconds. waitForAllTasksToFinish should not execute until this
                        // time has completed.
                        setTimeout(function()
                        {
                            finished = true;
                            return done();
                        }, 2000);
                    });
                }
                else
                {
                    setTimeout(function()
                    {
                        return done();
                    }, 1000);
                }
            }
        });

        var queue = new beaver.AMQPQueue(registry, {
            url: "amqp://localhost"
        });

        queue.initialize(function (err)
        {
            // Create a worker and attach it to the queue
            worker = new beaver.Worker(queue, {});

            // Register the worker to the queue so that it will start executing tasks
            queue.registerWorker(worker, function (err)
            {
                if (err)
                {
                    return next(err);
                }
                else
                {
                    // Queue several tasks to get executed.
                    queue.queueTask("wait_for_finish_callback_test", {});
                    queue.queueTask("wait_for_finish_callback_test", {});
                    queue.queueTask("wait_for_finish_callback_test", {});
                }
            });
        });
    });
});