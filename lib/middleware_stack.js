//TODO Fix mount path issues and tests

var Url = Iron.Url;

/**
 * Connect inspired middleware stack that works on the client and the server.
 *
 * You can add handlers to the stack for various paths. Those handlers can run
 * on the client or server. Then you can dispatch into the stack with a
 * given path by calling the dispatch method. This goes down the stack looking
 * for matching handlers given the url and environment (client/server). If we're
 * on the client and we should make a trip to the server, the onServerDispatch
 * callback is called.
 *
 * The middleware stack supports the Connect API. But it also allows you to
 * specify a thisArg so we can have one context object (like a Controller) that
 * is a consistent thisArg for each handler function called on a dispatch.
 *
 */
MiddlewareStack = function () {
  this._stack = [];
};

MiddlewareStack.prototype._create = function (path, fn, options) {
  var handler = new Handler(path, fn, options);
  var name = handler.name;

  if (name) {
    if (_.has(this._stack, name)) {
      throw new Error("Handler with name '" + name + "' already exists.");
    }
    this._stack[name] = handler;
  }

  return handler;
};

MiddlewareStack.prototype.findByName = function (name) {
  return this._stack[name];
};

/**
 * Push a new handler onto the stack.
 */
MiddlewareStack.prototype.push = function (path, fn, options) {
  var handler = this._create(path, fn, options);
  this._stack.push(handler);
  return handler;
};

MiddlewareStack.prototype.append = function (/* fn1, fn2, [f3, f4]... */) {
  var self = this;
  var args = _.toArray(arguments);
  var options = {};

  if (typeof args[args.length-1] === 'object')
    options = args.pop();

  args.forEach(function (fnOrArray) {
    if (typeof fnOrArray === 'undefined')
      return;
    else if (typeof fnOrArray === 'function')
      self.push(fnOrArray, options);
    else if (_.isArray(fnOrArray))
      self.append.apply(self, fnOrArray.concat([options]));
    else
      throw new Error("Can only append functions or arrays to the MiddlewareStack");
  });

  return this;
};

/**
 * Insert a handler at a specific index in the stack.
 *
 * The index behavior is the same as Array.prototype.splice. If the index is
 * greater than the stack length the handler will be appended at the end of the
 * stack. If the index is negative, the item will be inserted "index" elements
 * from the end.
 */
MiddlewareStack.prototype.insertAt = function (index, path, fn, options) {
  var handler = this._create(path, fn, options);
  this._stack.splice(index, 0, handler);
  return this;
};

/**
 * Insert a handler before another named handler.
 */
MiddlewareStack.prototype.insertBefore = function (name, path, fn, options) {
  var beforeHandler;
  var index;

  if (!(beforeHandler = this._stack[name]))
    throw new Error("Couldn't find a handler named '" + name + "' on the path stack");

  index = _.indexOf(this._stack, beforeHandler);
  this.insertAt(index, path, fn, options);
  return this;
};

/**
 * Insert a handler after another named handler.
 *
 */
MiddlewareStack.prototype.insertAfter = function (name, path, fn, options) {
  var handler;
  var index;

  if (!(handler = this._stack[name]))
    throw new Error("Couldn't find a handler named '" + name + "' on the path stack");

  index = _.indexOf(this._stack, handler);
  this.insertAt(index + 1, path, fn, options);
  return this;
};

/**
 * Return a new MiddlewareStack comprised of this stack joined with other
 * stacks. Note the new stack will not have named handlers anymore. Only the
 * handlers are cloned but not the name=>handler mapping.
 */
MiddlewareStack.prototype.concat = function (/* stack1, stack2, */) {
  var ret = new MiddlewareStack;
  var concat = Array.prototype.concat;
  var clonedThisStack = EJSON.clone(this._stack);
  var clonedOtherStacks = _.map(_.toArray(arguments), function (s) { return EJSON.clone(s._stack); });
  ret._stack = concat.apply(clonedThisStack, clonedOtherStacks); 
  return ret;
};

/**
 * Register a callback to get called if we need to go to the server. It's up to
 * the registered function to decide what to do with that information.
 */
MiddlewareStack.prototype.onServerDispatch = function (callback) {
  this._onServerDispatch = callback;
  return this;
};

