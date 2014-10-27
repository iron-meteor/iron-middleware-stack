var Url = Iron.Url;

Handler = function (path, fn, options) {
  if (_.isFunction(path)) {
    options = options || fn || {};
    fn = path;
    path = '/';
    
    // probably need a better approach here to differentiate between
    // Router.use(function () {}) and Router.use(MyAdminApp). In the first
    // case we don't want to count it as a viable server handler when we're
    // on the client and need to decide whether to go to the server. in the
    // latter case, we DO want to go to the server, potentially.
    this.middleware = true;

    if (typeof options.mount === 'undefined')
      options.mount = true;
  }

  // if fn is a function then typeof fn => 'function'
  // but note we can't use _.isObject here because that will return true if the
  // fn is a function OR an object.
  if (typeof fn === 'object') {
    options = fn;
    fn = options.action || 'action';
  }

  options = options || {};

  this.options = options;
  this.mount = options.mount;
  this.method = (options.method && options.method.toLowerCase()) || false;

  // should the handler be on the 'client', 'server' or 'both'?
  this.where = options.where || 'client';

  // if we're mounting at path '/foo' then this handler should also handle
  // '/foo/bar' and '/foo/bar/baz'
  if (this.mount)
    options.end = false;

  // set the name
  if (options.name)
    this.name = options.name;
  else if (typeof path === 'string' && path.charAt(0) !== '/')
    this.name = path;
  else if (fn && fn.name)
    this.name = fn.name;
  else if (typeof path === 'string' && path !== '/')
    this.name = path.split('/').slice(1).join('.');

  // if the path is explicitly set on the options (e.g. legacy router support)
  // then use that
  // otherwise use the path argument which could also be a name
  path = options.path || path;

  if (typeof path === 'string' && path.charAt(0) !== '/')
    path = '/' + path;

  this.path = path;
  this.compiledUrl = new Url(path, options);

  if (_.isString(fn)) {
    this.handle = function handle () {
      // try to find a method on the current thisArg which might be a Controller
      // for example.
      var func = this[fn];

      if (typeof func !== 'function')
        throw new Error("No method named " + JSON.stringify(fn) + " found on handler.");

      return func.apply(this, arguments);
    };
  } else if (_.isFunction(fn)) {
    // or just a regular old function
    this.handle = fn;
  }
};

Handler.prototype.test = function (path, options) {
  if (this.method && options && options.method) {
    // if the handler has a method option defined, and this is a method request,
    // test whether this handler should respond to the given method
    return this.method == options.method.toLowerCase() && this.compiledUrl.test(path);
  } else
    // if a route or handler doesn't have a method specified, then it will
    // handle ALL methods
    return this.compiledUrl.test(path);
};

Handler.prototype.params = function (path) {
  return this.compiledUrl.params(path);
};

Handler.prototype.resolve = function (params, options) {
  return this.compiledUrl.resolve(params, options);
};

/**
 * Returns a new cloned Handler.
 * XXX problem is here because we're not storing the original path.
 */
Handler.prototype.clone = function () {
  var clone = new Handler(this.path, this.handle, this.options);
  // in case the original function had a name
  clone.name = this.name;
  return clone;
};
