/*
 * scheduler_test.js
 *
 * A set of unit tests for the task scheduling functionality.
 *
 */

var beaver = require('../lib/lib'),
    assert = require('assert');


var globalTimeout = 5000;

describe("Scheduler", function ()
{
    this.timeout(globalTimeout);
    it("Should be able to schedule a task to be run every second and observe it run several times over several seconds", function (next)
    {
        // Construct the registry
        var registry = new beaver.Registry({defaultTimeout: null});

        // Count the number of times the scheduled task has run
        var times_executed = 0;

        // Register a task
        registry.registerTask({
            name: "scheduled_task",
            schedule:
            {
                interval: 250
            },
            func: function (parameters, done)
            {
                times_executed += 1;

                // Stop the scheduler after 5 executions.
                if(times_executed == 5)
                {
                    scheduler.stop();
                }

                // Call the next function indicating the task has executed successfully.
                done();
            }
        });

        // Create an in-memory queue - easiest for testing with
        var queue = new beaver.MemoryQueue(registry, {});

        // Create the scheduler attached to queue
        var scheduler = new beaver.Scheduler(queue, {});

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
                    // Start the scheduler
                    scheduler.start();

                    setTimeout(function()
                    {

                        // It should have run once immediately, and then 4 more times
                        // at each half second.
                        assert.equal(times_executed, 5);

                        next();
                    }, 1500)
                }
            });
        });
    });
});