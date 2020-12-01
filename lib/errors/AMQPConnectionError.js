/**
 * AMQPConnectionError.js
 *
 * Represents connection errors for AMQP
 */

"use strict";


var AMQPConnectionError = function AMQPConnectionError (message)
{
    Error.call(this, message);
    this.class = "AMQPConnectionError";
    this.msg = message;
};

/**
 * Inherit from Error
 */
AMQPConnectionError.prototype.__proto__ = Error.prototype;


/**
 * Expose `AMQPConnectionError`.
 */
module.exports = AMQPConnectionError;

