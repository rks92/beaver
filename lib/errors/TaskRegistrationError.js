/**
 * TaskRegistrationError.js
 *
 * Represents connection errors for AMQP
 */

"use strict";


var TaskRegistrationError = function TaskRegistrationError (message)
{
    Error.call(this, message);
    this.class = "TaskRegistrationError";
    this.msg = message;
};

/**
 * Inherit from Error
 */
TaskRegistrationError.prototype.__proto__ = Error.prototype;


/**
 * Expose `TaskRegistrationError`.
 */
module.exports = TaskRegistrationError;

