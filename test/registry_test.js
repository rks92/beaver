/*
 * registry test.js
 *
 * Unit tests focused on the Registry class.
 *
 */

var beaver = require('../lib/lib'),
    assert = require('assert');


var globalTimeout = 30000;

describe("Registry", function()
{
    this.timeout(globalTimeout);
    it("Should be able to find registered tasks in the Registry.tasks object.", function(next)
    {
        // Construct the registry
        var registry = new beaver.Registry({defaultTimeout: null});

        // Register a task
        var taskName = "awesome_test_task";
        registry.registerTask({
            name: taskName,
            func: function (parameters, done)
            {
                return done();
            }
        });

        // Ensure that the task exists in the registrys list of tasks
        assert(registry.tasks[taskName]);

        return next();
    });


    it("Shouldn't be able to register a task with the same name twice.", function(next)
    {
        // Construct the registry
        var registry = new beaver.Registry({defaultTimeout: null});

        // Register a task
        var taskName = "awesome_test_task";
        registry.registerTask({
            name: taskName,
            func: function (parameters, done)
            {
                return done();
            }
        });

        // Register the same task again
        assert.throws(function()
        {
            registry.registerTask({
                name: taskName,
                func: function (parameters, done)
                {
                    return done();
                }
            });
        }, beaver.errors.TaskRegistrationError);

        return next();
    });


    it("Shouldn't be able to register a task with a blank name", function(next)
    {
        // Construct the registry
        var registry = new beaver.Registry({defaultTimeout: null});

        // Register the same task again
        assert.throws(function()
        {
            registry.registerTask({
                name: "",
                func: function (parameters, done)
                {
                    return done();
                }
            });
        }, beaver.errors.TaskRegistrationError);

        return next();
    });


    it("Shouldn't be able to register a task without a name", function(next)
    {
        // Construct the registry
        var registry = new beaver.Registry({defaultTimeout: null});

        // Register the same task again
        assert.throws(function()
        {
            registry.registerTask({
                func: function (parameters, done)
                {
                    return done();
                }
            });
        }, beaver.errors.TaskRegistrationError);

        return next();
    });


    it("Shouldn't be able to register a task without a function to execute", function(next)
    {
        // Construct the registry
        var registry = new beaver.Registry({defaultTimeout: null});

        // Register the same task again
        assert.throws(function()
        {
            registry.registerTask({
                name: "no_function_test_task"
            });
        }, beaver.errors.TaskRegistrationError);

        return next();
    });


    it("Shouldn't be able to register a task without a timeout if no default timeout has been set on the registry", function(next)
    {
        // Construct the registry
        var registry = new beaver.Registry({});

        // Register the task without a timeout, and no defaultTimeout is set on the registry.
        var taskName = "awesome_test_task";
        assert.throws(function()
        {
            registry.registerTask({
                name: taskName,
                func: function (parameters, done)
                {
                    return done();
                }
            });
        }, beaver.errors.TaskRegistrationError);

        return next();
    });


    it("Shouldn't be able to register a task with scheduling information but without an interval on that schedule", function(next)
    {
        // Construct the registry
        var registry = new beaver.Registry({defaultTimeout: null});

        // Register the task with a schedule object but no interval
        var taskName = "awesome_test_task";
        assert.throws(function()
        {
            registry.registerTask({
                name: taskName,
                schedule: {},
                func: function (parameters, done)
                {
                    return done();
                }
            });
        }, beaver.errors.TaskRegistrationError);

        return next();
    });

});