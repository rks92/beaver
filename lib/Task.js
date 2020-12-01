/*
 * @title Task
 * @copyright (c) 2015 Sensibill Inc.
 * @license MIT
 * @author Bradley Arsenault
 */

var errors = require("./errors/errors"),
    moment = require('moment'),
    async = require('async');

/**
 * @class Task
 *
 * A task is a single instance of a task that is being worked on by the engine.
 *
 * @member {String}  history - A string containing the log history for this task
 * @member {Number}  complete - A number with what the percent completion of this task is. Between 0 and 100.
 *
 */

/**
 * Construct a task. This should only be done internally by the Worker system.
 *
 * @private
 *
 * @method constructor
 *
 * @param {Object} data for the task object
 * @param {Object} registry - the registry where all tasks are registered
 *
 * @return {Object} A freshly created Task object.
 */
function Task(data, registry)
{
    var self = this;

    self.registry = registry;
    self.name = data.name;
    self.attempts = data.attempts || 0;
    self.description = registry.tasks[data.name];
    self.parameters = data.parameters;
    if(data.metadata)
    {
        self.metadata = data.metadata;
    }
    else
    {
        self.metadata = {};
    }
    self.history = "";
    self.results = [];
    self.percentageComplete = 0;
}



/**
 *  This method allows tasks to record log output. This can be used to provide information on how the task is processing.
 *
 *  @method log
 *
 *  @param {String} [level] - An optional log level for the message. Default to 'info'
 *  @param message - a string providing the message for the task log output.
 *  @param [done] - an optional callback that will be called once the log message has been successfully recorded.
 *
 */
Task.prototype.log = function log(level, message, done)
{
    var self = this;

    // Reset the timeout on task execution.
    if(self._resetTimeout)
    {
        self._resetTimeout();
    }

    // Deal with the optional parameter
    if(done === undefined)
    {
        done = message;
        message = level;
        level = "info";
    }

    // Store the log message on the task history
    self.history += moment().format("YYYY-MMM-DD hh:mm:ss A") + " - " + message + "\n";

    // Send to the registry hooks
    async.applyEach(self.registry.hooks.log, self, level, message, function(err)
    {
        if(err)
        {
            if(done)
            {
                return done(err);
            }
        }
        else
        {
            if(done)
            {
                return done();
            }
        }
    });
};


/**
 *  This method allows you to record task progress as a percentage
 *
 *  @method updatePercentageComplete
 *
 *  @param percent - A number between 0 and 100 which indicates how close the task is to completion.
 *  @param [done] - An optional callback that will be issued
 *
 */
Task.prototype.updatePercentageComplete = function updatePercentageComplete(percent, done)
{
    var self = this;

    // Reset the timeout on task execution.
    if(self._resetTimeout)
    {
        self._resetTimeout();
    }

    // Don't do anything if the percentage is the same as the one we already have
    if(percent == self.percentageComplete)
    {
        if(done)
        {
            return done();
        }
        else
        {
            return;
        }
    }

    // Store the percentage completion
    self.percentageComplete = percent;

    // Send to the registry hooks
    async.applyEach(self.registry.hooks.percentageComplete, self, percent, function(err)
    {
        if(err)
        {
            if(done)
            {
                return done(err);
            }
        }
        else
        {
            if(done)
            {
                return done();
            }
        }
    });
};


/**
 *  This method allows you to both log a message and update the completion percentage in a single API call, for convenience.
 *
 *  @method updatePercentageComplete
 *
 *  @param percent - A number between 0 and 100 which indicates how close the task is to completion.
 *  @param {String} [level] - An optional log level for the message. Default to 'info'
 *  @param message - a string providing the message for the task log output.
 *  @param [done] - An optional callback that will be issued
 *
 */
Task.prototype.updatePercentageCompleteAndLog = function updatePercentageCompleteAndLog(percent, level, message, done)
{
    var self = this;

    // Reset the timeout on task execution.
    if(self._resetTimeout)
    {
        self._resetTimeout();
    }

    // Deal with the optional parameter
    if(done === undefined)
    {
        done = message;
        message = level;
        level = "info";
    }

    self.log(level, message, function(err)
    {
        if(err)
        {
            if(done)
            {
                return done(err);
            }
        }
        else
        {
            self.updatePercentageComplete(percent, function(err)
            {
                if(err)
                {
                    if(done)
                    {
                        return done(err);
                    }
                }
                else
                {
                    if(done)
                    {
                        return done();
                    }
                }
            });
        }
    })
};


/**
 *  This method executes the task.
 *
 *  @method execute
 *
 *  @param done - A callback that will be called when this task is done execution.
 *
 */
