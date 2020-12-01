/*
 * @title AMQPQueue
 * @copyright (c) 2015 Sensibill Inc.
 * @license MIT
 * @author Bradley Arsenault
 */


var Queue = require('./Queue'),
    Task = require('./Task'),
    amqplib = require('amqplib'),
    async = require('async'),
    underscore = require('underscore'),
    errors = require('./errors/errors'),
    util = require('util');

/**
 * @class AMQPQueue
 *
 * The AMQP Queue uses an external message queueing service, such as RabbitMQ, to manage the queueing of tasks
 *
 */


/**
 * Constructs an AMQPQueue object.
 *
 * @method constructor
 *
 * @param registry - The beaver registry which contains the registry of tasks
 * @param options - An object containing options for configuring this queue. The object must contain the following fields:
 * @param options.url - The URL of RabbitMQ or another compatible AMQP message queue. Looks like "amqp://hostname/"
 * @param [options.prefix] - A prefix for all queue and exchange names to be created for this Queue.
 */
function AMQPQueue (registry, options)
{
    var self = this;

    // Initialize the base class
    Queue.call(this, registry, options);

    self.registry = registry;

    self.options = options;

    if(!underscore.isObject(options))
    {
        throw new Error("`options` provided to the AMQPQueue must be an object.");
    }

    if(!options.url || !underscore.isString(options.url))
    {
        throw new Error("`options.url` is required to initialize the AMQPQueue, and must be a string.");
    }

    if (options.prefix === null || options.prefix === undefined)
    {
        options.prefix = "default";
    }

    var amqpConnectionOptions = {
        heartbeat: 30
    };

    self.amqpConnection = amqplib.connect(options.url, amqpConnectionOptions);

    self.workers = [];
    self.currentWorker = 0;
}


AMQPQueue.prototype.queueNameForTask = function queueNameForTask (task)
{
    var self = this;
    return self.options.prefix + "-worker-queue-" + task.name;
};

/**
 * Initializes the Queue. Executes things that must be done asynchronously, such as connections to third party services.
 *
 * Currently there is a limitation which will require you to define all of your tasks before initializing your queue object.
 * This limitation may be eliminated in a future release!
 *
 * @param done - The callback which will be called when initialization has completed.
 *
 */
