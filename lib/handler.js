var Url = Iron.Url;

/**
 * path could be the name or a path
 * fn could be a function or an object
 * options could have path, name or both
 * default path is '/'
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

  // set the name for the handler
  if (options.name)
    this.name = options.name;
  else if (fn && fn.name)
    this.name = fn.name;
  else if (path !== '/')
    //FIXME this is most likely not what we want
    this.name = Iron.utils.classCase(path);
  else
    this.name = null;

  if (_.isString(fn)) {
    this.handle = function () {
      // try to find a method on the current thisArg which might be a Controller
      // for example.
      var func = this[fn];

      if (typeof func !== 'function')
        throw new Error("No method named '" + fn + "' found on handler.");

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
