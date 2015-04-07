/* AjaxHandler interface. */

var AjaxHandler = new Interface('AjaxHandler', [ 'request', 'createXhrObject' ]);

/* SimpleHandler class. */

var SimpleHandler = function() {}; // implements AjaxHandler
SimpleHandler.prototype = {
	request : function(method, url, callback, postVars) {
		var xhr = this.createXhrObject();
		xhr.onreadystatechange = function() {
			if (xhr.readyState !== 4)
				return;
			(xhr.status === 200) ? callback.success(xhr.responseText,
					xhr.responseXML) : callback.failure(xhr.status);
		};
		xhr.open(method, url, true);
		if (method !== 'POST')
			postVars = null;
		xhr.send(postVars);
	},
	createXhrObject : function() { // Factory method.
		var methods = [ 
		function() {return new XMLHttpRequest();}, 
		function() {return new ActiveXObject('Msxml2.XMLHTTP');}, 
		function() {return new ActiveXObject('Microsoft.XMLHTTP');} ];

		for ( var i = 0, len = methods.length; i < len; i++) {
			try {
				methods[i]();
			} catch (e) {
				continue;
			}
			// If we reach this point, method[i] worked.
			this.createXhrObject = methods[i]; // Memoize the method.
			return methods[i]();
		}

		// If we reach this point, none of the methods worked.
		throw new Error('SimpleHandler: Could not create an XHR object.');
	},
	createXMLObject : function(xmlString) {
		var doc = null;

		if (window.ActiveXObject) {
			var ActiveIds = [ 'MSXML2.XMLDOM', 'Microsoft.XMLDOM',
					'MSXML.XMLDOM', 'MSXML3.XMLDOM' ];
			for ( var len = ActiveIds.length, i = 0; i < len; i++) {
				var id = ActiveIds[i];
				try {
					var doc = new ActiveXObject(id);
					doc.async = false;
					doc.setProperty('SelectionLanguage', 'XPath');
					doc.loadXML(xmlString);
					break;
				} catch (e) {
				} finally {
					if (doc && doc.parseError && doc.parseError.errorCode != 0) {
						throw {
							parser : 'MSXML',
							message : doc.parseError.reason,
							xml : xmlString,
							func : 'xmlDocument'
						};
					}
				}
			}
		} else if (typeof DOMParser != 'undefined') {
			var parser = new DOMParser();
			var doc = parser.parseFromString(xmlString, 'text/xml');
			if (doc.documentElement.nodeName == 'parsererror') {
				throw {
					parser : 'DOMParser',
					message : doc.documentElement.firstChild.nodeValue,
					xml : xmlString,
					func : 'xmlDocument'
				};
			}
		} else {
			return false;
		}

		return doc;
	}
};
/* QueueHandler class */
var QueuedHandler = function() { // implements AjaxHandler
	this.queue = [];
	this.requestInProgress = false;
	this.retryDelay = 5;
};
extend(QueuedHandler, SimpleHandler);
QueuedHandler.prototype.request = function(method, url, callback, postVars,
		override) {
	if (this.requestInProgress && !override) {
		this.queue.push({
			method : method,
			url : url,
			callback : callback,
			postVars : postVars
		});
	} else {
		this.requestInProgress = true;
		var xhr = this.createXhrObject();
		var that = this;
		xhr.onreadystatechange = function() {
			if (xhr.readyState !== 4)
				return;
			if (xhr.status === 200) {
				callback.success(xhr.responseText, xhr.responseXML);
				that.advanceQueue();
			} else {
				callback.failure(xhr.status);
				setTimeout(function() {
					that.request(method, url, callback, postVars, true);
				}, that.retryDelay * 1000);
			}
		};
		xhr.open(method, url, true);
		if (method !== 'POST')
			postVars = null;
		xhr.send(postVars);
	}
};
QueuedHandler.prototype.advanceQueue = function() {
	if (this.queue.length === 0) {
		this.requestInProgress = false;
		return;
	}
	var req = this.queue.shift();
	this.request(req.method, req.url, req.callback, req.postVars, true);
}
/* OfflineHandler class */
/*ÔÝ»º²¹È«*/

/* XhrManager singleton */
var XhrManager = {
	createXhrHandler : function() {
		var xhr = new SimpleHandler();
		Interface.ensureImplements(xhr, AjaxHandler);
		return xhr
	}
}

