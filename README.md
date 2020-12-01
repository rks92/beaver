# Beaver.js

A convenient but reliable background task execution framework for NodeJS.

NOTE! This library was recently renamed from "taskbeaver". Someone had already created a package called "beaver" but was not actively using it, so we just took it over. So the history of the beaver library is somewhat contaminated by this other library.

## Not another task execution framework!

But wait you say! There is already bull and kue available for NodeJS, and they are decent. Both of these libraries are
 great tools written by great developers. Unfortunately, they depend upon a tool that just does not scale: Redis.

I also find these libraries to be very inconvenient to use for several of the core use cases of task manager.

## Use cases

There are three types of tasks being targeted by this framework:

* Type A) Tasks to be executed when a database object is in a particular state. This may include downloading the latest emails every
        24 hours for each User object, or pushing a payment through several successive stages reliably.
* Type B) Cluster-wide cron-style tasks. These are tasks that need to be executed on a regular schedule, but only once throughout the entire cluster.
* Type C) Event triggered - e.g. sending an email after a user requests a password reset.

Most task execution frameworks only conveniently handle Type-C tasks - you queue a "job" with a name and parameters to be executed, and it
gets processed by a worker. All of the current NodeJS frameworks are built on this model. Occasionally, some task execution frameworks will
handle Type-B tasks. But they often have certain caveats, such as not working reliably in a cluster. Most task frameworks don't bother with
Type-A tasks, leaving this up to client.

## How to use!

Beaver uses three types of objects for the task execution framework. You will require each of the following three objects in order to execute tasks:

* 1) A Registry. The Registry is where tasks are registered for execution. There should only ever be a single, global Registry object that is shared across your application.
* 2) A Queue. The Queue manages the queues for tasks. It handles the connection to the AMQP server for queueing.
* 3) A Worker. A Worker is the worker which executes the tasks.

The most basic usage is for registering a task and triggering an event to have that task executed, E.g. Type-C tasks. You can also see this code in
the examples folder of the repository as basic_usage.js. This works as follows:

    var beaver = require('taskbeaver');
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


To be able to handle Type-B tasks, which are cluster wide scheduled tasks, you must create an instance of a Scheduler object. IMPORTANT! Currently you
must only create the Scheduler on a single server within your cluster. In the future, you might be able to use some sort of leader election mechanism
to handle this part automatically. This code is available in examples/scheduled_tasks.js within the repository.


    var beaver = require('taskbeaver');
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
        name:    "scheduled task",
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


And lastly, the most exciting part of the library. This library comes with a plugin that works with MongoDB and the Mongoose middleware layer for it.
This enables you to associate tasks directly with the objects that those tasks are meant to execute on. Note that if you do not create a Scheduler
somewhere on your cluster, the only time tasks will get queued is when you explicitly save the object to the database, allowing the Mongoose save
middleware to execute. Otherwise, the system performs a regular scan (default to once per hour) to find objects that match the criteria which
have not already been queued.

    var beaver = require('taskbeaver');
    var async = require('async');
    var mongoose = require('mongoose');

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

    // Create the queue
    var queue = new beaver.AMQPQueue(registry, {url: "amqp://localhost"});


    // Now create a Mongoose Schema, in this case representing a User object
    var UserSchema = new mongoose.Schema({
        name: String,
        last_update_time: Date
    });


    // Add in Beavers MongoosePlugin.
    UserSchema.plugin(beaver.MongoosePlugin.plugin, {
        model: 'User',
        queue: queue
    });

    // Register a task that should execute on this user object when it matches a particular state. 'filter' can either be a static
    // query or a function which generates a dynamic query. In this example, we want this particular task to execute on every User
    // object in the system approximately once per hour.
    UserSchema.task("update_user", {
        filter: function createFilter()
                {
                    var timeBetweenUpdates = 1000 * 60 * 60;
                    var now = new Date();
                    var nowSeconds = new Date().getTime();
                    return {$or: [
                        {
                            last_update_time: {$lt: new Date(nowSeconds - timeBetweenUpdates)}
                        },
                        {
                            last_update_time: null
                        },
                        {
                            last_update_time: {$exists: false}
                        }
                    ]};
                },
        dbScanInterval: 1000 * 60 * 60 // Scan once per hour for objects not picked up in post-save hooks
    }, function(user, next)
    {
        var task = this;
        task.log("Performing the hourly update of object " + user._id.toString());
        user.last_update_time = new Date();

        user.save(next);
    });

    // Register the User model
    var User = mongoose.model('User', UserSchema);

    // Connect to the Mongo database
    var connection = mongoose.connect("mongodb://localhost/beaver_examples");

    // IMPORTANT! You must initialize the MongoosePlugin with a copy of your Mongo connection. This is important for two reasons,
    // 1 - you might use a different Mongo version then the one included by Beaver, and
    // 2 - you want to share a single Mongo connection throughout your entire applicaiton, including Beaver.
    // Mongo Job objects will be described in another example
    beaver.MongoosePlugin.initialize(connection, {registry: registry, createMongoJobs: true, mongoJobAutoDeleteTime: 1000});

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
                // You must create a Scheduler object and attach it to the queue for User objects to be found and executed.
                var scheduler = new beaver.Scheduler(queue, {});

                // Start the scheduler
                scheduler.start();

                // Now finally, create a User object, and you should see the task executed on it once per hour.
                var user = new User({name: "Bethany"});

                // Save the user object. The post-save hook should catch this object
                user.save(function(err){});
            }
        });
    });



## API Documentation

You can find API documentation at docs/index.html within the repository. These may also be hosted at some point in the future.
