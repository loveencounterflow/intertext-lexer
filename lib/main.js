(function() {
  var tools;

  tools = {
    ...(require('./tools/start-stop-preprocessor')),
    outline: require('./tools/outline-preprocessor')
  };

  module.exports = {...(require('./interlex')), ...(require('./syntax')), tools};

}).call(this);

//# sourceMappingURL=main.js.map