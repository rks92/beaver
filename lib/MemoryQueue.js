/*
 * @title MemoryQueue
 * @copyright (c) 2015 Sensibill Inc.
 * @license MIT
 * @author Bradley Arsenault
 */


var Queue = require('./Queue'),
    Task = require('./Task'),
    async = require('async'),
    underscore = require('underscore');

/**
 * @class MemoryQueue
 *
 * The MemoryQueue is a simple Queue object which stores queued tasks in memory.
 *
 */


/**
 * Constructs a MemoryQueue object.
 *
 * @method constructor
 *
 * @param registry - The worker registry which contains the registry of tasks
 * @param options
 */
function MemoryQueue(registry, options)
{
    var self = this;

    // Initialize the base class
    Queue.call(this, registry, options);

    // Stores a list of tasks that need to execute.
    self.tasks = [];

    self.registry = registry;
}



/**
 * Initializes the Queue. Executes things that must be done asynchronously, such as connections to third party services.
 *
 * @param done - The callback which will be called when initialization has completed.
 *
 */
MemoryQueue.prototype.initialize = function initialize(done)
{
    Queue.prototype.initialize.call(this, done);
};


/**
 * Queues a task to be executed
 *
 * @method queueTask
 *
 * @param name - The name of the task to be queued
 * @param parameters - A simple object with parameters sent to the task. Must be JSON serializable - e.g. no circular references
 * @param [done] - A callback to be executed after the task has been successfully queued. Receives the Task object that was queued.
 */
MemoryQueue.prototype.queueTask = function queueTask(name, parameters, done)
{
    var self = this;

    self.checkTask(name, parameters);

    var task = new Task({name: name, parameters:parameters}, self.registry);

    // Execute all of the queue task hooks
    async.applyEach(self.registry.hooks.queue, task, function(err)
    {
        if(err)
        {
            return done(err);
        }
        else
        {
            self.tasks.push(task);

            if (done)
            {
                done(null, task);
            }
        }
    });
};


/**
 * This function is used to register a worker to execute tasks on this queue.
 *
 * @method registerWorker
 *
 * @param worker - The worker object to execute tasks.
 *
 * @param done - A callback in the form of function(err) that will be called once the worker is successfully registered to execute
 *             - tasks from this Queue.
 */
MemoryQueue.prototype.registerWorker = function registerWorker(worker, done)
{
    var self = this;
    worker.start();
    async.whilst(function test()
        {
            return worker.running;
        },
        function iterator(callback)
        {
            if (self.tasks.length == 0)
            {
                setTimeout(function()
                {
                    return callback();
                }, 10);
            }
            else
            {
                var task = self.tasks.shift();
                
                function handleRetry()
                {
                    if (task.attempts < task.description.maximumAttempts)
                    {
                        // Execute all of the retry hooks
                        async.applyEach(self.registry.hooks.retry, task, function(err)
                        {
                            if (err)
                            {
                                if (done)
                                {
                                    return done(err);
                                }
                                else
                                {
                                    throw err;
                                }
                            }
                            else
                            {
                                self.tasks.push(task);
                                callback();
                            }
                        });
                    }
                    else
                    {
                        // We have exceeded the maximum number of retries. We just give up at this point.
                        callback();
                    }
                }

                task.execute(function(err)
                {
                    if (err)
                    {
                        var taskInfo = underscore.map(underscore.pairs(task.metadata), function(pair) { return pair[0] + ": " + pair[1]}).join(", ");
                        var errorString = "Error occurred while processing a task (" + taskInfo + ") in the Beaver libraries AMQP Module.\n";
                        if (err.stack)
                        {
                            errorString += err.stack;
                        }
                        else
                        {
                            errorString += err.toString() + "\n";
                            errorString += "Error has no stacktrace. Are you sure you threw an error object?";
                        }

                        async.applyEach(self.registry.hooks.stderr, errorString, function() {});
                        handleRetry();
                    }
                    else
                    {
                        callback();
                    }
                });
            }
        });
    return done();
};



/**
 * Inherit from Queue
 */
MemoryQueue.prototype.__proto__ = Queue.prototype;



// Expose the MemoryQueue
module.exports = MemoryQueue;

