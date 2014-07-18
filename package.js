Package.describe({
  name: "iron-middleware-stack",
  summary: "Client and server middleware support inspired by Connect.",
  version: "0.1.0",
  githubUrl: "https://github.com/eventedmind/iron-middleware-stack"
});

Package.on_use(function (api) {
  api.use('iron:core');
  api.imply('iron:core');
  api.use('iron:url');
  api.addFiles('lib/handler.js');
  api.addFiles('lib/middleware_stack.js');
  api.export('Handler', {testOnly: true});
});

Package.on_test(function (api) {
  api.use('iron:middleware-stack');
  api.use('tinytest');
  api.use('test-helpers');
  api.addFiles('test/handler_test.js');
  api.addFiles('test/middleware_stack_test.js');
});
