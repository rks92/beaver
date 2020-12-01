/**
 * TaskTimedOutError.js
 *
 * Represents connection errors for AMQP
 */

"use strict";


var TaskTimedOutError = function TaskTimedOutError (message)
{
    Error.call(this, message);
    this.class = "TaskTimedOutError";
    this.msg = message;
};

/**
 * Inherit from Error
 */
TaskTimedOutError.prototype.__proto__ = Error.prototype;


/**
 * Expose `TaskTimedOutError`.
 */
module.exports = TaskTimedOutError;

