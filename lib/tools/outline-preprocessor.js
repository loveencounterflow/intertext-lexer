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
  this.Outline_preprocessor = class Outline_preprocessor {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      this.types = get_base_types();
      this.cfg = Object.freeze(this.types.create.ilx_outline_preprocessor_cfg(cfg));
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
        mode = 'outline';
        create = (token) => {
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
          token.data.level = token.data.indent.length / this.cfg.indent_module;
          return token;
        };
        /* NOTE consider to allow escaping newlines */
        // lexer.add_lexeme { mode, tid: 'escchr',         pattern: /\\(?<chr>.)/u,                      reserved: '\\', }
        lexer.add_lexeme({
          mode,
          tid: 'blank',
          pattern: /^\s*$/u
        });
        return lexer.add_lexeme({
          mode,
          tid: 'material',
          create,
          pattern: /^(?<indent>(?:\x20\x20)*)(?<material>.+)$/
        });
      })();
      //.......................................................................................................
      return lexer;
    }

    //---------------------------------------------------------------------------------------------------------
    _new_preparser() {
      var $, $parse, Pipeline, p;
      ({Pipeline, $} = require('moonriver'));
      p = new Pipeline();
      // #.......................................................................................................
      // join = ( collector, joinerase ) =>
      //   { joiner
      //     eraser }  = joinerase
      //   first_t     = collector.at 0
      //   last_t      = collector.at -1
      //   return lets first_t, ( d ) =>
      //     #...................................................................................................
      //     if joiner?
      //       d.value = ( ( t.value for t in collector ).join joiner ).trimEnd()
      //     else
      //       parts     = []
      //       last_idx  = collector.length - 1
      //       for t, idx in collector
      //         parts.push t.value
      //         continue if idx >= last_idx
      //         parts.push eraser.repeat distance if ( distance = collector[ idx + 1 ].x1 - t.x2 ) > 0
      //       d.value = ( parts.join '' ).trimEnd()
      //     #...................................................................................................
      //     d.lnr1  = first_t.lnr1
      //     d.x1    = first_t.x1
      //     d.lnr2  = last_t.lnr2
      //     d.x2    = last_t.x2
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
      // #.......................................................................................................
      // $mark_active = =>
      //   active = @cfg.active
      //   set_active = ( d, active ) => lets d, ( d ) =>
      //     d.data         ?= {}
      //     d.data.active   = active
      //   return mark_active = ( d, send ) =>
      //     if d.mk is 'meta:start'
      //       active = true
      //       return send set_active d, false
      //     if d.mk is 'meta:stop'
      //       active = false
      //       return send set_active d, false
      //     send set_active d, active
      // #.......................................................................................................
      // $collect_chunks = =>
      //   collector = []
      //   active    = null
      //   last      = Symbol 'last'
      //   #.....................................................................................................
      //   return collect_chunks = $ { last, }, ( d, send ) =>
      //     if d is last
      //       send join collector, { joiner: '', } if collector.length > 0
      //       collector = []
      //       return null
      //     if d.mk is 'meta:nl'
      //       collector.push d
      //       send join collector, { joiner: '', }
      //       collector = []
      //     else if active isnt d.data.active
      //       send join collector, { joiner: '', } if collector.length > 0
      //       collector = [ d, ]
      //     else
      //       collector.push d
      //     active = d.data.active
      // #.......................................................................................................
      // $assemble_lines = =>
      //   collector = []
      //   last      = Symbol 'last'
      //   prv_lnr1  = null
      //   join_cfg  = {}
      //   join_cfg.joiner = @cfg.joiner if @cfg.joiner?
      //   join_cfg.eraser = @cfg.eraser if @cfg.eraser?
      //   #.....................................................................................................
      //   return assemble_lines = $ { last, }, ( d, send ) =>
      //     if d is last
      //       send join collector, join_cfg if collector.length > 0
      //       collector = []
      //       return null
      //     return send d unless d.data.active
      //     prv_lnr1 ?= d.lnr1
      //     if d.lnr1 isnt prv_lnr1
      //       prv_lnr1 = d.lnr1
      //       send join collector, join_cfg if collector.length > 0
      //       collector = []
      //       collector.push d
      //       return null
      //     collector.push d
      //     return null
      //.......................................................................................................
      p.push($parse());
      // p.push ( d ) -> urge '^77-1^', d
      return p;
    }

  };

}).call(this);

//# sourceMappingURL=outline-preprocessor.js.map