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
 * is a consistent thisArg for each handler function.
 *
 */
PathStack = function () {
  this._stack = [];
};

PathStack.prototype._create = function (path, fn, options) {
  var handler = new Handler(path, fn, options);
  var name = handler.name;

  if (name) {
    if (_.has(this._stack, name))
      throw new Error("Handler with name '" + name + "' already exists on the path stack!");
    this._stack[name] = handler;
  }

  return handler;
};

PathStack.prototype.findByName = function (name) {
  return this._stack[name];
};

/**
 * Push a new handler onto the stack.
 */
PathStack.prototype.push = function (path, fn, options) {
  var handler = this._create(path, fn, options);
  this._stack.push(handler);
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
PathStack.prototype.insertAt = function (index, path, fn, options) {
  var handler = this._create(path, fn, options);
  this._stack.splice(index, 0, handler);
  return this;
};

/**
 * Insert a handler before another named handler.
 *MaMaMaMa
 */
PathStack.prototype.insertBefore = function (name, path, fn, options) {
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
PathStack.prototype.insertAfter = function (name, path, fn, options) {
  var handler;
  var index;

  if (!(handler = this._stack[name]))
    throw new Error("Couldn't find a handler named '" + name + "' on the path stack");

  index = _.indexOf(this._stack, handler);
  this.insertAt(index + 1, path, fn, options);
  return this;
};


/**
 * Register a callback to get called if we need to go to the server. It's up to
 * the registered function to decide what to do with that information.
 */
PathStack.prototype.onServerDispatch = function (callback) {
  this._onServerDispatch = callback;
  return this;
};

PathStack.prototype.dispatch = function (url, options) {
  options = options || {};
  url = url || '/';

  var self = this;
  var req = options.req || {};
  var res = options.res || {};
  var index = 0;

  // when we find at least one handler for each environment we'll flip the
  // falses to true.
  var handlersForEnvironment = {client: false, server: false};

  // Let's always make "this" an object we can put stuff on
  var thisArg = options.thisArg || {};

  thisArg.req = thisArg.request = req;
  thisArg.res = thisArg.response = res;

  var out = function () {
    // where are we?
    var where = Meteor.isClient ? 'client' : 'server';

    // at least one server handler and we're on the client
    if (where === 'client' && handlersForEnvironment.server === true) {
      if (self._onServerDispatch)
        return self._onServerDispatch.apply(this, arguments);
    }

    // otherwise just punt out of this stack
    if (options.next)
      return options.next.apply(this, arguments);
  };

  (function next (err) {
    var handler = self._stack[index++];

    if (!handler)
      return out.call(thisArg, err);

    if (!handler.test(url, options))
      return next(err);

    // okay if we've gotten this far the handler matches our url but we still
    // don't know if this is a client or server handler. Let's track that.
    var where = Meteor.isClient ? 'client' : 'server';

    // track that we have a handler for the given environment
    handlersForEnvironment[handler.where] = true;

    if (handler.where !== where)
      return next(err);

    // get the parameters for this url from the handler's compiled path
    var params = handler.params(url);

    // Put params on the thisArg. Each handler might add different
    // params.
    thisArg.params = thisArg.params || {};
    _.extend(thisArg.params, handler.params(url));

    // and in case some Connect middleware expects the params to be on the
    // request object we'll put it there too.
    req.params = params;

    thisArg.next = next;

    try {
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
      // punt the error down the stack
      next(err);
    }
  })();
};

/**
 * The number of handlers on the stack.
 *
 */
Object.defineProperty(PathStack.prototype, "length", {
  get: function () {
    return this._stack.length;
  },

  writeable: false,
  configurable: false,
  enumerable: true
});

Iron = Iron || {};
Iron.PathStack = PathStack;