MiddlewareStack.prototype.dispatch = function dispatch (url, options) {
  options = options || {};
  url = Url.normalize(url || '/');

  var self = this;
  var req = options.req || {};
  var res = options.res || {};
  var index = 0;
  var handled = false;
  var parsedUrl = Url.parse(url);

  // when we find at least one handler for each environment we'll flip the
  // falses to true.
  var handlersForEnvironment = {client: false, server: false};

  // Let's always make "this" an object we can put stuff on for the duration of
  // this dispatch.
  var thisArg = options.thisArg || {};

  thisArg.req = thisArg.request = req;
  thisArg.res = thisArg.response = res;
  thisArg.parsedUrl = parsedUrl;
  thisArg.originalUrl = req.originalUrl = thisArg.originalUrl || url;
  thisArg.method = req.method;

  thisArg.isHandled = function () {
    return handled;
  };

  thisArg.isHandledOnClient = function () {
    return handlersForEnvironment.client;
  };

  thisArg.isHandledOnServer = function () {
    return handlersForEnvironment.server;
  };

  var done = function () {
    // otherwise just punt out of this stack
    if (options.next) {
      try {
        options.next.apply(this, arguments);
      } catch (err) {
        // if we catch an error at this point in the stack we don't want it
        // handled in the next() iterator below. So we'll mark the error to tell
        // the next iterator to ignore it.
        err._punt = true;

        // now rethrow it!
        throw err;
      }
    }
  };

  (function next (err) {
    var handler = self._stack[index++];

    if (!handler)
      return done.call(thisArg, err);

    if (!handler.test(url, {method: thisArg.method}))
      return next(err);

    // okay if we've gotten this far the handler matches our url but we still
    // don't know if this is a client or server handler. Let's track that.
    var where = Meteor.isClient ? 'client' : 'server';

    // track that we have a handler for the given environment
    handlersForEnvironment[handler.where] = true;

    if (handler.where !== where)
      return next(err);

    // okay go time, we have a handler.
    handled = true;

    // get the parameters for this url from the handler's compiled path
    var params = handler.params(url);

    // Put params on the thisArg. Each handler might add different
    // params.
    thisArg.params = req.params = thisArg.params || {};
    _.extend(thisArg.params, handler.params(url));

    // so we can call this.next()
    thisArg.next = next;

    if (handler.mount) {
      // grab the path the handler was mounted at such as /foo/bar
      // XXX double check this isn't stripping the leading /
      var mountpath = Url.normalize(handler.compiledUrl.pathname);

      // now if the originalUrl is /foo/bar/baz remove the /foo/bar prefix from
      // the originalUrl and that becomes the new url for now
      if (mountpath.length > 1)
        thisArg.url = req.url = url.substr(mountpath.length, url.length);
      else
        thisArg.url = req.url = thisArg.originalUrl;
    } else {
      // otherwise the url is the originalUrl which we have to set on each
      // iteration of next() in case it was set to something else.
      thisArg.url = req.url = thisArg.originalUrl;
    }

    try {
      //
      // The connect api says a handler signature (arity) can look like any of:
      //
      // 1) function (req, res, next)
      // 2) function (err, req, res, next)
      // 3) function (err)
      var arity = handler.handle.length

      // function (err, req, res, next)
      if (err && arity === 4)
        return handler.handle.call(thisArg, err, req, res, next);

      // function (req, res, next)
      if (!err && arity < 4)
        return handler.handle.call(thisArg, req, res, next);

      // default is function (err) so punt the error down the stack
      // until we either find a handler who likes to deal with errors or we call
      // out
      return next(err);
    } catch (err) {
      if (err._punt)
        // ignore this error and throw it down the stack
        throw err;
      else
        // see if the next handler wants to deal with the error
        next(err);
    }
  })();

  // now that we've unwound, let's see whether we should go to the server.

  // where are we?
  var where = Meteor.isClient ? 'client' : 'server';

  delete thisArg.next;

  // at least one server handler and we're on the client
  if (where === 'client' && handlersForEnvironment.server === true) {
    if (self._onServerDispatch) {
      self._onServerDispatch.call(thisArg, url, options);
    }
  }

  return thisArg;
};

/**
 * The number of handlers on the stack.
 *
 */
Object.defineProperty(MiddlewareStack.prototype, "length", {
  get: function () {
    return this._stack.length;
  },

  writeable: false,
  configurable: false,
  enumerable: true
});

Iron = Iron || {};
Iron.MiddlewareStack = MiddlewareStack;
