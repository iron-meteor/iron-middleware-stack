if (Meteor.isClient) {
  one = new Iron.MiddlewareStack;
  two = new Iron.MiddlewareStack;
  three = new Iron.MiddlewareStack;

  one.push(function () {
    console.log('1');
    this.next();
  });

  hooks = [function () { 
    console.log('h1');
    this.next();
  }, function () { 
    console.log('h2'); 
  }];

  one.append(hooks);
  one.dispatch();
}
