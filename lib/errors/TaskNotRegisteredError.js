/**
 * TaskNotRegisteredError.js
 *
 * Represents connection errors for AMQP
 */

"use strict";


var TaskNotRegisteredError = function TaskNotRegisteredError (message)
{
    Error.call(this, message);
    this.class = "TaskNotRegisteredError";
    this.msg = message;
};

/**
 * Inherit from Error
 */
TaskNotRegisteredError.prototype.__proto__ = Error.prototype;


/**
 * Expose `TaskNotRegisteredError`.
 */
module.exports = TaskNotRegisteredError;

