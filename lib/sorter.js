(function() {
  'use strict';
  var GUY, Sorter, alert, debug, echo, get_base_types, help, info, inspect, log, plain, praise, rpr, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('INTERTEXT-LEXER'));

  ({rpr, inspect, echo, log} = GUY.trm);

  ({get_base_types} = require('./types'));

  //===========================================================================================================
  Sorter = class Sorter {
    //---------------------------------------------------------------------------------------------------------
    constructor() {
      //---------------------------------------------------------------------------------------------------------
      this.cmp = this.cmp.bind(this);
      this.types = get_base_types();
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    sort(...tokens) {
      var R;
      this.types.validate.list(tokens);
      R = tokens.flat(2e308);
      R.sort(this.cmp);
      return R;
    }

    cmp(a, b) {
      if (a.lnr1 == null) {
        throw new E.Interlex_TBDUNCLASSIFIED('^Sorter.sort@1^', `missing required lnr1: ${rpr(a)}`);
      }
      if (b.lnr1 == null) {
        throw new E.Interlex_TBDUNCLASSIFIED('^Sorter.sort@1^', `missing required lnr1: ${rpr(b)}`);
      }
      if (a.lnr1 > b.lnr1) {
        return +1;
      }
      if (a.lnr1 < b.lnr1) {
        return -1;
      }
      if (a.x1 == null) {
        throw new E.Interlex_TBDUNCLASSIFIED('^Sorter.sort@1^', `missing required x1: ${rpr(a)}`);
      }
      if (b.x1 == null) {
        throw new E.Interlex_TBDUNCLASSIFIED('^Sorter.sort@1^', `missing required x1: ${rpr(b)}`);
      }
      if (a.x1 > b.x1) {
        return +1;
      }
      if (a.x1 < b.x1) {
        return -1;
      }
      return 0;
    }

    //---------------------------------------------------------------------------------------------------------
    ordering_is(a, b) {
      return (this.cmp(a, b)) === -1;
    }

  };

  //===========================================================================================================
  module.exports = {
    sorter: new Sorter()
  };

}).call(this);

//# sourceMappingURL=sorter.js.map