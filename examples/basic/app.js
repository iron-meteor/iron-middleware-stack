if (Meteor.isClient) {
  one = new Iron.MiddlewareStack;
  two = new Iron.MiddlewareStack;
  three = new Iron.MiddlewareStack;

  one.push(function () {
    console.log('1');
    this.next();
  });

  two.push(function () {
    console.log('2');
    this.next();
  });

  three.push(function () {
    console.log('3');
    this.next();
  });

  all = one.concat(two, three);
  all.dispatch();
}
