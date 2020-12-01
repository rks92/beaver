var beaver = require('../lib/lib');
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