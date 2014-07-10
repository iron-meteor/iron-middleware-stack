if (Meteor.isClient) {
  one = new Iron.MiddlewareStack;

  one.push(function one() {
    console.log('1');
    throw new Error('wtf!!!');
  });

  one.push(function two() {
    console.log('2');
  });

  one.push(function three() {
    console.log('3');
  });

  options = {};
  options.next = function (err) {
    if (err) {
      console.log('about to throw!');
      throw err;
    }
  };

  try {
    one.dispatch('/', options);
  } catch (err) {
    console.log(err);
  }
}
