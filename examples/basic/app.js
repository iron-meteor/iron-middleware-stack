if (Meteor.isClient) {
  stack = new Iron.PathStack;

  context = {
    hi: function (id) { console.log('hi ' + id); }
  };

  stack.push('/items/:id', function (req, res, next) {
    this.hi('item!');
    console.log('item!');
  
  stack.push('/server', function (req, res, next) {
    this.hi('server!');
    next();
  }, {
    where: 'server'
  });

  stack.onServerDispatch(function () {
    console.log(this);
    console.log('onServerDispatch: ', arguments);
  });

  stack.dispatch('/server');
}
