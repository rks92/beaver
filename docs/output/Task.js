Ext.data.JsonP.Task({"tagname":"class","name":"Task","autodetected":{},"files":[{"filename":"Task.js","href":"Task.html#Task"}],"owner":null,"members":[{"name":"constructor","tagname":"method","owner":"Task","id":"method-constructor","meta":{"private":true}},{"name":"addMetadata","tagname":"method","owner":"Task","id":"method-addMetadata","meta":{}},{"name":"addResult","tagname":"method","owner":"Task","id":"method-addResult","meta":{}},{"name":"deserializeJSON","tagname":"method","owner":"Task","id":"method-deserializeJSON","meta":{}},{"name":"execute","tagname":"method","owner":"Task","id":"method-execute","meta":{}},{"name":"log","tagname":"method","owner":"Task","id":"method-log","meta":{}},{"name":"serializeJSON","tagname":"method","owner":"Task","id":"method-serializeJSON","meta":{}},{"name":"updatePercentageComplete","tagname":"method","owner":"Task","id":"method-updatePercentageComplete","meta":{}}],"alternateClassNames":[],"aliases":{},"id":"class-Task","short_doc":"A task is a single instance of a task that is being worked on by the engine. ...","component":false,"superclasses":[],"subclasses":[],"mixedInto":[],"mixins":[],"parentMixins":[],"requires":[],"uses":[],"html":"<div><pre class=\"hierarchy\"><h4>Files</h4><div class='dependency'><a href='source/Task.html#Task' target='_blank'>Task.js</a></div></pre><div class='doc-contents'><p>A task is a single instance of a task that is being worked on by the engine.</p>\n\n<p>{String}  history - A string containing the log history for this task\n{Number}  complete - A number with what the percent completion of this task is. Between 0 and 100.</p>\n</div><div class='members'><div class='members-section'><div class='definedBy'>Defined By</div><h3 class='members-title icon-method'>Methods</h3><div class='subsection'><div id='method-constructor' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Task'>Task</span><br/><a href='source/Task.html#Task-method-constructor' target='_blank' class='view-source'>view source</a></div><strong class='new-keyword'>new</strong><a href='#!/api/Task-method-constructor' class='name expandable'>Task</a>( <span class='pre'>data, registry</span> ) : <a href=\"#!/api/Task\" rel=\"Task\" class=\"docClass\">Task</a><span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>Construct a task. ...</div><div class='long'><p>Construct a task. This should only be done internally by the Worker system.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>data</span> : Object<div class='sub-desc'><p>for the task object</p>\n</div></li><li><span class='pre'>registry</span> : Object<div class='sub-desc'><ul>\n<li>the registry where all tasks are registered</li>\n</ul>\n\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'><a href=\"#!/api/Task\" rel=\"Task\" class=\"docClass\">Task</a></span><div class='sub-desc'><p>A freshly created Task object.</p>\n</div></li></ul></div></div></div><div id='method-addMetadata' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Task'>Task</span><br/><a href='source/Task.html#Task-method-addMetadata' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Task-method-addMetadata' class='name expandable'>addMetadata</a>( <span class='pre'>name, value</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Add a piece of metadata that should be serialized along with the task when its queued ...</div><div class='long'><p>Add a piece of metadata that should be serialized along with the task when its queued</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>name</span> : Object<div class='sub-desc'></div></li><li><span class='pre'>value</span> : Object<div class='sub-desc'></div></li></ul></div></div></div><div id='method-addResult' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Task'>Task</span><br/><a href='source/Task.html#Task-method-addResult' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Task-method-addResult' class='name expandable'>addResult</a>( <span class='pre'>result, [done]</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>This method allows you to record \"results\" from the task object. ...</div><div class='long'><p>This method allows you to record \"results\" from the task object.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>result</span> : Object<div class='sub-desc'><ul>\n<li>A JSON serializable value/object which will be sent to any result hooks and stored with the Task permamently.</li>\n</ul>\n\n</div></li><li><span class='pre'>done</span> : Object (optional)<div class='sub-desc'><ul>\n<li>An optional callback that will be issued once the result is successfully stored.</li>\n</ul>\n\n</div></li></ul></div></div></div><div id='method-deserializeJSON' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Task'>Task</span><br/><a href='source/Task.html#Task-method-deserializeJSON' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Task-method-deserializeJSON' class='name expandable'>deserializeJSON</a>( <span class='pre'>json, registry</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Deserializes the given JSON back into a Task object, with the given registry object. ...</div><div class='long'><p>Deserializes the given JSON back into a Task object, with the given registry object.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>json</span> : Object<div class='sub-desc'><ul>\n<li>The JSON object that needs to be deserialized.</li>\n</ul>\n\n</div></li><li><span class='pre'>registry</span> : Object<div class='sub-desc'><ul>\n<li>A Registry object that holds the registration of tasks</li>\n</ul>\n\n</div></li></ul></div></div></div><div id='method-execute' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Task'>Task</span><br/><a href='source/Task.html#Task-method-execute' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Task-method-execute' class='name expandable'>execute</a>( <span class='pre'>done</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>This method executes the task. ...</div><div class='long'><p>This method executes the task.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>done</span> : Object<div class='sub-desc'><ul>\n<li>A callback that will be called when this task is done execution.</li>\n</ul>\n\n</div></li></ul></div></div></div><div id='method-log' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Task'>Task</span><br/><a href='source/Task.html#Task-method-log' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Task-method-log' class='name expandable'>log</a>( <span class='pre'>[level], message, [done]</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>This method allows tasks to record log output. ...</div><div class='long'><p>This method allows tasks to record log output. This can be used to provide information on how the task is processing.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>level</span> : String (optional)<div class='sub-desc'><ul>\n<li>An optional log level for the message. Default to 'info'</li>\n</ul>\n\n</div></li><li><span class='pre'>message</span> : Object<div class='sub-desc'><ul>\n<li>a string providing the message for the task log output.</li>\n</ul>\n\n</div></li><li><span class='pre'>done</span> : Object (optional)<div class='sub-desc'><ul>\n<li>an optional callback that will be called once the log message has been successfully recorded.</li>\n</ul>\n\n</div></li></ul></div></div></div><div id='method-serializeJSON' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Task'>Task</span><br/><a href='source/Task.html#Task-method-serializeJSON' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Task-method-serializeJSON' class='name expandable'>serializeJSON</a>( <span class='pre'></span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Serialize the task object into a JSON form that can later be deserialized ...</div><div class='long'><p>Serialize the task object into a JSON form that can later be deserialized</p>\n</div></div></div><div id='method-updatePercentageComplete' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Task'>Task</span><br/><a href='source/Task.html#Task-method-updatePercentageComplete' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Task-method-updatePercentageComplete' class='name expandable'>updatePercentageComplete</a>( <span class='pre'>percent, [level], message, [done]</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>This method allows you to both log a message and update the completion percentage in a single API call, for convenience. ...</div><div class='long'><p>This method allows you to both log a message and update the completion percentage in a single API call, for convenience.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>percent</span> : Object<div class='sub-desc'><ul>\n<li>A number between 0 and 100 which indicates how close the task is to completion.</li>\n</ul>\n\n</div></li><li><span class='pre'>level</span> : String (optional)<div class='sub-desc'><ul>\n<li>An optional log level for the message. Default to 'info'</li>\n</ul>\n\n</div></li><li><span class='pre'>message</span> : Object<div class='sub-desc'><ul>\n<li>a string providing the message for the task log output.</li>\n</ul>\n\n</div></li><li><span class='pre'>done</span> : Object (optional)<div class='sub-desc'><ul>\n<li>An optional callback that will be issued</li>\n</ul>\n\n</div></li></ul></div></div></div></div></div></div></div>","meta":{}});