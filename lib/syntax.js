(function() {
  'use strict';
  var E, GUY, Syntax, alert, debug, echo, get_base_types, help, info, inspect, log, plain, praise, rpr, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('INTERTEXT-LEXER/SYNTAX'));

  ({rpr, inspect, echo, log} = GUY.trm);

  ({get_base_types} = require('./types'));

  E = require('./errors');

  //===========================================================================================================

  //===========================================================================================================
  Syntax = class Syntax {
    /*
    * lexemes to be declared as *static* members (i.e. as class attributes) will be compiled
    * lexeme factories that need additional parameters should use the prefix `new_` and be put on the
      instance
    * lexeme factories that are defined on the class will be called with the implicit `this`/`@` being the
      *instance*, not the class

    * specials:
      `@mode` indicates the (name of the) (base) mode; this can be overridden at instantiation time
      `@mode_*` indicate the (names of the) other modes; these can be overridden at instantiation time

    * use prefix `@lx_*` for string, regex, object, or a list thereof; alternatively a function returning one
      of the aforementioned
    * use prefix `new_*` for lexeme-factories that need additional parameters

    * TID (the lexeme's name) will default to the part after the prefix

    ```coffee
    class ClassWithStaticMethod
      @staticProperty: 'someValue'
      @staticMethod: () ->
        return 'static method has been called.'
    ```

    ```js
    class ClassWithStaticMethod {
      static staticProperty = 'someValue';
      static staticMethod() {
        return 'static method has been called.'; } }
    ```

     */
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      /* TAINT allow renaming of lexemes */
      var k, lexeme_keys, mode, ref, ref1, v;
      GUY.props.hide(this, 'types', get_base_types());
      mode = (ref = this.constructor.mode) != null ? ref : 'std';
      /* TAINT use types */
      this.cfg = {mode, ...cfg};
      this._lexeme_default = {...this.types.registry.ilx_add_lexeme_cfg.default};
      lexeme_keys = new Set(Object.keys(this._lexeme_default));
      ref1 = this.cfg;
      for (k in ref1) {
        v = ref1[k];
        if (lexeme_keys.has(k)) {
          this._lexeme_default[k] = v;
        }
      }
      // @_compile_lexemes { target: @, }
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    add_lexemes(target = null) {
      if (target == null) {
        target = this;
      }
      this.types.validate.syntax_target(target);
      this._compile_lexemes({target});
      return null;
    }

    //=========================================================================================================

    //---------------------------------------------------------------------------------------------------------
    _compile_list_of_lexemes(tid, list_of_lexemes) {
      var idx, lexeme;
      return (function() {
        var i, len, results;
        results = [];
        for (idx = i = 0, len = list_of_lexemes.length; i < len; idx = ++i) {
          lexeme = list_of_lexemes[idx];
          results.push(this._compile_lexeme(`${tid}_${idx + 1}`, lexeme));
        }
        return results;
      }).call(this);
    }

    //---------------------------------------------------------------------------------------------------------
    _compile_lexeme(tid, lexeme) {
      if (this.types.isa.ilx_pattern(lexeme)) {
        lexeme = {
          tid,
          pattern: lexeme
        };
      }
      if (this.types.isa.object(lexeme)) {
        lexeme = {...this._lexeme_default, ...lexeme};
      }
      this.types.validate.ilx_add_lexeme_cfg(lexeme);
      return lexeme;
    }

    //---------------------------------------------------------------------------------------------------------
    _compile_lexemes({target}) {
      var i, len, lexeme, lx, lx_type, match, ref, tid, use_push, xtid;
      if (target == null) {
        target = this;
      }
      use_push = this.types.isa.list(target);
      ref = Object.getOwnPropertyNames(this.constructor);
      //.......................................................................................................
      for (i = 0, len = ref.length; i < len; i++) {
        xtid = ref[i];
        if ((match = xtid.match(/^lx_(?<tid>.+)$/)) == null) {
          continue;
        }
        ({tid} = match.groups);
        lexeme = this.constructor[xtid];
        lx_type = this.types.type_of(lexeme);
        //.....................................................................................................
        if (lx_type === 'function') {
          lexeme = lexeme.call(this);
          lx_type = this.types.type_of(lexeme);
        }
        /* TAINT validate proto-lexeme */
        //.....................................................................................................
        if (lx_type === 'list') {
          lexeme = this._compile_list_of_lexemes(tid, lexeme);
        } else {
          lexeme = this._compile_lexeme(tid, lexeme);
        }
        //.....................................................................................................
        if (use_push) {
          if (lx_type === 'list') {
            (function() {
              var j, len1, results;
              results = [];
              for (j = 0, len1 = lexeme.length; j < len1; j++) {
                lx = lexeme[j];
                results.push(target.push(lx));
              }
              return results;
            })();
          } else {
            target.push(lexeme);
          }
        } else {
          //.....................................................................................................
          if (lx_type === 'list') {
            (function() {
              var j, len1, results;
              results = [];
              for (j = 0, len1 = lexeme.length; j < len1; j++) {
                lx = lexeme[j];
                results.push(target[`${lx.mode}_${lx.tid}`] = lx);
              }
              return results;
            })();
          } else {
            (target[`${lexeme.mode}_${lexeme.tid}`] = lexeme);
          }
        }
      }
      //.......................................................................................................
      return null;
    }

  };

  //===========================================================================================================
  module.exports = {Syntax};

}).call(this);

//# sourceMappingURL=syntax.js.map