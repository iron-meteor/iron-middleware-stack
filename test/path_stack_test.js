Tinytest.add('PathStack - Handler', function (test) {
  var handler;
  var fn = function myName () {};
  var opts = {};
  // constructor options

  // middleware handler
  handler = new Handler(fn);
  test.equal(handler.handle, fn);
  test.equal(handler.name, 'myName');
  test.equal(handler.where, 'client');
  test.isTrue(handler.test('/'));
  test.isTrue(handler.test('/match/everything'));

  opts.name = 'newName';
  handler = new Handler('/items/:id', fn, opts);
  test.equal(handler.handle, fn);
  test.equal(handler.name, 'newName');
  test.equal(handler.options, opts);
  test.isTrue(handler.test('/items/1'));
  test.isTrue(handler.test('/items/2'));

  var called = false;
  var thisArg = {
    methodName: function () {called = true;}
  };
  handler = new Handler('/items/:id', 'methodName');
  handler.handle.call(thisArg);
  test.isTrue(called);

  handler = new Handler('/items/:id', fn);
  var params = handler.params('/items/5');
  test.equal(params.id, "5");
});

Tinytest.add('PathStack - create and find by name', function (test) {
  // basically just test that a handler gets created and keyed by name if thee's
  // a name. Also test duplicate named handlers throws an error.

  var stack = new Iron.PathStack;
  stack._create('/items', function () {}, {name: 'items'});
  test.isTrue(stack.findByName('items'));

  test.throws(function () {
    // same name
    stack._create('/items', function () {}, {name: 'items'});
  });
});

Tinytest.add('PathStack - push', function (test) {
  var stack = new Iron.PathStack;
  var fns = [function () {}, function () {}];
  stack.push(fns[0]);
  test.equal(stack._stack[0].handle, fns[0]);
  stack.push(fns[1]);
  test.equal(stack._stack[1].handle, fns[1]);
});

Tinytest.add('PathStack - insertAt', function (test) {
  var stack = new Iron.PathStack;
  var fns = [function () {}, function () {}, function () {}];
  stack.push(fns[0]);
  stack.push(fns[2]);

  stack.insertAt(1, fns[1]);
  test.equal(stack._stack[1].handle, fns[1]);
});

Tinytest.add('PathStack - insertBefore', function (test) {
  var stack = new Iron.PathStack;
  var fns = [function one() {}, function two() {}, function three() {}];
  stack.push(fns[0]);
  stack.push(fns[2]);
  stack.insertBefore('three', fns[1]);
  test.equal(stack._stack[1].handle, fns[1]);
});

Tinytest.add('PathStack - insertAfter ', function (test) {
  var stack = new Iron.PathStack;
  var fns = [function one() {}, function two() {}, function three() {}];
  stack.push(fns[0]);
  stack.push(fns[2]);
  stack.insertAfter('one', fns[1]);
  test.equal(stack._stack[1].handle, fns[1]);
});

Tinytest.add('PathStack - dispatch', function (test) {
  var stack = new Iron.PathStack;
  var calls = {};
  var call = function (name) { 
    calls[name] = calls[name] || 0;
    calls[name]++;
  };

  // client middleware
  stack.push(function m1 (req, res, next) { 
    call('m1'); 
    next();
  });

  stack.push(function m2 (req, res, next) { 
    call('m2');
    this.next();
  });

  // client handlers
  var params;
  stack.push('/items/:id', function item (req, res, next) {
    call('item');
    params = this.params;
    next();
  });

  // same path is okay as long as name is different
  stack.push('/items/:id', function itemTwo (req, res, next) {
    call('item2');
  });

  // server handler
  stack.push('/server', function server (req, res, next) {
    call('server');
  }, { where: 'server' });

  var thisArg = {};

  if (Meteor.isClient) {
    stack.dispatch();
    test.equal(calls.m1, 1, 'm1 not called');
    test.equal(calls.m2, 1, 'm2 not called');
    test.isFalse(calls.item);
    test.isFalse(calls.item2);
    test.isFalse(calls.server);

    stack.dispatch('/items/1', {thisArg: thisArg});
    test.equal(calls.m1, 2, 'm1 not called');
    test.equal(calls.m2, 2, 'm2 not called');
    test.equal(calls.item, 1, 'item not called');
    test.equal(calls.item2, 1, 'item2 not called');
    test.isFalse(calls.server);

    var params = thisArg.params;
    test.equal(params.id, "1");

    stack.onServerDispatch(function () {
      call('serverDispatch');
    });

    stack.dispatch('/server');
    test.equal(calls.serverDispatch, 1);
  }

  if (Meteor.isServer) {
    stack.dispatch('/server');
    test.isFalse(calls.m1);
    test.isFalse(calls.m2);
    test.equal(calls.server, 1);
  }
});

Tinytest.add('PathStack - dispatch error handling', function (test) {
  if (Meteor.isClient) {
    var stack = new Iron.PathStack;
    var calls = [];
    stack.push(function (req, res, next) {
      calls.push(1);
      throw new Error('test');
    });

    stack.push(function (req, res, next) {
      calls.push(2);
      next();
    });

    stack.dispatch('/', {
      next: function (err) {
        calls.push(3);
        test.equal(err.message, 'test');
      }
    });

    test.equal(calls.length, 2);

    // first fn throws an error
    test.equal(calls[0], 1);

    // rest of middleware skipped 
    test.equal(calls[1], 3);
  }
});
