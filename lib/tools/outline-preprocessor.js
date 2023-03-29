(function() {
  'use strict';
  var $, $010_lexing, $020_consolidate, $030_structure, GUY, Transformer, _new_prelexer, alert, debug, echo, get_base_types, help, info, inspect, lets, log, misfit, plain, praise, rpr, transforms, urge, warn, whisper,
    boundMethodCheck = function(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new Error('Bound instance method accessed before binding'); } };

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('INTERLEX/OUTLINE-PREPROC'));

  ({rpr, inspect, echo, log} = GUY.trm);

  ({misfit, get_base_types} = require('../types'));

  lets = GUY.lft.lets;

  ({Transformer, transforms, $} = require('moonriver'));

  //===========================================================================================================
  _new_prelexer = function(cfg) {
    var Interlex, lexer, prv_spc_count;
    ({Interlex} = require('../main'));
    lexer = new Interlex({
      split: 'lines',
      ...cfg
    });
    prv_spc_count = 0;
    (() => {      //.......................................................................................................
      var material, mode, nl;
      mode = 'outline';
      nl = (token) => {
        token.value = '\n';
        if (token.data == null) {
          token.data = {};
        }
        token.data.spc_count = prv_spc_count;
        return token;
      };
      material = (token) => {
        var base, base1;
        if (token.data == null) {
          token.data = {};
        }
        if ((base = token.data).indent == null) {
          base.indent = '';
        }
        if ((base1 = token.data).material == null) {
          base1.material = '';
        }
        token.data.spc_count = prv_spc_count = token.data.indent.length;
        return token;
      };
      /* NOTE consider to allow escaping newlines */
      // lexer.add_lexeme { mode, tid: 'escchr',         pattern: /\\(?<chr>.)/u,                      reserved: '\\', }
      lexer.add_lexeme({
        mode,
        tid: 'nl',
        create: nl,
        pattern: /$/u
      });
      return lexer.add_lexeme({
        mode,
        tid: 'material',
        create: material,
        pattern: /^(?<indent>\x20*)(?<material>.+)$/
      });
    })();
    //.......................................................................................................
    return lexer;
  };

  //===========================================================================================================
  this.$010_lexing = $010_lexing = class $010_lexing extends Transformer {
    //---------------------------------------------------------------------------------------------------------
    constructor() {
      super();
      //---------------------------------------------------------------------------------------------------------
      this.$parse = this.$parse.bind(this);
      GUY.props.hide(this, '_lexer', _new_prelexer());
      return void 0;
    }

    $parse() {
      var parse;
      boundMethodCheck(this, $010_lexing);
      return parse = (source, send) => {
        var ref, token;
        ref = this._lexer.walk(source);
        for (token of ref) {
          send(token);
        }
        return null;
      };
    }

  };

  //===========================================================================================================
  this.$020_consolidate = $020_consolidate = class $020_consolidate extends $010_lexing {
    //---------------------------------------------------------------------------------------------------------
    $consolidate_newlines() {
      var Interlex, consolidate_newlines, flush, nl_count, position, spc_count, stop, template;
      ({Interlex} = require('../main'));
      position = null;
      nl_count = 0;
      spc_count = null;
      stop = Symbol('stop');
      template = {
        mode: 'plain',
        tid: 'nls',
        mk: 'plain:nls',
        $: '^outliner.020^'
      };
      //.......................................................................................................
      flush = (send) => {
        var data, nls, value;
        if (nl_count === 0) {
          return null;
        }
        value = '\n'.repeat(nl_count);
        position.lnr2 = position.lnr1 + nl_count;
        if (nl_count > 1) {
          position.lnr2 = position.lnr1 + nl_count - 1;
          position.x2 = 0;
        }
        data = {nl_count, spc_count};
        nls = {...template, value, data, ...position};
        nl_count = 0;
        position = null;
        spc_count = null;
        return send(nls);
      };
      //.......................................................................................................
      return $({stop}, consolidate_newlines = (d, send) => {
        if (d === stop) {
          return flush(send);
        }
        if (d.$stamped) {
          return send(d);
        }
        if (d.mk === 'outline:nl') {
          nl_count++;
          if (position == null) {
            position = Interlex.get_token_position(d);
          }
          if (spc_count == null) {
            spc_count = d.data.spc_count;
          }
        } else {
          flush(send);
          send(d);
        }
        return null;
      });
    }

  };

  //===========================================================================================================
  this.$030_structure = $030_structure = (function() {
    var start, stop;

    class $030_structure extends $020_consolidate {
      constructor() {
        super(...arguments);
        //---------------------------------------------------------------------------------------------------------
        this.$add_start_and_stop = this.$add_start_and_stop.bind(this);
        //---------------------------------------------------------------------------------------------------------
        this.$mark_indentation_levels = this.$mark_indentation_levels.bind(this);
      }

      $add_start_and_stop() {
        boundMethodCheck(this, $030_structure);
        return $({start, stop}, (d, send) => {
          return send(d);
        });
      }

      $mark_indentation_levels() {
        var Interlex, group_indentation_levels, position, prv_spc_count, template;
        boundMethodCheck(this, $030_structure);
        ({Interlex} = require('../main'));
        prv_spc_count = 0;
        template = {
          mode: 'outline',
          tid: 'dentchg',
          mk: 'outline:dentchg',
          $: '^outliner.030^'
        };
        position = null;
        return group_indentation_levels = (d, send) => {
          var spc_count;
          if (d === start) {
            return send({
              ...template,
              lnr1: 1,
              x1: 0,
              lnr2: 1,
              x2: 0,
              data: {
                from: prv_spc_count,
                to: 0
              }
            });
          }
          if (d === stop) {
            return send({
              ...template,
              ...position,
              data: {
                from: prv_spc_count,
                to: 0
              }
            });
          }
          position = Interlex.get_token_position(d);
          if ((spc_count = d.data.spc_count) !== prv_spc_count) {
            send({
              ...template,
              ...position,
              data: {
                from: prv_spc_count,
                to: spc_count
              }
            });
            prv_spc_count = spc_count;
          }
          send(d);
          return null;
        };
      }

    };

    //---------------------------------------------------------------------------------------------------------
    start = Symbol('start');

    stop = Symbol('stop');

    return $030_structure;

  }).call(this);

}).call(this);

//# sourceMappingURL=outline-preprocessor.js.map