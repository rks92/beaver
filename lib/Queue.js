/*
 * @title Queue
 * @copyright (c) 2015 Sensibill Inc.
 * @license MIT
 * @author Bradley Arsenault
 */

var errors = require('./errors/errors');

/**
 * @class Queue
 *
 * This is the base class for all different types of Queues. A Queue is what manages the queuing of tasks for the worker library.
 *
 */


/**
 * Constructs a Queue object. Generally this Method should only be called by derived classes implementing the Queue interface.
 *
 * @method constructor
 *
 * @param registry - The worker registry which contains the registry of tasks
 * @param options - An object containing options for configuring this Queue.
 */
function Queue(registry, options)
{
    var self = this;

    self.registry = registry;
}



/**
 * Initializes the Queue. Executes things that must be done asynchronously, such as connections to third party services.
 *
 */
Queue.prototype.initialize = function initialize(done)
{
    var error = new Error("Queue.initialize is not implemented! Must be implemented by derived classes.");

    // Do nothing.
    if(done)
    {
        return done(error);
    }
    else
    {
        throw error;
    }
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
Queue.prototype.queueTask = function queueTask(name, parameters, done)
{
    var error = new Error("Queue.queueTask is not implemented! Must be implemented by derived classes.");

    // Do nothing.
    if(done)
    {
        return done(error);
    }
    else
    {
        throw error;
    }
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
Queue.prototype.registerWorker = function registerWorker(worker, done)
{
    var error = new Error("Queue.registerWorker is not implemented! Must be implemented by derived classes.");

    // Do nothing.
    if(done)
    {
        return done(error);
    }
    else
    {
        throw error;
    }
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
Queue.prototype.removeWorker = function removeWorker(worker, done)
{
    var error = new Error("Queue.removeWorker is not implemented! Must be implemented by derived classes.");

    // Do nothing.
    if(done)
    {
        return done(error);
    }
    else
    {
        throw error;
    }
};


/**
 * Checks to see if the given task name and parameters are valid. Will throw an error if the task is not valid.
 *
 * @method checkTask
 *
 * @param name - The name of the task to be queued
 * @param parameters - A simple object with parameters sent to the task. Must be JSON serializable - e.g. no circular references
 */
Queue.prototype.checkTask = function checkTask(name, parameters)
{
    var self = this;

    // See if the task is a real task registered at the registry.
    if(!self.registry.tasks[name])
    {
        throw new errors.TaskNotRegisteredError("The task you are trying to queue, " + name + ", is not currently registered at the registry.");
    }
};





// Expose the queue
module.exports = Queue;