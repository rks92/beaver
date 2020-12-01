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
    name:    "example_task",
    timeout: 5000, // This field is optional if defaultTimeout is set, otherwise it is mandatory. A value of null means no timeout
    func:    function (parameters, done)
             {
                 // The "this" variable is set to a Task object.
                 var task = this;

                 // You can log without waiting for a callback
                 task.log("This task is just getting started!");

                 // Process some data here
                 // ...
                 // When you log, you can also provide and wait for a callback. Generally this way is recommended for extra reliability
                 // Note that you can also provide a log-level with your log messages. When you provide a log level, you must provide
                 // a callback.
                 task.log("error", "I processed some data for object with name " + parameters.name, function (err)
                 {
                     if (err)
                     {
                         return done(err);
                     }
                     else
                     {
                         // You can also update the percentage complete. Same thing, accepts an optional callback for extra reliability.
                         task.updatePercentageComplete(50);

                         // Or you can do both at the same time
                         task.updatePercentageCompleteAndLog(75, "Almost done!");

                         // And we're done!
                         return done();
                     }
                 });
             }
});

// Initialize the queue. Make sure you have registered all your tasks before calling this
queue.initialize(function (err)
{
    // Create eight workers with default options and attach them to the queue.
    // This allows 8 tasks to be processed in parallel.
    async.times(8, function (n, done)
        {
            var worker = new beaver.Worker(queue, {});

            // Register the worker to the queue so that it will start executing tasks
            queue.registerWorker(worker, function (err)
            {
                if (err)
                {
                    return done(err);
                }
                else
                {
                    return done();
                }
            });
        },
        function (err)
        {
            if (err)
            {
                console.error("Received an error while creating workers.", err);
            }
            else
            {
                // Now we can queue a task to get executed. Again callback here is optional but recommended.
                // Send a task to the queue, and the worker should pick it up and execute it
                queue.queueTask("example_task", {name: "CoolObject"}, function (err, task)
                {
                    if (err)
                    {
                        console.error("Received an error while queuing a task.", err);
                    }
                    else
                    {
                        // Task was queued successfully! It should be executed very soon.
                        console.log("Task was queued successfully.");
                    }
                });
            }
        });
});