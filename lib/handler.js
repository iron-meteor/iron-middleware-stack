var Url = Iron.Url;

/**
 * XXX handle case where name is the path and the path is in the options
 * XXX what if second parameter is an object like what we have for current
 * routes?
 * TODO clone
 *
 */
Handler = function (path, fn, options) {
  if (_.isFunction(path)) {
    options = fn || {};
    fn = path;
    path = '/';
    options.mount = true;
  }

  options = options || {};
  this.options = options;

  this.mount = options.mount;

  // if we're mounting at path '/foo' then this handler should also handle
  // '/foo/bar' and '/foo/bar/baz'
  if (this.mount)
    options.end = false;

  this.path = Url.normalize(path);
  this.compiledUrl = new Url(this.path, options);
  this.method = (options.method && options.method.toLowerCase()) || false;

  // should the handler be on the 'client', 'server' or 'both'?
  this.where = options.where || 'client';

  // name provided explicitly as an option
  if (options.name)
    this.name = options.name;

  // or the function is actually a string
  else if (_.isString(fn))
    this.name = fn;

  // or maybe you named the function myFuncName () {}
  else if (fn.name)
    this.name = fn.name;

  // or maybe you'll be nameless :(
  else
    this.name = null;


  if (_.isString(fn)) {
    this.handle = function () {
      // try to find a method on the current thisArg which might be a Controller
      // for example.
      var func = this[fn];
      return func.apply(this, arguments);
    };
  } else if (_.isFunction(fn)) {
    // or just a regular old function
    this.handle = fn;
  }
};

Handler.prototype.test = function (path, options) {
  return this.compiledUrl.test(path);
};

Handler.prototype.params = function (path) {
  return this.compiledUrl.params(path);
};

/**
 * Returns a new cloned Handler.
 */
Handler.prototype.clone = function () {
  var clone = new Handler(this.path, this.handle, this.options);
  // in case the original function had a name
  clone.name = this.name;
  return clone;
};
