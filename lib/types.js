(function() {
  'use strict';
  var Dataclass, GUY, Intertype, base_types, debug, echo, get_base_types, inspect, log, misfit, rpr;

  //###########################################################################################################
  GUY = require('guy');

  // { alert
  //   debug
  //   help
  //   info
  //   plain
  //   praise
  //   urge
  //   warn
  //   whisper }               = GUY.trm.get_loggers 'DATAMILL/TYPES'
  ({debug} = GUY.trm.get_loggers('INTERTEXT-LEXER/TYPES'));

  ({rpr, inspect, echo, log} = GUY.trm);

  ({Intertype} = require('intertype'));

  ({Dataclass} = require('datom'));

  base_types = null;

  misfit = Symbol('misfit');

  // PATH                      = require 'node:path'

  //-----------------------------------------------------------------------------------------------------------
  get_base_types = function() {
    var Token, declare;
    if (base_types != null) {
      return base_types;
    }
    //.........................................................................................................
    base_types = new Intertype();
    ({declare} = base_types);
    //.........................................................................................................
    // declare.ilx_pattern     override: true, isa: ( x ) -> x instanceof Document
    declare.syntax_target('list.or.object');
    /* TAINT legal mode names, lexeme IDs should be confined to JS identifiers */
    /* TAINT legal mode names should exclude `lx`, `new` to avoid name clashes */
    declare.ilx_mode('nonempty.text');
    declare.ilx_lxid('nonempty.text');
    declare.ilx_pattern('text.or.regex');
    // declare.ilx_pop             ( x ) -> x is jump_symbol
    /* TAINT should be more specific than 'text' */
    declare.ilx_jump('text.or.function');
    declare.ilx_reserved('optional.ilx_reserved_list.or.ilx_reserved_text');
    declare.ilx_reserved_list('list.of.nonempty.text');
    declare.ilx_reserved_text('nonempty.text');
    declare.ilx_lexeme_value('function.or.text');
    declare.ilx_token_value('text');
    declare.ilx_splitmode(function(x) {
      return x === 'lines' || x === false;
    });
    declare.ilx_statemode(function(x) {
      return x === 'keep' || x === 'reset';
    });
    declare.ilx_line_number('positive1.integer');
    declare.ilx_codeunit_idx('positive0.integer');
    //.........................................................................................................
    declare.ilx_add_lexeme_cfg({
      fields: {
        mode: 'ilx_mode',
        lxid: 'ilx_lxid',
        pattern: 'ilx_pattern',
        jump: 'optional.ilx_jump',
        reserved: 'optional.ilx_reserved',
        create: 'optional.function',
        value: 'optional.ilx_lexeme_value',
        empty_value: 'optional.ilx_lexeme_value'
      },
      template: {
        mode: 'plain',
        lxid: null,
        pattern: null,
        jump: null,
        reserved: null,
        create: null,
        value: null,
        empty_value: null
      }
    });
    //.........................................................................................................
    declare.ilx_interlex_constructor_cfg({
      fields: {
        eof_token: 'boolean',
        error_tokens: 'boolean',
        border_tokens: 'boolean',
        border_value: 'text',
        multiline: 'boolean',
        dotall: 'boolean',
        split: 'ilx_splitmode',
        state: 'ilx_statemode',
        trim: 'boolean',
        prepend: 'text',
        append: 'text',
        first: 'anything',
        last: 'anything',
        start_of_line: 'anything',
        end_of_line: 'anything'
      },
      // global ???
      // ignorecase  # ignoreCase
      template: {
        eof_token: false,
        error_tokens: true,
        border_tokens: false,
        border_value: '',
        multiline: false,
        dotall: false,
        split: 'lines',
        state: 'keep',
        trim: true,
        prepend: '',
        append: '',
        first: null,
        last: null,
        start_of_line: null,
        end_of_line: null
      },
      create: function(x) {
        var R, get, i, key, len, ref;
        R = {...this.registry.ilx_interlex_constructor_cfg.template, ...x};
        ref = ['first', 'last', 'start_of_line', 'end_of_line'];
        for (i = 0, len = ref.length; i < len; i++) {
          key = ref[i];
          if (!this.isa.function((get = R[key]))) {
            continue;
          }
          Object.defineProperty(R, key, {get});
        }
        return R;
      }
    });
    //.........................................................................................................
    declare.ilx_walk_source_or_cfg({
      fields: {
        source: 'optional.text',
        value: 'optional.text',
        path: 'optional.nonempty.text'
      },
      template: {
        source: null,
        value: null,
        path: null
      },
      cast: function(x) {
        var R, ref, ref1;
        if (this.isa.text(x)) {
          return {
            ...this.registry.ilx_walk_source_or_cfg.template,
            source: x
          };
        }
        if (!this.isa.object(x)) {
          return x;
        }
        R = {...this.registry.ilx_walk_source_or_cfg.template, ...x};
        if (R.value != null) {
          /* TAINT this is a hotfix that allows to use tokens with a `value` property to be used as lexing
               cfg (which uses `source`); this fix will be removed when we have renamed one or both properties */
          R.source = R.value;
        }
        if ((R.source == null) && (R.path == null)) {
          throw new Error("^types.ilx_walk_source_or_cfg@1^ must set either `source` or `path`");
        }
        if ((R.source != null) && (R.path != null)) {
          throw new Error("^types.ilx_walk_source_or_cfg@2^ cannot set both `source` and `path`");
        }
        if (R.lnr == null) {
          R.lnr = (ref = R.lnr1) != null ? ref : 1;
        }
        if (R.x == null) {
          R.x = (ref1 = R.x1) != null ? ref1 : 0;
        }
        return R;
      }
    });
    //.........................................................................................................
    declare.ilx_add_catchall_lexeme_cfg({
      fields: {
        mode: 'ilx_mode',
        lxid: 'ilx_lxid',
        concat: 'boolean'
      },
      template: {
        mode: null,
        lxid: '$catchall',
        concat: false
      }
    });
    declare.ilx_add_reserved_lexeme_cfg({
      fields: {
        mode: 'ilx_mode',
        lxid: 'ilx_lxid',
        concat: 'boolean'
      },
      template: {
        mode: null,
        lxid: '$reserved',
        concat: false
      }
    });
    //.........................................................................................................
    declare.ilx_start_stop_preprocessor_cfg({
      fields: {
        active: 'boolean',
        joiner: 'optional.text',
        eraser: 'optional.text'
      },
      template: {
        active: true,
        joiner: null,
        eraser: null
      },
      create: function(x) {
        var R, ref, ref1;
        // {}, null -> { eraser: ' ', }
        // { eraser: 'x', } -> { eraser: 'x', }
        // { joiner: 'x', } -> { joiner: 'x', eraser: null, }
        // { joiner: 'x', eraser: 'y', } -> error
        if (x == null) {
          x = {...this.registry.ilx_start_stop_preprocessor_cfg.template};
        }
        if (!this.isa.object(x)) {
          return x;
        }
        R = {};
        R.active = (ref = x.active) != null ? ref : this.registry.ilx_start_stop_preprocessor_cfg.template.active;
        if (x.joiner != null) {
          if (x.eraser != null) {
            throw new Error(`cannot set both \`joiner\` and \`eraser\`, got ${rpr(x)}`);
          } else {
            R.joiner = x.joiner;
          }
          return R;
        }
        R.eraser = (ref1 = x.eraser) != null ? ref1 : ' ';
        return R;
      }
    });
    //.........................................................................................................
    // ### TAINT only allows fixed number U+0020 Space, should allow tabs ###
    // declare.ilx_outline_preprocessor_cfg
    //   fields:
    //     blank_line_count:   'positive0.integer'
    //     indent_module:      'positive1.integer'
    //   template:
    //     blank_line_count:   2
    //     ### NOTE number of spaces for one level of indentation ###
    //     indent_module:      2
    //.........................................................................................................
    declare.ilx_set_position_cfg({
      fields: {
        lnr1: 'optional.ilx_line_number',
        x1: 'optional.ilx_codeunit_idx'
      },
      template: {
        lnr1: null,
        x1: null
      }
    });
    //.........................................................................................................
    declare.ilx_token_key(function(x) {
      if (!this.isa.text(x)) {
        return false;
      }
      return (x.indexOf(':')) !== -1;
    });
    Token = (function() {
      //=========================================================================================================
      class Token extends Dataclass {
        set_mode(mode) {
          return this.__types.create[this.constructor.name]({
            ...this,
            $key: `${mode}:${this.lxid}`
          });
        }

      };

      Token.types = base_types;

      Token.declaration = {
        fields: {
          $key: 'ilx_token_key',
          lnr1: 'ilx_line_number',
          x1: 'ilx_codeunit_idx',
          lnr2: 'ilx_line_number',
          x2: 'ilx_codeunit_idx',
          value: 'ilx_token_value'
        },
        template: {
          $key: null,
          lnr1: 1,
          x1: 0,
          lnr2: null,
          x2: null,
          value: ''
        },
        create: function(x) {
          var R, g/* NOTE safeguard against `$key` missing from user-supplied value */;
          if ((x != null) && !this.isa.object(x)) {
            return x;
          }
          R = {...this.registry.Token.template, ...x};
          if (R.lnr2 == null) {
            R.lnr2 = R.lnr1;
          }
          if (R.x2 == null) {
            R.x2 = R.x1;
          }
          if (this.isa.text(R.$key)) {
            g = (R.$key.match(/^(?<mode>[^:]+):(?<lxid>.+)$/)).groups;
            R.mode = g.mode;
            R.lxid = g.lxid;
          }
          return R;
        }
      };

      return Token;

    }).call(this);
    /* TAINT use class method on type */
    new Token({
      $key: 'foo:bar'
    });
    //.........................................................................................................
    return base_types;
  };

  //===========================================================================================================
  module.exports = {misfit, get_base_types};

}).call(this);

//# sourceMappingURL=types.js.map