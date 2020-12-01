// Includes
var underscore = require('underscore'),
    sift = require('sift'),
    mongoose = require('mongoose'),
    async = require('async'),
    child_process = require("child_process"),
    Promise = require('bluebird');

var globalMongooseConnection = null;
var globalPluginOptions = null;
var globalJobModel = null;


// Grab what our hostname is
var globalHostname = "";

/*
 * This is used to initialize the worker Mongoose plugin with your mongo connection
 *
 * @params connection - A Mongoose Connection object.
 * @params options - Options to use for the Mongoose plugin.
 * @params options.createMongoJobs - If you use the Mongoose plugin, you can have Worker create a new collection in
 *                                   Mongo to store information about jobs that executed.
 * @params options.mongoJobAutoDeleteTime - If this is set, Job objects created when createMongoJobs is set to true
 *                                          will be automatically deleted after the number milliseconds given.
 * @params options.prefix - A prefix to be applied to any Mongo collections created by this plugin.
 * @params options.registry - The registry that tasks are being registered to.
 */
module.exports.initialize = function initialize (connection, options)
{
    globalPluginOptions = options;

    // If there is no registry on the options, throw an error
    if (!globalPluginOptions.registry)
    {
        throw new Error("You must provide a registry when initializing the Worker Mongoose Plugin.");
    }

    globalPluginOptions = underscore.defaults(globalPluginOptions, {
        createMongoJobs: false,
        prefix:          ""
    });

    globalMongooseConnection = connection;

    child_process.exec('hostname', function (err, stdout, stderr)
    {
        if (!err)
        {
            globalHostname = stdout.toString().trim();
        }
    });

    try
    {
        globalJobModel = globalMongooseConnection.model("Job");
    }
    catch (err)
    {
        var finishTime = {type: Date};
        if(globalPluginOptions.mongoJobAutoDeleteTime)
        {
            // Mongo expects the 'expires' field to be specified in seconds
            finishTime.expires = globalPluginOptions.mongoJobAutoDeleteTime / 1000;
        }

        // Create new counter schema.
        var jobSchema = new mongoose.Schema({
            name:               {type: String, require: true},
            hostname:           String,
            pid:                Number,
            createdAt:          Date,
            parameters:         {}, // leave this schema open ended
            metadata:           {},
            history:            {type: String, default: ""},
            percentageComplete: {type: Number, default: 0},
            results:            [{}],
            status:             {type: String, require: true},
            startTime:          {type: Date},
            finishTime:         finishTime,
            attempts:           0,
            error:              {
                message:    String,
                stacktrace: String
            },
            // ascending and descending paging sort flags
            apsf: { type: Boolean, default: false },
            dpsf: { type: Boolean, default: false }
        });

        // Create a unique index using the "field" and "model" fields.
        jobSchema.index({name: 1, createdAt: 1});
        jobSchema.index({"parameters.id": 1, status: 1});
        jobSchema.index({createdAt: 1, id: 1, apsf: 1});
        jobSchema.index({createdAt: -1, id: -1, dpsf: -1});
        jobSchema.index({name: 1, id: 1, apsf: 1});
        jobSchema.index({name: -1, id: -1, dpsf: -1});
        jobSchema.index({status: 1, id: 1, apsf: 1});
        jobSchema.index({status: -1, id: -1, dpsf: -1});

        jobSchema.pre("save", function (done)
        {
            if (!this.createdAt)
            {
                this.createdAt = new Date();
            }
            return done();
        });

        // Create model using new schema.
        globalJobModel = connection.model(globalPluginOptions.prefix + 'Job', jobSchema);
    }

    if (globalPluginOptions.createMongoJobs)
    {
        globalPluginOptions.registry.registerHook('queue', function (task, done)
        {
            // Create a copy of the task parameters with all redaction fields removed.
            var parameters = underscore.clone(task.parameters);
            task.description.redactParameters.forEach(function (redactParameter)
            {
                parameters[redactParameter] = "***REDACTED***";
            });

            // Create a new Job object.
            var job = new globalJobModel({
                name:       task.name,
                parameters: parameters,
                status:     'queued'
            });

            job.save(function (err)
            {
                if (err)
                {
                    return done(err);
                }
                else
                {
                    task.addMetadata("jobId", job._id.toString());
                    return done();
                }
            });
        });

        globalPluginOptions.registry.registerHook('log', function (task, level, message, done)
        {
            // Update the task object with the latest log information.
            globalJobModel.update({_id: task.metadata.jobId}, {$set: {history: task.history}}).exec(function (err)
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

        globalPluginOptions.registry.registerHook('percentageComplete', function (task, percentage, done)
        {
            // Update the task object with the latest log information.
            globalJobModel.update({_id: task.metadata.jobId}, {$set: {percentageComplete: task.percentageComplete}}).exec(function (err)
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

        globalPluginOptions.registry.registerHook('result', function (task, result, done)
        {
            // Update the task object with the latest log information.
            globalJobModel.update({_id: task.metadata.jobId}, {$push: {results: result}}).exec(function (err)
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

        globalPluginOptions.registry.registerHook('metadata', function (task, done)
        {
            var query = {
                _id: task.metadata.jobId
            };
            var changes = {
                metadata: task.metadata
            };
            globalJobModel.update(query, {$set: changes}).exec(done);
        });

        globalPluginOptions.registry.registerHook('start', function (task, done)
        {
            var changes = {
                hostname:   globalHostname,
                pid:        process.pid,
                status:     "running",
                startTime:  new Date(),
                attempts:   task.attempts
            };

            // Update the task object with the latest log information.
            globalJobModel.update({_id: task.metadata.jobId}, {$set: changes}).exec(function (err)
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

        globalPluginOptions.registry.registerHook('finish', function (task, done)
        {
            // Update the task object with the latest log information.
            globalJobModel.update({_id: task.metadata.jobId}, {$set: {status: "completed", finishTime: new Date()}}).exec(function (err)
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

        globalPluginOptions.registry.registerHook('error', function (task, error, done)
        {
            // Update the task object with the latest log information.
            globalJobModel.update({_id: task.metadata.jobId}, {
                $set: {
                    status: "failed",
                    error: {
                        message:    String(error),
                        stacktrace: String(error.stack)
                    },
                    finishTime: new Date()
                }
            }).exec(function (err)
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
    }
};

/**
 *  This function can be used to return the Mongoose Model object which represents tasks being executed in the system. Used when createMongoJobs is set to true
 *  in the plugin options.
 */
module.exports.getJobModel = function getJobModel ()
{
    return globalJobModel;
};

/**
 * This function can be used as a plugin to a mongoose schema. Example:
 *
 *      var mongoose = require('mongoose');
 *      var beaver = require('taskbeaver');
 *
 *      var registry = new beaver.Registry({});
 *
 *      var queue = new beaver.AMQPQueue(registry, {url: "amqp://localhost"});
 *
 *      var UserSchema = new mongoose.Schema({
 *          name: String
 *      });
 *
 *      UserSchema.plugin(beaver.MongoosePlugin.plugin, {
 *          model: 'User',
 *          queue: queue
 *      });
 *
 *      UserSchema.task("execute_stuff", {filter: {name: "bethany"}}, function(user, next)
 *      {
 *          console.log("this code will only execute when a user object is found with the name bethany!");
 *          user.name = "not!";
 *          user.save(next);
 *      }
 *
 * @param options is a dictionary with the following potential options:
 *
 *      queue: The queue where the tasks are to be queued for execution.
 *      model: The name of the model this task is meant to be executed on.
 *
 */
module.exports.plugin = function plugin (schema, options)
{
    // Fill in the defaults for options
    if (!options)
    {
        options = {};
    }

    options = underscore.defaults(options, {});

    // Make sure there is a queue specified.
    if (!options.queue)
    {
        throw new Error("You must provide a queue object to the Worker Mongoose Plugin");
    }

    // Make sure there is a model name specified.
    if (!options.model)
    {
        throw new Error("You must provide the name of the model to execute the Worker plugin on.");
    }

    var queue = options.queue;
    var registry = options.queue.registry;

    /**
     * @method Schema.task
     *
     * The register task function is added to the schema / model objects to provide the API that will register tasks
     * for this plugin to execute
     *
     * @param name - the name of the task to be registered
     * @param taskOptions - an object containing options for the task to be registered.
     * @param taskOptions.filter - a mandatory field which indicates which objects the task will be executed on. Must be in the form
     *                         of a Mongo-style query. Supported operators: $in, $nin, $exists, $gte, $gt, $lte, $lt, $eq, $ne, $mod,
     *                         $all, $and, $or, $nor, $not, $size, $type, $regex, $where, $elemMatch (taken from the sift library)
     * @param taskOptions.concurrencyPerWorker - the maximum number of this task that can be executed in parallel on a single worker
     * @param taskOptions.maximumAttempts - the maximum number of attempts before beaver should give up trying to execute this task.
     * @param taskOptions.dbScanInterval - This is the number of milliseconds between when the Mongoose plugin will scan the database
     *                                      for any objects that were missed from the on-save hooks. Defaults to one hour. If set to null
     *                                      or zero, database scanning will be disabled, and you will depend entirely on post-save hooks.
     *
     *                                      DB Scanning can take advantage of Job objects when createMongoJobs is set to true on the plugin
     *                                      options in order to prevent double queueing the same object.
     *
     * @param func - The function which is the task itself. Must be in the form function(object, callback) which receives the object
     *               that has matched the filter as its argument.
     */
    function registerTask (name, taskOptions, func)
    {
        if (!underscore.isString(name))
        {
            throw new Error("The name for any task registered must be a String!");
        }

        if (!taskOptions.filter)
        {
            throw new Error("The options for any task registered using the Mongoose plugin must have at least a filter, indicating which objects to run the task on.");
        }

        taskOptions = underscore.defaults(taskOptions, {
            dbScanInterval: 1000 * 60 * 60
        });

        name = options.model + "-" + name;

        try
        {
            function getMongoFilter ()
            {
                if (underscore.isFunction(taskOptions.filter))
                {
                    return taskOptions.filter();
                }
                else
                {
                    return taskOptions.filter;
                }
            }

            var taskInfo = {
                name: name
            };

            if (taskOptions.timeout)
            {
                taskInfo.timeout = taskOptions.timeout;
            }

            if (taskOptions.concurrencyPerWorker)
            {
                taskInfo.concurrencyPerWorker = taskOptions.concurrencyPerWorker;
            }

            if (taskOptions.maximumAttempts)
            {
                taskInfo.maximumAttempts = taskOptions.maximumAttempts;
            }

            taskInfo.func = function (parameters, done)
            {
                var task = this;

                var id = parameters.id;
                var model = globalMongooseConnection.model(options.model);

                var sifter = sift(getMongoFilter());

                model.findById(id, function (err, object)
                {
                    if (err)
                    {
                        return done(err);
                    }
                    else if (!object)
                    {
                        // Object has been deleted before the task could be executed on it. No worries.
                        // TODO: Log something here
                        return done();
                    }
                    else
                    {
                        // Test the object to make sure it still fits the mongo criteria
                        if (sifter([object]).length == 0)
                        {
                            // No longer fits the filter criteria. No worries.
                            // TODO: Log something here.
                            return done();
                        }
                        else
                        {
                            // Execute the task on the object.
                            func.call(task, object, function (err)
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
                        }
                    }
                });
            };

            registry.registerTask(taskInfo);

            schema.post('save', function ()
            {
                // Test whether the object meets the criteria
                if (sift(getMongoFilter(), [this]).length > 0)
                {
                    // Object meets the criteria! Queue this object for execution
                    var parameters = {id: this._id};
                    queue.queueTask(name, parameters);
                }
            });


            // Now we also have to periodically check all objects in the system to see if they match the criteria in question
            if(taskOptions.dbScanInterval)
            {
                registry.registerTask({
                    name: name + "-db-scan",
                    schedule: {
                        interval: taskOptions.dbScanInterval
                    },
                    timeout: 60000,
                    func: function(args, next)
                    {
                        var model = globalMongooseConnection.model(options.model);
                        var filter = getMongoFilter();
                        var task = this;

                        var message = "Searching for objects of the model " + options.model + " with the following criteria: \n";
                        message += JSON.stringify(filter, null, 2) + "\n\n";
                        task.log(message, function(err)
                        {
                            if (err)
                            {
                                return next(err);
                            }
                            else
                            {
                                model.count(filter).limit(1000).exec(function (err, total)
                                {
                                    if (err)
                                    {
                                        return next(err);
                                    }
                                    else
                                    {
                                        var numberCompleted = 0;

                                        var message = "";
                                        // Send a log message indicating how many objects where discovered.
                                        if (total == 0)
                                        {
                                            message = "No objects have been found which match the criteria.\n";
                                            task.log(message, next);
                                            return;
                                        }
                                        else if (total < 1000)
                                        {
                                            message = total.toString() + " objects have been found which match the criteria.\n";
                                        }
                                        else
                                        {
                                            message = "Greater then 1,000 objects have been found which match the criteria.\n";
                                        }

                                        message += "Starting processing on these objects.";

                                        task.log(message, function (err)
                                        {
                                            if (err)
                                            {
                                                return next(err);
                                            }
                                            else
                                            {
                                                model.find(filter).cursor().eachAsync(function (object)
                                                {
                                                    return Promise.fromCallback(function (next)
                                                    {
                                                        function queueObject ()
                                                        {
                                                            numberCompleted += 1;

                                                            task.updatePercentageCompleteAndLog((numberCompleted * 100) / total,
                                                                "Queuing " + object._id.toString() + " to have task " + name + " executed on it.", function (err)
                                                                {
                                                                    if (err)
                                                                    {
                                                                        return next(err);
                                                                    }
                                                                    else
                                                                    {
                                                                        // Queue the task to execute on this object
                                                                        var parameters = {id: object._id};
                                                                        queue.queueTask(name, parameters, function (err)
                                                                        {
                                                                            if (err)
                                                                            {
                                                                                return next(err);
                                                                            }
                                                                            else
                                                                            {
                                                                                return next();
                                                                            }
                                                                        });
                                                                    }
                                                                });
                                                        }

                                                        function skipObject (job)
                                                        {
                                                            numberCompleted += 1;

                                                            task.updatePercentageCompleteAndLog((numberCompleted * 100) / total,
                                                                "Skipping " + object._id.toString() + " because it appears to be already queued. We found a Job object in the database (" + job._id.toString() + ") corresponding to this object.",
                                                                function (err)
                                                                {
                                                                    if (err)
                                                                    {
                                                                        return next(err);
                                                                    }
                                                                    else
                                                                    {
                                                                        return next();
                                                                    }
                                                                });
                                                        }

                                                        if (globalPluginOptions.createMongoJobs)
                                                        {
                                                            // Check to see if there is already a Job object in the database for this object
                                                            globalJobModel.findOne({
                                                                "parameters.id": object._id,
                                                                "status":        {$nin: ['failed', 'completed']}
                                                            }).exec(function (err, job)
                                                            {
                                                                if (err)
                                                                {
                                                                    return next(err);
                                                                }
                                                                else
                                                                {
                                                                    if (!job)
                                                                    {
                                                                        queueObject();
                                                                    }
                                                                    else
                                                                    {
                                                                        skipObject(job);
                                                                    }
                                                                }
                                                            });
                                                        }
                                                        else
                                                        {
                                                            queueObject();
                                                        }
                                                    });
                                                }).
                                                then(function ()
                                                {
                                                    task.updatePercentageCompleteAndLog(100, "Completed examining all objects in the database.",
                                                    function (err)
                                                    {
                                                        if (err)
                                                        {
                                                            return next(err);
                                                        }
                                                        else
                                                        {
                                                            return next();
                                                        }
                                                    });
                                                }, function (err)
                                                {
                                                    return next(err);
                                                });
                                            }
                                        })
                                    }
                                });
                            }
                        });
                    }
                });
            }
        }
        catch (err)
        {
            async.applyEach(registry.hooks.stderr, "Error while registering a task through the Mongoose Plugin: " + err.toString(), function(){});
            throw err;
        }
    }

    schema.task = registerTask.bind(null);
};

