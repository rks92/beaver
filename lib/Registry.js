/*
 * @title Registry
 * @copyright (c) 2015 Sensibill Inc.
 * @license MIT
 * @author Bradley Arsenault
 */

var errors = require('./errors/errors'),
    underscore = require('underscore');

/**
 * @class Registry
 *
 * The Registry is a central object where all tasks that need to be executed get registered.
 *
 * @member {Object}  tasks     An object mapping task-names to descriptions of those tasks
 *
 */

/**
 * Construct the worker registry.
 *
 * @method constructor
 *
 * @param {Object} options An options object containing each of the following fields:
 *
 * @param {Number} [options.defaultTimeout] - This is the default timeout for all tasks across the system. If this is not set,
 *                                            all tasks must have a timeout set on their task options. When set to null,
 *                                            this is the same as disabling timeouts by default.

 * @return {Object} A freshly created Registry object.
 */
function Registry (options)
{
    var self = this;

    self.options = options;

    self.hooks = {
        stderr:             [],
        queue:              [],
        retry:              [],
        start:              [],
        metadata:           [],
        log:                [],
        percentageComplete: [],
        result:             [],
        finish:             [],
        error:              []
    };


    self.tasks = {};
}

/**
 * Allows registering general purpose hooks that can be called in a variety of circumstances.
 *
 * @param hook - The name of the hook to be plugged into. The following are acceptable hooks:
 *
 * "stderr" - This is a hook that is called anytime Beaver emits a message that it otherwise would have sent to console.error.
 *            The function should be in the form function(msg). Note the absence of a callback. These are typically messages
 *            where the error can not be sent to a particular callback, because it happened during polling or some other
 *            internal process.
 *
 * "queue" - This is a hook that is called when a task is being queued. The function should be in the form function(task, done)
 *           You can record additional information to be stored with the task before it is queued using task.saveMetadata
 *
 * "retry" - This is a hook that is called when a task is queued for a retry. This happens when a task returns an error, or the server
 *           executing the task crashed during its execution. The function should be in the form function(task, done)
 * 
 * "start" - This is a hook that is called just prior to a task starting execution. The function should be in the form function(task, done)
 * 
 * "metadata" - This is a hook that is called after the metadata on the task has changed. function(task, done)
 *
 * "log" - This is a hook that will be called every time a log message is emitted by a task. The function should be in the form function(task, log_level, message, done)
 *
 * "percentageComplete" - This is a hook that will be called every time the client changes the percent completion of the task. The function should be in the form function(task, percent, done)
 *
 * "result" - This is a hook that will be called anytime a task registers a result value. The function should be in the form function(task, result, done)
 *
 * "finish" - This is a hook that will be called when a task finishes successfully. This hook is mutually exclusive with the "error" hook. The function should be in the form function(task, done)
 *
 * "error" - This is a hook that will be called if a task sends back an error. This hook is mutually exclusive with the "finish" hook. The function should be in the form function(task, error, done)
 *
 * @param func - The function to be called when the triggering event for the hook occurs. The function form varies depending on the hook.
 *
 */
Registry.prototype.registerHook = function registerHook (hook, func)
{
    var self = this;
    if (!underscore.isString(hook))
    {
        throw new Error("Hook name must be a String");
    }

    if (!self.hooks[hook])
    {
        throw new Error("You are trying to plug into a hook, \"" + hook + "\", that doesn't exist!");
    }

    self.hooks[hook].push(func);
};


/**
 * Register a task that can be executed
 * @method registerTask
 *
 *
 * @param task - Task is an object containing information about the task being registered.
 * @param task.name - A machine-readable name representing the task
 * @param task.func - A function in the form of function(parameters, done) {} which executes the task itself.
 *                     - parameters will be an object containing all parameters that were given for this task.
 *                     - done is the callback that should called when the task has finished executing.
 *
 *                     The function will be called with a Task instance as this. Task instances have a few
 *                     additional functions. @see Task
 *
 * @param task.schedule - An object containing information about how to schedule this task, if this is an automatically
 *                        scheduled task.
 *
 * @param task.concurrencyPerWorker - How many tasks will be executed in parallel for each worker. Defaults to 1.
 *
 * @param task.maximumAttempts - The maximum number of times a task will be executed before Beaver gives up. Defaults to 1, indicating
 *                              that the system will not attempt to retry the task if it fails.
 *
 * @param task.schedule.interval - The number of milliseconds between executions of this task.
 *
 * @param [task.timeout] - The timeout on the task. If set to null, the task will only close when finished.
 *              All tasks should set timeouts! Otherwise hung / badly programmed tasks may bring
 *              your worker to a halt. This field is mandatory unless a defaultTimeout is set
 *              registry-wide. Timeout may impose a maximum runtime on the task.
 *
 * @param {Array} [task.redactParameters] - This can be used to provide a list of parameters that must be redacted if the task is
 *                                          stored in a database anywhere. This can prevent parameters such as passwords from
 *                                           being stored anywhere permanently.
 * }
 */
Registry.prototype.registerTask = function registerTask (task)
{
    var self = this;

    // Make sure the given task has a name
    if (task.name === undefined || task.name === null)
    {
        throw new errors.TaskRegistrationError("Can not register a task without a name.");
    }

    // Make sure the given task name is not blank
    if (task.name === "")
    {
        throw new errors.TaskRegistrationError("Can't register a task with a blank name.");
    }

    // Make sure the given task name is not composed entirely of whitespace
    if (task.name.trim() === "")
    {
        throw new errors.TaskRegistrationError("Can't register a task with a name composed entirely of whitespace!");
    }

    // Check to see if a task with the given name already exists.
    if (self.tasks[task.name] !== undefined)
    {
        throw new errors.TaskRegistrationError("A task with the name \"" + task.name + "\" already exists.");
    }

    // Can't register a task without a function to execute
    if (task.func === undefined)
    {
        throw new errors.TaskRegistrationError("Can't register task " + task.name + ". Can't register a task without a function to execute.");
    }

    // Make sure its actually a function
    if (!underscore.isFunction(task.func))
    {
        throw new errors.TaskRegistrationError("Can't register task " + task.name + ". The func field must be a function object.");
    }

    // If there is no default timeout set on the registry, ensure that the given task has a default timeout.
    if (self.options.defaultTimeout === undefined && task.timeout === undefined)
    {
        throw new errors.TaskRegistrationError("Can't register task " + task.name + ". You must set either a defaultTimeout on the Registry, or a timeout on individual task objects.");
    }

    // If there is a schedule but no interval set on the schedule, throw an error
    if (task.schedule && !task.schedule.interval)
    {
        throw new errors.TaskRegistrationError("Can't register task " + task.name + ". Scheduling information must contain at least the interval field.");
    }

    if (!task.redactParameters)
    {
        task.redactParameters = [];
    }

    if(!task.concurrencyPerWorker)
    {
        task.concurrencyPerWorker = 1;
    }

    if(task.maximumAttempts === undefined)
    {
        task.maximumAttempts = 1;
    }

    self.tasks[task.name] = task;
};


// Expose the registry
module.exports = Registry;
