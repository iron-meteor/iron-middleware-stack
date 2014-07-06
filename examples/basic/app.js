if (Meteor.isClient) {
  stack = new Iron.MiddlewareStack;

  stack.push('/1', function () {
    console.log('url: ', this.url);
    console.log('originalUrl: ', this.originalUrl);
  }, {mount: true});

  stack.dispatch('/1/2');
}
