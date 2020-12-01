Ext.data.JsonP.Queue({"tagname":"class","name":"Queue","autodetected":{},"files":[{"filename":"Queue.js","href":"Queue.html#Queue"}],"members":[{"name":"constructor","tagname":"method","owner":"Queue","id":"method-constructor","meta":{}},{"name":"checkTask","tagname":"method","owner":"Queue","id":"method-checkTask","meta":{}},{"name":"initialize","tagname":"method","owner":"Queue","id":"method-initialize","meta":{}},{"name":"queueTask","tagname":"method","owner":"Queue","id":"method-queueTask","meta":{}},{"name":"registerWorker","tagname":"method","owner":"Queue","id":"method-registerWorker","meta":{}}],"alternateClassNames":[],"aliases":{},"id":"class-Queue","short_doc":"This is the base class for all different types of Queues. ...","component":false,"superclasses":[],"subclasses":[],"mixedInto":[],"mixins":[],"parentMixins":[],"requires":[],"uses":[],"html":"<div><pre class=\"hierarchy\"><h4>Files</h4><div class='dependency'><a href='source/Queue.html#Queue' target='_blank'>Queue.js</a></div></pre><div class='doc-contents'><p>This is the base class for all different types of Queues. A Queue is what manages the queuing of tasks for the worker library.</p>\n</div><div class='members'><div class='members-section'><div class='definedBy'>Defined By</div><h3 class='members-title icon-method'>Methods</h3><div class='subsection'><div id='method-constructor' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Queue'>Queue</span><br/><a href='source/Queue.html#Queue-method-constructor' target='_blank' class='view-source'>view source</a></div><strong class='new-keyword'>new</strong><a href='#!/api/Queue-method-constructor' class='name expandable'>Queue</a>( <span class='pre'>registry, options</span> ) : <a href=\"#!/api/Queue\" rel=\"Queue\" class=\"docClass\">Queue</a><span class=\"signature\"></span></div><div class='description'><div class='short'>Constructs a Queue object. ...</div><div class='long'><p>Constructs a Queue object. Generally this Method should only be called by derived classes implementing the Queue interface.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>registry</span> : Object<div class='sub-desc'><ul>\n<li>The worker registry which contains the registry of tasks</li>\n</ul>\n\n</div></li><li><span class='pre'>options</span> : Object<div class='sub-desc'><ul>\n<li>An object containing options for configuring this Queue.</li>\n</ul>\n\n</div></li></ul><h3 class='pa'>Returns</h3><ul><li><span class='pre'><a href=\"#!/api/Queue\" rel=\"Queue\" class=\"docClass\">Queue</a></span><div class='sub-desc'>\n</div></li></ul></div></div></div><div id='method-checkTask' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Queue'>Queue</span><br/><a href='source/Queue.html#Queue-method-checkTask' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Queue-method-checkTask' class='name expandable'>checkTask</a>( <span class='pre'>name, parameters</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Checks to see if the given task name and parameters are valid. ...</div><div class='long'><p>Checks to see if the given task name and parameters are valid. Will throw an error if the task is not valid.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>name</span> : Object<div class='sub-desc'><ul>\n<li>The name of the task to be queued</li>\n</ul>\n\n</div></li><li><span class='pre'>parameters</span> : Object<div class='sub-desc'><ul>\n<li>A simple object with parameters sent to the task. Must be JSON serializable - e.g. no circular references</li>\n</ul>\n\n</div></li></ul></div></div></div><div id='method-initialize' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Queue'>Queue</span><br/><a href='source/Queue.html#Queue-method-initialize' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Queue-method-initialize' class='name expandable'>initialize</a>( <span class='pre'>done</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Initializes the Queue. ...</div><div class='long'><p>Initializes the Queue. Executes things that must be done asynchronously, such as connections to third party services.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>done</span> : Object<div class='sub-desc'></div></li></ul></div></div></div><div id='method-queueTask' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Queue'>Queue</span><br/><a href='source/Queue.html#Queue-method-queueTask' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Queue-method-queueTask' class='name expandable'>queueTask</a>( <span class='pre'>name, parameters, [done]</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Queues a task to be executed ...</div><div class='long'><p>Queues a task to be executed</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>name</span> : Object<div class='sub-desc'><ul>\n<li>The name of the task to be queued</li>\n</ul>\n\n</div></li><li><span class='pre'>parameters</span> : Object<div class='sub-desc'><ul>\n<li>A simple object with parameters sent to the task. Must be JSON serializable - e.g. no circular references</li>\n</ul>\n\n</div></li><li><span class='pre'>done</span> : Object (optional)<div class='sub-desc'><ul>\n<li>A callback to be executed after the task has been successfully queued</li>\n</ul>\n\n</div></li></ul></div></div></div><div id='method-registerWorker' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='Queue'>Queue</span><br/><a href='source/Queue.html#Queue-method-registerWorker' target='_blank' class='view-source'>view source</a></div><a href='#!/api/Queue-method-registerWorker' class='name expandable'>registerWorker</a>( <span class='pre'>worker, done</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>This function is used to register a worker to execute tasks on this queue. ...</div><div class='long'><p>This function is used to register a worker to execute tasks on this queue.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>worker</span> : Object<div class='sub-desc'><ul>\n<li>The worker object to execute tasks.</li>\n</ul>\n\n</div></li><li><span class='pre'>done</span> : Object<div class='sub-desc'><ul>\n<li>A callback in the form of function(err) that will be called once the worker is successfully registered to execute\n\n<pre><code>      - tasks from this Queue.\n</code></pre></li>\n</ul>\n\n</div></li></ul></div></div></div></div></div></div></div>","meta":{}});