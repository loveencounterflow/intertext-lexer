(function() {
  'use strict';
  var $, $010_lexing, $020_consolidate, $030_structure, $040_blocks, $window, DATOM, GUY, Transformer, _new_prelexer, alert, debug, echo, get_base_types, help, info, inspect, lets, log, misfit, new_datom, plain, praise, rpr, select, transforms, urge, warn, whisper,
    boundMethodCheck = function(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new Error('Bound instance method accessed before binding'); } };

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('INTERLEX/OUTLINE-PREPROC'));

  ({rpr, inspect, echo, log} = GUY.trm);

  ({misfit, get_base_types} = require('../types'));

  lets = GUY.lft.lets;

  ({Transformer, transforms, $} = require('moonriver'));

  ({$window} = transforms);

  ({DATOM} = require('datom'));

  ({new_datom, select} = DATOM);

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
        return lets(token, (token) => {
          token.value = '\n';
          if (token.data == null) {
            token.data = {};
          }
          token.data.spc_count = prv_spc_count;
          return token;
        });
      };
      material = (token) => {
        return lets(token, (token) => {
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
        });
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
        var d, ref1;
        ref1 = this._lexer.walk(source);
        for (d of ref1) {
          send(lets(d, function(d) {
            return d.$ = '^outliner@010^';
          }));
        }
        return null;
      };
    }

  };

  //===========================================================================================================
  this.$020_consolidate = $020_consolidate = class $020_consolidate extends $010_lexing {
    //---------------------------------------------------------------------------------------------------------
    $consolidate_newlines() {
      var Interlex, consolidate_newlines, flush, nl_count, position, ref, spc_count, stop;
      ({Interlex} = require('../main'));
      position = null;
      nl_count = 0;
      spc_count = null;
      stop = Symbol('stop');
      ref = '^outliner@020^';
      //.......................................................................................................
      flush = (send) => {
        var $key, data, nls, value;
        if (nl_count === 0) {
          return null;
        }
        value = '\n'.repeat(nl_count);
        position.lnr2 = position.lnr1 + nl_count;
        if (nl_count === 1) {
          $key = 'outline:nl';
        } else {
          position.lnr2 = position.lnr1 + nl_count - 1;
          position.x2 = 0;
          $key = 'outline:nls';
        }
        data = {nl_count, spc_count};
        nls = new_datom($key, {
          value,
          data,
          ...position,
          $: ref
        });
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
        if (select(d, 'outline:nl')) {
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
        //---------------------------------------------------------------------------------------------------------
        this.$remove_start_and_stop = this.$remove_start_and_stop.bind(this);
      }

      $add_start_and_stop() {
        boundMethodCheck(this, $030_structure);
        return $({start, stop}, (d, send) => {
          return send(d);
        });
      }

      $mark_indentation_levels() {
        var $key, Interlex, group_indentation_levels, position, prv_spc_count, ref;
        boundMethodCheck(this, $030_structure);
        ({Interlex} = require('../main'));
        prv_spc_count = 0;
        ref = '^outliner@030^';
        $key = 'outline:dentchg';
        position = null;
        return group_indentation_levels = (d, send) => {
          var spc_count;
          //.....................................................................................................
          if (d === start) {
            send(start);
            send(new_datom($key, {
              lnr1: 1,
              x1: 0,
              lnr2: 1,
              x2: 0,
              data: {
                from: null,
                to: 0
              },
              $: ref
            }));
            return null;
          }
          //.....................................................................................................
          if (d === stop) {
            send(new_datom($key, {
              ...position,
              data: {
                from: prv_spc_count,
                to: null
              },
              $: ref
            }));
            send(stop);
            return null;
          }
          //.....................................................................................................
          position = Interlex.get_token_position(d);
          if ((spc_count = d.data.spc_count) !== prv_spc_count) {
            send(new_datom($key, {
              ...position,
              data: {
                from: prv_spc_count,
                to: spc_count
              },
              $: ref
            }));
            prv_spc_count = spc_count;
          }
          //.....................................................................................................
          send(d);
          return null;
        };
      }

      $remove_start_and_stop() {
        boundMethodCheck(this, $030_structure);
        return (d, send) => {
          if (!((d === start) || (d === stop))) {
            return send(d);
          }
        };
      }

    };

    //---------------------------------------------------------------------------------------------------------
    start = Symbol('start');

    stop = Symbol('stop');

    return $030_structure;

  }).call(this);

  //===========================================================================================================
  this.$040_blocks = $040_blocks = class $040_blocks extends $030_structure {
    constructor() {
      super(...arguments);
      //---------------------------------------------------------------------------------------------------------
      this.$add_block_starts = this.$add_block_starts.bind(this);
      //---------------------------------------------------------------------------------------------------------
      this.$add_block_stops = this.$add_block_stops.bind(this);
    }

    $add_block_starts() {
      var $key, Interlex, add_block_starts, ref;
      boundMethodCheck(this, $040_blocks);
      ({Interlex} = require('../main'));
      $key = 'outline:block:start';
      ref = '^outliner@040^';
      return add_block_starts = $window({
        min: -1,
        max: 0,
        empty: null
      }, ([prv, d], send) => {
        var data, position;
        if (!select(d, 'outline:material')) {
          return send(d);
        }
        if (!select(prv, 'outline:dentchg', 'outline:nls')) {
          return send(d);
        }
        data = {
          spc_count: d.data.spc_count
        };
        position = Interlex.get_token_position(prv);
        send(new_datom($key, {
          data,
          ...position,
          $: ref
        }));
        send(d);
        return null;
      });
    }

    $add_block_stops() {
      var $key, Interlex, add_block_stops, ref;
      boundMethodCheck(this, $040_blocks);
      ({Interlex} = require('../main'));
      $key = 'outline:block:stop';
      ref = '^outliner@040^';
      return add_block_stops = $window({
        min: 0,
        max: +2,
        empty: null
      }, ([d, d1, d2], send) => {
        var data, position;
        if (!select(d, 'outline:material')) {
          return send(d);
        }
        if (!((select(d1, 'outline:nls')) || ((select(d1, 'outline:nl')) && (select(d2, 'outline:dentchg'))))) {
          return send(d);
        }
        send(d);
        data = {
          spc_count: d.data.spc_count
        };
        position = Interlex.get_token_position(d1);
        send(new_datom($key, {
          data,
          ...position,
          $: ref
        }));
        return null;
      });
    }

  };

}).call(this);

//# sourceMappingURL=outline-preprocessor.js.map