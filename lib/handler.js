/**
 * XXX handle case where name is the path and the path is in the options
 *
 */
Handler = function (path, fn, options) {
  if (_.isFunction(path)) {
    options = fn || {};
    fn = path;
    path = '/';
    options.end = false;
  }

  options = options || {};

  this.options = options;
  this.compiledPath = new Iron.Path(path, options);
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
  return this.compiledPath.test(path);
};

Handler.prototype.params = function (path) {
  return this.compiledPath.params(path);
};
