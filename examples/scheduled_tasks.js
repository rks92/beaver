var beaver = require('../lib/lib');
var async = require('async');

var registry = new beaver.Registry({
    defaultTimeout: 10000 // This field is optional, and sets the number of default number of milliseconds until something crashes
});

// Register a couple of hooks so that we can print the log output as the task executes to the console.
registry.registerHook("log", function (task, level, message, callback)
{
    console.log("Task log: ", message);
    return callback();
});

registry.registerHook("percentageComplete", function (task, percent, callback)
{
    console.log("Task is " + percent.toFixed(0) + "% completed.");
    return callback();
});

var queue = new beaver.AMQPQueue(registry, {url: "amqp://localhost"});

// Register a task
registry.registerTask({
    name:    "scheduled_task",
    timeout: 5000, // This field is optional if defaultTimeout is set, otherwise it is mandatory. A value of null means no timeout
    schedule: {
        interval: 1000 // The number of milliseconds in between executions of the task.
    },
    func:    function (parameters, done)
             {
                 // The "this" variable is set to a Task object.
                 var task = this;

                 // You can log without waiting for a callback
                 task.log("This task was executed at " + new Date().toISOString());

                 // And we're done!
                 return done();
             }
});

// Initialize the queue. Make sure you have registered all your tasks before calling this
queue.initialize(function (err)
{
    // Create a single worker to process tasks.
    var worker = new beaver.Worker(queue, {});

    // Register the worker to the queue so that it will start executing tasks
    queue.registerWorker(worker, function (err)
    {
        if (err)
        {
            console.error("Error while registering a worker to the queue.", err);
        }
        else
        {
            // *IMPORTANT* You must create a Scheduler object and attach it to the queue for scheduled tasks to start executing
            var scheduler = new beaver.Scheduler(queue, {});

            // Start the scheduler
            scheduler.start();
        }
    });
});