/*
 * test.js
 *
 * A set of basic unit tests for the Worker framework.
 *
 */

var beaver = require('../lib/lib'),
    assert = require('assert');


var globalTimeout = 5000;

describe("Worker", function ()
{
    this.timeout(globalTimeout);
    it("Should be able to queue a task for execution, and have a worker pick up that task.", function (next)
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
                else
                {
                    // Queue a task to the queue, and the worker should pick it up and execute it
                    queue.queueTask("awesome_test_task", {}, function (err, task)
                    {
                        if (err)
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
        });
    });

    it("Should automatically time out tasks which are hung and never going to complete if you set a timeout.", function (next)
    {
        // Construct the registry
        var registry = new beaver.Registry({defaultTimeout: null});

        // Track whether the task executed
        var executions = 0;

        // Register a task
        registry.registerTask({
            name:    "hung_task",
            timeout: 500,
            func:    function (parameters, done)
            {
                // Do nothing - the timeout should pickup this task
                executions += 1;
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
                else
                {
                    // Queue the task a few times. Since only one task can execute at a time for this worker, we should see a few consecutive timeouts.
                    queue.queueTask("hung_task", {});
                    queue.queueTask("hung_task", {});

                    setTimeout(function ()
                    {
                        assert.equal(executions, 1);
                    }, 200);

                    setTimeout(function ()
                    {
                        assert.equal(executions, 2);
                        return next();
                    }, 700);
                }
            });
        });
    });

    it("Timeouts should be based on the time since the last update call, not entire time to execute", function (next)
    {
        // Construct the registry
        var registry = new beaver.Registry({defaultTimeout: null});

        // Track whether the task executed
        var executions = 0;

        // Register a task
        registry.registerTask({
            name:    "hung_task",
            timeout: 500,
            func:    function (parameters, done)
            {
                var task = this;

                // After 250ms, perform a log message
                setTimeout(function()
                {
                    task.log("I love the universe!");
                }, 250);

                // Count the number of executions
                executions += 1;
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
                else
                {
                    // Queue the task a few times. Since only one task can execute at a time for this worker, we should see a few consecutive timeouts.
                    queue.queueTask("hung_task", {});
                    queue.queueTask("hung_task", {});
                    queue.queueTask("hung_task", {});

                    // First task waits 250ms, sends a log message, and then after another 500ms, times out.
                    setTimeout(function ()
                    {
                        assert.equal(executions, 1);
                    }, 200);

                    setTimeout(function ()
                    {
                        assert.equal(executions, 1);
                    }, 700);

                    // First task times out at 750ms, so by here we should see the second task start executing
                    setTimeout(function ()
                    {
                        assert.equal(executions, 2);
                    }, 950);

                    setTimeout(function ()
                    {
                        assert.equal(executions, 2);
                    }, 1200);

                    // The second task should timeout by 1500ms after start, so by here we should see the third executing.
                    setTimeout(function ()
                    {
                        assert.equal(executions, 3);
                        return next();
                    }, 1750);
                }
            });
        });
    });

    it("Should use the default timeout on the registry if available.", function (next)
    {
        // Construct the registry
        var registry = new beaver.Registry({defaultTimeout: 500});

        // Track whether the task executed
        var executions = 0;

        // Register a task
        registry.registerTask({
            name: "hung_task",
            func: function (parameters, done)
            {
                // Do nothing - the timeout should pickup this task
                executions += 1;
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
                else
                {
                    // Queue the task a few times. Since only one task can execute at a time for this worker, we should see a few consecutive timeouts.
                    queue.queueTask("hung_task", {});
                    queue.queueTask("hung_task", {});

                    setTimeout(function ()
                    {
                        assert.equal(executions, 1);
                    }, 200);

                    setTimeout(function ()
                    {
                        assert.equal(executions, 2);
                        return next();
                    }, 700);
                }
            });
        });
    });


    it("Should ensure that log messages are being stored on the task object.", function (next)
    {
        // Construct the registry
        var registry = new beaver.Registry({defaultTimeout: null});

        // Register a task
        registry.registerTask({
            name: "log_test_task",
            func: function (parameters, done)
            {
                var task = this;

                var testMessage = "This is a great message!";

                task.log(testMessage, function (err)
                {
                    assert(task.history.indexOf(testMessage) != -1);
                    return next();
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
                else
                {
                    // Queue the task a few times. Since only one task can execute at a time for this worker, we should see a few consecutive timeouts.
                    queue.queueTask("log_test_task", {});
                }
            });
        });
    });


    it("Should ensure that completion percentages are being stored on the task object.", function (next)
    {
        // Construct the registry
        var registry = new beaver.Registry({defaultTimeout: null});

        // Register a task
        registry.registerTask({
            name: "update_test_task",
            func: function (parameters, done)
            {
                var task = this;

                var completionPercentage = 65;

                task.updatePercentageComplete(completionPercentage, function (err)
                {
                    assert.equal(task.percentageComplete, completionPercentage);
                    return next();
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
                else
                {
                    // Queue the task a few times. Since only one task can execute at a time for this worker, we should see a few consecutive timeouts.
                    queue.queueTask("update_test_task", {});
                }
            });
        });
    });


    it("Should ensure that logging messages on the task triggers the registry logging hook to be called.", function (next)
    {
        var testMessage = "This is a great message!";

        // Construct the registry
        var registry = new beaver.Registry({
            defaultTimeout: null
        });

        registry.registerHook("log", function (task, log_level, message, done)
        {
            // Happily call the next function
            assert.equal(message, testMessage);
            assert(task.history.indexOf(testMessage) != -1);
            assert.equal(log_level, "info");
            done();
            next();
        });

        // Register a task
        registry.registerTask({
            name: "log_hook_test_task",
            func: function (parameters, done)
            {
                var task = this;
                // Trigger the hook
                task.log(testMessage, function (err)
                {

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
                else
                {
                    // Queue the task a few times. Since only one task can execute at a time for this worker, we should see a few consecutive timeouts.
                    queue.queueTask("log_hook_test_task", {});
                }
            });
        });
    });


    it("Should ensure that update-percentage calls on the task triggers the registry update hook to be called.", function (next)
    {
        var testPercentage = 45;

        // Construct the registry
        var registry = new beaver.Registry({
            defaultTimeout: null
        });

        registry.registerHook("percentageComplete", function (task, percentage, done)
        {
            // Happily call the next function
            assert.equal(percentage, testPercentage);
            assert.equal(task.percentageComplete, testPercentage);
            done();
            next();
        });

        // Register a task
        registry.registerTask({
            name: "update_hook_test_task",
            func: function (parameters, done)
            {
                var task = this;

                // Trigger the hook
                task.updatePercentageComplete(testPercentage, function (err)
                {

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
                else
                {
                    // Queue the task a few times. Since only one task can execute at a time for this worker, we should see a few consecutive timeouts.
                    queue.queueTask("update_hook_test_task", {});
                }
            });
        });
    });

    it("Should be able to update percentage and log a message with a single api call.", function (next)
    {
        var testPercentage = 45;
        var testMessage = "Awesome message";

        // Construct the registry
        var registry = new beaver.Registry({
            defaultTimeout: null
        });

        var numCalled = 0;

        registry.registerHook("percentageComplete", function (task, percentage, done)
        {
            // Happily call the next function
            assert.equal(percentage, testPercentage);
            assert.equal(task.percentageComplete, testPercentage);
            numCalled += 1;
            if (numCalled == 2)
            {
                next();
            }

            done();
        });

        registry.registerHook("log", function (task, log_level, message, done)
        {
            // Happily call the next function
            assert.equal(message, testMessage);
            assert(task.history.indexOf(testMessage) != -1);
            assert.equal(log_level, "info");
            numCalled += 1;
            if (numCalled == 2)
            {
                console.log(task.history);
                next();
            }
            done();
        });

        // Register a task
        registry.registerTask({
            name: "update_and_log_hook_test_task",
            func: function (parameters, done)
            {
                var task = this;

                // Trigger the hook
                task.updatePercentageCompleteAndLog(testPercentage, testMessage, function (err)
                {

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
                else
                {
                    // Queue the task a few times. Since only one task can execute at a time for this worker, we should see a few consecutive timeouts.
                    queue.queueTask("update_and_log_hook_test_task", {});
                }
            });
        });
    });


    it("Should be able to store results along with the tasks", function (next)
    {
        var testResult = {link: "www.iamawesome.com"};

        // Construct the registry
        var registry = new beaver.Registry({
            defaultTimeout: null
        });

        registry.registerHook("result", function (task, result, done)
        {
            // Happily call the next function
            assert.deepEqual(result, testResult);
            assert.deepEqual(task.results, [testResult]);
            done();
            next();
        });

        // Register a task
        registry.registerTask({
            name: "result_hook_test_task",
            func: function (parameters, done)
            {
                var task = this;

                // Trigger the hook
                task.addResult(testResult, function (err)
                {

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
                else
                {
                    // Queue the task a few times. Since only one task can execute at a time for this worker, we should see a few consecutive timeouts.
                    queue.queueTask("result_hook_test_task", {});
                }
            });
        });
    });


    it("Should ensure that task start hooks get called", function (next)
    {
        // Construct the registry
        var registry = new beaver.Registry({
            defaultTimeout: null
        });

        registry.registerHook("start", function (task, done)
        {
            // Happily call the next function
            done();
            next();
        });

        // Register a task
        registry.registerTask({
            name: "start_hook_test",
            func: function (parameters, done)
            {
                var task = this;
                return done();
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
                else
                {
                    // Queue the task a few times. Since only one task can execute at a time for this worker, we should see a few consecutive timeouts.
                    queue.queueTask("start_hook_test", {});
                }
            });
        });
    });


    it("Should ensure that task finish hooks get called", function (next)
    {
        // Construct the registry
        var registry = new beaver.Registry({
            defaultTimeout: null
        });

        registry.registerHook("finish", function (task, done)
        {
            // Happily call the next function
            done();
            next();
        });

        // Register a task
        registry.registerTask({
            name: "finish_hook_test",
            func: function (parameters, done)
            {
                var task = this;
                return done();
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
                else
                {
                    // Queue the task a few times. Since only one task can execute at a time for this worker, we should see a few consecutive timeouts.
                    queue.queueTask("finish_hook_test", {});
                }
            });
        });
    });


    it("Should ensure that task error hooks get called", function (next)
    {
        // Construct the registry
        var registry = new beaver.Registry({
            defaultTimeout: null
        });

        var testError = "Stuff! ";

        registry.registerHook("finish", function (task, error, done)
        {
            // Unhappy! Finish and Error hooks are mutually exclusive.
            // Finish should not be called in this case
            next(new Error("Finish hook should not be called when the task yielded an error."));
        });

        registry.registerHook("error", function (task, error, done)
        {
            assert.equal(error, testError);

            // Happily call the next function
            done();
            next();
        });

        // Register a task
        registry.registerTask({
            name: "error_hook_test",
            func: function (parameters, done)
            {
                var task = this;
                // Send the test error to the error
                return done(testError);
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
                else
                {
                    // Queue the task a few times. Since only one task can execute at a time for this worker, we should see a few consecutive timeouts.
                    queue.queueTask("error_hook_test", {});
                }
            });
        });
    });


    it("Should set the percentage complete to 100 after the task completes", function (next)
    {
        // Construct the registry
        var registry = new beaver.Registry({
            defaultTimeout: null
        });

        registry.registerHook("finish", function (task, done)
        {
            assert.equal(task.percentageComplete, 100);

            done();
            next();
        });

        // Register a task
        registry.registerTask({
            name: "set_percentage_complete_100_on_finish_test",
            func: function (parameters, done)
            {
                var task = this;
                // Complete the task successfully
                return done();
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
                else
                {
                    // Queue the task.
                    queue.queueTask("set_percentage_complete_100_on_finish_test", {});
                }
            });
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
                else
                {
                    // Queue the task.
                    queue.queueTask("retry_test", {});
                }
            });
        });
    });

    it("Should call the retry hook each time is queued for a retry", function (next)
    {
        // Construct the registry
        var registry = new beaver.Registry({
            defaultTimeout: null
        });

        var retryHookCallsCounter = 0;
        var testError = "Error!";
        registry.registerHook("retry", function (task, done)
        {
            // This should get called 2 times and no more, each time the task was retried.
            retryHookCallsCounter += 1;

            if(retryHookCallsCounter == 2)
            {
                // Wait an additional 2 seconds, and check that the counter hasn't increased.
                // This is to ensure that the task isn't continuing to retry beyond the
                // maximum count.
                setTimeout(function ()
                {
                    assert.equal(retryHookCallsCounter, 2);

                    return next();
                }, 2000);
            }

            // Happily call the done function
            done();
        });

        // Register a task
        registry.registerTask({
            name: "retry_hook_test",
            maximumAttempts: 3,
            func: function (parameters, done)
            {
                return done(testError);
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
                else
                {
                    // Queue the task.
                    queue.queueTask("retry_hook_test", {});
                }
            });
        });
    });
});