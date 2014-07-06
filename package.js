Package.describe({
  name: "iron-middleware-stack",
  summary: "Client and server middleware support inspired by Connect.",
  version: "0.1.0",
  githubUrl: "https://github.com/eventedmind/iron-middleware-stack"
});

Package.on_use(function (api) {
  api.use('iron-url');
  api.add_files('lib/handler.js');
  api.add_files('lib/middleware_stack.js');
  api.export('Iron');
  api.export('Handler', {testOnly: true});
});

Package.on_test(function (api) {
  api.use('iron-middleware-stack');
  api.use('tinytest');
  api.use('test-helpers');
  api.add_files('test/middleware_stack_test.js', ['client', 'server']);
});
