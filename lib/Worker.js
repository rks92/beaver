/*
 * @title Worker
 * @copyright (c) 2015 Sensibill Inc.
 * @license MIT
 * @author Bradley Arsenault
 */

var async = require('async');

/**
 * @class Worker
 *
 * The worker is a worker that executes tasks that have been queued up at the registry
 *
 */


/**
 * Construct the worker.
 *
 * @method constructor
 *
 * @param queue - The queue which this worker will pull tasks from.
 * @param options - An object containing a set of options for this worker.
 *
 * @return {Object} - A freshly created Worker object, ready to start processing tasks from the queue.
 */
function Worker(queue, options)
{
    var self = this;

    self.running = false;
    self.queue = queue;
    self.tasksInProgress = 0;
    self.waitCallbacks = [];
}



/**
 * Starts task execution
 */
Worker.prototype.start = function start()
{
    var self = this;
    self.running = true;
};


/**
 * Stops task execution
 */
Worker.prototype.stop = function stop()
{
    var self = this;
    self.running = false;
};


/**
 * Waits for all tasks to finish processing, and then calls the callback.
 */
Worker.prototype.waitForAllTasksToFinish = function waitForAllTasksToFinish(done)
{
    var self = this;
    if(self.tasksInProgress == 0)
    {
        return done();
    }
    else 
    {
        self.waitCallbacks.push(done);
    }
};


/**
 * Executes the given task. This is an internal function which is called by Queue objects.
 *
 * @private
 *
 * @param task - The task object that this worker should execute.
 *
 * @param done - A callback that should be called when the task is done executing.
 */
Worker.prototype.executeTask = function executeTask(task, done)
{
    var self = this;
    self.tasksInProgress += 1;
    task.execute(function(err)
    {
        self.tasksInProgress -= 1;
        if(self.tasksInProgress == 0)
        {
            self.waitCallbacks.forEach(function(callback)
            {
                return callback();
            });
            self.waitCallbacks = [];
        }
        return done(err);
    });
};





// Expose the Worker
module.exports = Worker;

