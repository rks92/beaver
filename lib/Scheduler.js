/*
 * @title Scheduler
 * @copyright (c) 2015 Sensibill Inc.
 * @license MIT
 * @author Bradley Arsenault
 */

var async = require('async');

/**
 * @class Scheduler
 *
 * The Scheduler is a class whose job is to schedule tasks that need to be run on a regular basis, such as cleanup routines, so
 * that they only execute once across an entire cluster.
 *
 */


/**
 * Construct the scheduler
 *
 * @method constructor
 *
 * @param queue - The queue which scheduled tasks will be added to.
 * @param options - An object containing a set of options for this scheduler.
 *
 * @return {Object} - A freshly created Scheduler, which will start scheduling tasks across the cluster.
 */
function Scheduler(queue, options)
{
    var self = this;

    self.running = false;
    self.queue = queue;
    self.registry = queue.registry;

    self.executionRecords = {};
}


/**
 * Starts scheduling tasks
 */
Scheduler.prototype.start = function start()
{
    var self = this;
    if(!self.running)
    {
        self.intervalHandle = setInterval(self.checkScheduledTasks.bind(self), 100);
    }

    self.running = true;
};


/**
 * Stops scheduling tasks
 */
Scheduler.prototype.stop = function stop()
{
    var self = this;
    if(self.running)
    {
        clearInterval(self.intervalHandle);
    }
    self.running = false;
};


/**
 * This method is run several times a second. It goes through all of the tasks that are put into the registry which need
 * to execute on a regular basis, and checks if they should be queued right now. There are various ways to do this.
 */
Scheduler.prototype.checkScheduledTasks = function checkScheduledTasks()
{
    var self = this;

    // Go through all of the registered tasks
    for(var taskName in self.registry.tasks)
    {
        var task = self.registry.tasks[taskName];
        // Only look at tasks with scheduling information
        if(task.schedule)
        {
            // Get information about the last time this task executed
            if(!self.executionRecords[taskName])
            {
                self.executionRecords[taskName] = {
                    time: 0
                };
            }
            var executionRecord = self.executionRecords[taskName];


            // Check whether it is time to execute this task
            var currentTime = new Date().getTime();
            if(currentTime > (executionRecord.time + task.schedule.interval))
            {
                // Queue the task!
                self.queue.queueTask(taskName, {});
                executionRecord.time = currentTime;
            }
        }
    }
};




// Expose the Scheduler
module.exports = Scheduler;