Task.prototype.execute = function execute(done)
{
    var self = this;

    // Use the timeout
    var timeout = null;
    if(self.description.timeout !== undefined)
    {
        timeout = self.description.timeout;
    }
    else if(self.registry.options.defaultTimeout !== undefined)
    {
        timeout = self.registry.options.defaultTimeout;
    }

    // Increment the number of attempts
    self.attempts += 1;

    var timeoutHandle = null;

    var handledCompletion = false;
    function handleResponse(err)
    {
        var message = "";
        if(err)
        {
            if (err.stack)
            {
                message += "Error while executing task. " + String(err.stack);
            }
            else
            {
                message += "Error while executing task. " + String(err);
            }
        }

        // update our percent complete to 100. This should occur even if the task timed out and later recovered from the timeout,
        // because if the task continued executing, it may have set the percentageComplete back to something other then 100.
        self.updatePercentageCompleteAndLog(100, message, function(percentageUpdateError)
        {
            if(percentageUpdateError)
            {
                async.applyEach(self.registry.hooks.stderr, "Error while attempting to update the percentage complete on the task after it completed." + percentageUpdateError.toString() + " " + percentageUpdateError.stack.toString(), function(){});
            }

            if(!handledCompletion)
            {
                handledCompletion = true;

                if(timeoutHandle)
                {
                    clearTimeout(timeoutHandle);
                }

                if(err)
                {
                    // Send to each of the hooks in the registry for errors
                    async.applyEach(self.registry.hooks.error, self, err, function(hookErr)
                    {
                        if(hookErr)
                        {
                            async.applyEach(self.registry.hooks.stderr,"The error hook attached to the Beaver registry itself produced an error!" + hookErr.toString() + " " + hookErr.stack.toString(), function() {});
                        }

                        return done(err);
                    });
                }
                else
                {
                    // Send to each of the post-finish hooks.
                    async.applyEach(self.registry.hooks.finish, self, function(hookErr)
                    {
                        if(hookErr)
                        {
                            return done(hookErr);
                        }
                        else
                        {
                            return done();
                        }
                    });
                }
            }
        });
    }


    self._resetTimeout = function()
    {
        // Only set a new timeout if we haven't yet handled the completion of
        // this task.
        if (!handledCompletion)
        {
            if(timeoutHandle)
            {
                clearTimeout(timeoutHandle);
            }

            if(timeout)
            {
                timeoutHandle = setTimeout(function()
                {
                    handleResponse(new errors.TaskTimedOutError("The task " + self.name + " has timed out."));
                }, timeout);
            }
        }
    };

    self._resetTimeout();


    // Send to each of the hooks in the registry for pre-task execution
    async.applyEach(self.registry.hooks.start, self, function(err)
    {
        if(err)
        {
            return done(err);
        }
        else
        {
            self.description.func.call(self, self.parameters, function(err)
            {
                handleResponse(err);
            });
        }
    });
};


/**
 * Add a piece of metadata that should be serialized along with the task when its queued
 *
 */
Task.prototype.addMetadata = function addMetadata(name, value, done)
{

    var self = this;
    self.metadata[name] = value;

    async.applyEach(self.registry.hooks.metadata, self, function (err)
    {
        if (!done)
        {
            return;
        }
        if (err)
        {
            done(err);
        }
        else
        {
            done(undefined, self);
        }
    });

};


/**
 *  This method allows you to record "results" from the task object.
 *
 *  @method addResult
 *
 *  @param result - A JSON serializable value/object which will be sent to any result hooks and stored with the Task permamently.
 *  @param [done] - An optional callback that will be issued once the result is successfully stored.
 *
 */
Task.prototype.addResult = function addResult(result, done)
{
    var self = this;

    // Reset the timeout on task execution.
    if(self._resetTimeout)
    {
        self._resetTimeout();
    }

    // Store the result
    self.results.push(result);

    // Send to the registry hooks
    async.applyEach(self.registry.hooks.result, self, result, function(err)
    {
        if(err)
        {
            if(done)
            {
                return done(err);
            }
        }
        else
        {
            if(done)
            {
                return done();
            }
        }
    });
};


/**
 * Serialize the task object into a JSON form that can later be deserialized
 *
 */
Task.prototype.serializeJSON = function serializeJSON()
{
    return {
        name: this.name,
        parameters: this.parameters,
        metadata: this.metadata,
        attempts: this.attempts
    };
};


/**
 * Deserializes the given JSON back into a Task object, with the given registry object.
 *
 * @param json - The JSON object that needs to be deserialized.
 * @param registry - A Registry object that holds the registration of tasks
 */
Task.deserializeJSON = function deserializeJSON(json, registry)
{
    return new Task(json, registry);
};

// Expose the Task
module.exports = Task;