AMQPQueue.prototype.initialize = function initialize (done)
{
    var self = this;

    self.exchangeName = self.options.prefix + "-worker-tasks";

    self.amqpConnection.then(function (conn)
    {
        // create a channel for most general operations.
        if (!self.amqpChannel)
        {
            self.amqpChannel = conn.createChannel();
        }

        // Create an exchange for this queue.
        self.amqpChannel.then(function (channel)
        {
            var exchangeOptions = {
                durable:    true,
                internal:   false,
                autoDelete: false
            };

            channel.assertExchange(self.exchangeName, 'direct', exchangeOptions).then(function (exchange)
            {
                // Create a queue that receives messages on the cluster communication exchange
                var queueOptions = {
                    exclusive:  false,
                    durable:    true,
                    autoDelete: false
                };

                // Create a queue for each of the registered tasks
                async.each(Object.keys(self.registry.tasks), function (taskName, next)
                    {
                        channel.assertQueue(self.queueNameForTask(self.registry.tasks[taskName]), queueOptions).then(function (queueInfo)
                        {
                            channel.bindQueue(queueInfo.queue, self.exchangeName, taskName);

                            return next();
                        });
                    },
                    function (err)
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
            });
        });
    }).then(null, function (err)
    {
        // Send back an error wrapping the amqp error.
        var message = "Could not connect to the AMQP Server on the provided URL: " + err.toString();
        return done(new errors.AMQPConnectionError(message));
    });
};


/**
 * Queues a task to be executed
 *
 * @method queueTask
 *
 * @param name - The name of the task to be queued
 * @param parameters - A simple object with parameters sent to the task. Must be JSON serializable - e.g. no circular references
 * @param [done] - A callback to be executed after the task has been successfully queued
 */
AMQPQueue.prototype.queueTask = function queueTask (name, parameters, done)
{
    var self = this;

    // Check that the task name and parameters are valid
    self.checkTask(name, parameters);

    if (!self.amqpChannel)
    {
        var error = new Error("Unable to queue task: You must call AMQPQueue.initialize first before attempting to queue any tasks!");
        if(done)
        {
            return done(error);
        }
        else
        {
            throw error;
        }
    }

    self.amqpChannel.then(function (channel)
    {
        var messageOptions = {
            persistent: true
        };

        var task = new Task({name: name, parameters: parameters}, self.registry);

        // Execute all of the queue task hooks
        async.applyEach(self.registry.hooks.queue, task, function(err)
        {
            if(err)
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
                var json = task.serializeJSON();
                channel.publish(self.exchangeName, name, new Buffer(JSON.stringify(json)), messageOptions);

                if (done)
                {
                    done(null, task);
                }
            }
        });
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
AMQPQueue.prototype.registerWorker = function registerWorker (worker, done)
{
    var self = this;
    self.workers.push(worker);

    if (!self.amqpConnection)
    {
        return done(new Error("Unable to register the worker: You must call AMQPQueue.initialize first before attempting to register any workers"));
    }

    worker._channelConsumers = [];

    self.amqpConnection.then(function (conn)
    {
        // Bind this worker to all the tasks in the registry
        async.each(Object.keys(self.registry.tasks), function (taskName, next)
        {
            // Create a channel for this worker.
            conn.createChannel().then(function (channel)
            {
                // Maximum one message at a time for each worker for each task.
                channel.prefetch(self.registry.tasks[taskName].concurrencyPerWorker);

                var queueName = self.queueNameForTask(self.registry.tasks[taskName]);

                channel.consume(queueName, function (msg)
                {
                    // Decode the message, which is in JSON
                    var taskData = null;
                    try
                    {
                        taskData = JSON.parse(msg.content.toString());
                    }
                    catch (err)
                    {
                        async.applyEach(self.registry.hooks.stderr, "Error occurred while processing inter-server message in the Beaver libraries AMQP Module. Could not decode the JSON: " + err.toString(), function() {});
                        channel.ack(msg);
                        return;
                    }

                    var task = Task.deserializeJSON(taskData, self.registry);

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
                                    taskData = task.serializeJSON();
                                    channel.publish(self.exchangeName, task.name, new Buffer(JSON.stringify(taskData)), {persistent: true});
                                    channel.ack(msg);
                                }
                            });
                        }
                        else
                        {
                            // We have exceeded the maximum number of retries. We just give up at this point.
                            channel.ack(msg);
                        }
                    }

                    // If the message is a retry, then we need to increment the number of attempts, and requeue it.
                    if ( msg.fields.redelivered )
                    {
                        // Its necessary to increment the number of attempts here because,
                        // although task.execute increases the number of attempts, when
                        // the worker crashed, that information is lost, and the message
                        // gets redelivered with its old number of attempts
                        task.attempts += 1;

                        handleRetry();
                    }
                    // If we have no workers available, nack the message so another queue can grab it
                    else if (self.workers.length == 0)
                    {
                        channel.nack(msg);
                    }
                    else
                    {
                        // Choose which worker to send this task to
                        self.currentWorker = (self.currentWorker + 1) % self.workers.length;
                        var worker = self.workers[self.currentWorker];

                        // Send the task for execution
                        worker.executeTask(task, function (err)
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
                                    errorString += util.inspect(err, {depth: 4}) + "\n";
                                    errorString += "\n" + new Error().stack + "\n";
                                    errorString += "Error has no stacktrace. Are you sure you threw an error object?";
                                }

                                async.applyEach(self.registry.hooks.stderr, errorString, function() {});
                                // If there was an error, queue the task for retry
                                handleRetry();
                            }
                            else
                            {
                                // Acknowledge the task executed
                                channel.ack(msg);
                            }
                        });
                    }
                }).then(function success(consumerData)
                {
                    worker._channelConsumers.push({
                        task: self.registry.tasks[taskName],
                        queue: queueName,
                        channel: channel,
                        consumerTag: consumerData.consumerTag
                    });

                    return next();
                }, function failure(err)
                {
                    return next(err);
                });
            });
        }, function (err)
        {
            return done(err);
        });

    });
};




/**
 * This function is used to remove a worker from this queue. The worker will finish whatever it is working on,
 * but will no longer receive any new tasks.
 *
 * @method removeWorker
 *
 * @param worker - The worker object to be removed.
 *
 * @param done - A callback in the form of function(err) that will be called once the worker is successfully removed.
 */
AMQPQueue.prototype.removeWorker = function removeWorker(worker, done)
{
    var self = this;
    if (self.workers.indexOf(worker) == -1)
    {
        return done(new Error("The worker you are trying to remove from this AMQPQueue has not been registered to this AMQPQueue in the first place!"));
    }
    else
    {
        self.workers.splice(self.workers.indexOf(worker), 1);
        async.each(worker._channelConsumers, function(consumerInfo, next)
        {
            consumerInfo.channel.cancel(consumerInfo.consumerTag).then(function success()
            {
                return next();
            },
            function failure()
            {
                return next(new Error("Failure to unbind a consumer for the task: " + consumerInfo.task.name));
            });
        }, done);
    }
};


/**
 * Inherit from Queue
 */
AMQPQueue.prototype.__proto__ = Queue.prototype;


// Expose the AMQP DAM
module.exports = AMQPQueue;

