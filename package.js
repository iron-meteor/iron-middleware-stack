Package.describe({
  name: "iron-path-stack",
  summary: "Client and server middleware support inspired by Connect.",
  version: "0.1.0",
  githubUrl: "https://github.com/eventedmind/iron-path-stack"
});

Package.on_use(function (api) {
  api.use('iron-path');
  api.add_files('lib/handler.js');
  api.add_files('lib/path_stack.js');
  api.export('Iron');
  api.export('Handler', {testOnly: true});
});

Package.on_test(function (api) {
  api.use('iron-path-stack');
  api.use('tinytest');
  api.use('test-helpers');
  api.add_files('test/path_stack_test.js', ['client', 'server']);
});
