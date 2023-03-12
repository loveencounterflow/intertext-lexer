(function() {
  'use strict';
  var GUY, alert, debug, echo, get_base_types, help, info, inspect, log, misfit, plain, praise, rpr, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('INTERLEX/START-STOP-PREPROC'));

  ({rpr, inspect, echo, log} = GUY.trm);

  ({misfit, get_base_types} = require('../types'));

  //===========================================================================================================
  this.Start_stop_preprocessor = class Start_stop_preprocessor {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      this.types = get_base_types();
      this.cfg = Object.freeze(this.types.create.ilx_start_stop_preprocessor_cfg(cfg));
      this._lexer = this._new_prelexer();
      this._parser = this._new_preparser();
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    * walk(source_or_cfg) {
      this._parser.send(source_or_cfg);
      return (yield* this._parser.walk());
    }

    run(source_or_cfg) {
      return [...(this.walk(source_or_cfg))];
    }

    //---------------------------------------------------------------------------------------------------------
    _new_prelexer(cfg) {
      var Interlex, lexer;
      ({Interlex} = require('../main'));
      lexer = new Interlex({
        split: 'lines',
        ...cfg
      });
      (() => {        //.......................................................................................................
        var create, mode;
        mode = 'meta';
        create = function(token) {
          var base;
          if (token.data == null) {
            token.data = {};
          }
          if ((base = token.data).scope == null) {
            base.scope = 'local';
          }
          return token;
        };
        // nl_value = ( P... ) ->
        //   debug '^nl_value^', P
        //   return ''
        lexer.add_lexeme({
          mode,
          tid: 'start',
          pattern: /(?<!\\)<\?start\?>/,
          reserved: '<'
        });
        lexer.add_lexeme({
          mode,
          tid: 'stop',
          create,
          pattern: /(?<!\\)<\?stop(?:[-_](?<scope>all))?\?>/,
          reserved: '<'
        });
        // lexer.add_lexeme { mode, tid: 'nl',             pattern: /$/u, value:  nl_value, }
        lexer.add_lexeme({
          mode,
          tid: 'text_lt',
          pattern: /<(?=\?)/
        });
        return lexer.add_catchall_lexeme({
          mode,
          tid: 'text',
          concat: true
        });
      })();
      //.......................................................................................................
      return lexer;
    }

    //---------------------------------------------------------------------------------------------------------
    _new_preparser() {
      var $collect_chunks, $mark_active, $parse, Pipeline, p;
      ({Pipeline} = require('moonriver'));
      p = new Pipeline();
      //.......................................................................................................
      $parse = () => {
        var parse;
        return parse = (source, send) => {
          var ref, results, token;
          ref = this._lexer.walk(source);
          results = [];
          for (token of ref) {
            results.push(send(token));
          }
          return results;
        };
      };
      //.......................................................................................................
      $mark_active = () => {
        var active, mark_active, set_active;
        active = this.cfg.active;
        set_active = function(d, active) {
          return GUY.lft.lets(d, function(d) {
            if (d.data == null) {
              d.data = {};
            }
            return d.data.active = active;
          });
        };
        return mark_active = function(d, send) {
          if (d.mk === 'meta:start') {
            active = true;
            return send(set_active(d, false));
          }
          if (d.mk === 'meta:stop') {
            active = false;
            return send(set_active(d, false));
          }
          return send(set_active(d, active));
        };
      };
      //.......................................................................................................
      $collect_chunks = function() {
        var active, collect_chunks, collector, join;
        collector = [];
        active = null;
        //.....................................................................................................
        join = function() {
          var first_t, last_t;
          first_t = collector.at(0);
          last_t = collector.at(-1);
          return GUY.lft.lets(first_t, function(d) {
            var t;
            d.value = ((function() {
              var i, len, results;
              results = [];
              for (i = 0, len = collector.length; i < len; i++) {
                t = collector[i];
                results.push(t.value);
              }
              return results;
            })()).join('');
            d.lnr1 = first_t.lnr1;
            d.x1 = first_t.x1;
            d.lnr2 = last_t.lnr2;
            return d.x2 = last_t.x2;
          });
        };
        //.....................................................................................................
        return collect_chunks = function(d, send) {
          // active ?= d.data.active
          if (d.mk === 'meta:nl') {
            collector.push(d);
            send(join());
            collector = [];
          } else if (active !== d.data.active) {
            if (collector.length > 0) {
              send(join());
            }
            collector = [d];
          } else {
            collector.push(d);
          }
          return active = d.data.active;
        };
      };
      //.......................................................................................................
      p.push($parse());
      p.push($mark_active());
      p.push($collect_chunks());
      return p;
    }

  };

}).call(this);

//# sourceMappingURL=start-stop-preprocessor.js.map