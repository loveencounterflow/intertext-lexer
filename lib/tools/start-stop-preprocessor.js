(function() {
  'use strict';
  var GUY, alert, debug, echo, get_base_types, help, info, inspect, lets, log, misfit, plain, praise, rpr, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('INTERLEX/START-STOP-PREPROC'));

  ({rpr, inspect, echo, log} = GUY.trm);

  ({misfit, get_base_types} = require('../types'));

  lets = GUY.lft.lets;

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
        append: '\n',
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
        lexer.add_lexeme({
          mode,
          tid: 'nl',
          pattern: /\n/u,
          reserved: '\n'
        });
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
      var $, $assemble_lines, $collect_chunks, $mark_active, $parse, Pipeline, join, p;
      ({Pipeline, $} = require('moonriver'));
      p = new Pipeline();
      //.......................................................................................................
      join = (collector, joiner) => {
        var first_t, last_t;
        first_t = collector.at(0);
        last_t = collector.at(-1);
        return lets(first_t, (d) => {
          var t;
          d.value = (((function() {
            var i, len, results;
            results = [];
            for (i = 0, len = collector.length; i < len; i++) {
              t = collector[i];
              results.push(t.value);
            }
            return results;
          })()).join(joiner)).trimEnd();
          d.lnr1 = first_t.lnr1;
          d.x1 = first_t.x1;
          d.lnr2 = last_t.lnr2;
          return d.x2 = last_t.x2;
        });
      };
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
        set_active = (d, active) => {
          return lets(d, (d) => {
            if (d.data == null) {
              d.data = {};
            }
            return d.data.active = active;
          });
        };
        return mark_active = (d, send) => {
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
      $collect_chunks = () => {
        var active, collect_chunks, collector, last;
        collector = [];
        active = null;
        last = Symbol('last');
        //.....................................................................................................
        return collect_chunks = $({last}, (d, send) => {
          // active ?= d.data.active
          if (d === last) {
            if (collector.length > 0) {
              send(join(collector, ''));
            }
            collector = [];
            return null;
          }
          if (d.mk === 'meta:nl') {
            collector.push(d);
            send(join(collector, ''));
            collector = [];
          } else if (active !== d.data.active) {
            if (collector.length > 0) {
              send(join(collector, ''));
            }
            collector = [d];
          } else {
            collector.push(d);
          }
          return active = d.data.active;
        });
      };
      //.......................................................................................................
      $assemble_lines = () => {
        var assemble_lines, collector, last, prv_lnr1;
        collector = [];
        last = Symbol('last');
        prv_lnr1 = null;
        //.....................................................................................................
        return assemble_lines = $({last}, (d, send) => {
          if (d === last) {
            if (collector.length > 0) {
              send(join(collector, this.cfg.join));
            }
            collector = [];
            return null;
          }
          if (!d.data.active) {
            return send(d);
          }
          if (prv_lnr1 == null) {
            prv_lnr1 = d.lnr1;
          }
          if (d.lnr1 !== prv_lnr1) {
            prv_lnr1 = d.lnr1;
            if (collector.length > 0) {
              send(join(collector, this.cfg.join));
            }
            collector = [];
            collector.push(d);
            return null;
          }
          collector.push(d);
          return null;
        });
      };
      //.......................................................................................................
      p.push($parse());
      p.push($mark_active());
      p.push($collect_chunks());
      p.push($assemble_lines());
      return p;
    }

  };

}).call(this);

//# sourceMappingURL=start-stop-preprocessor.js.map