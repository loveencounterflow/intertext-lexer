(function() {
  'use strict';
  var GUY, Syntax, alert, debug, echo, get_base_types, help, info, inspect, log, plain, praise, rpr, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('INTERTEXT-LEXER/SYNTAX'));

  ({rpr, inspect, echo, log} = GUY.trm);

  ({get_base_types} = require('./types'));

  //===========================================================================================================

  //===========================================================================================================
  Syntax = class Syntax {
    /*
    * lexemes declared as *static* members (i.e. as class attributes) will be compiled
    * lexemes declared as *instance* members will be left as-is
    * use prefix
      `@lx_*` for string, regex, or object
      `@lxs_*` for list of objects
      `@get_lx_*()` for function that returns an object
      `@get_lxs_*()` for function that returns list of objects
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
      var k, lexeme_keys, ref, v;
      GUY.props.hide(this, 'types', get_base_types());
      /* TAINT must separate `cfg` items for the instance from defaults for the lexeme */
      this.cfg = {
        mode: 'std',
        ...cfg
      };
      this._lexeme_default = {...this.types.registry.ilx_add_lexeme_cfg.default};
      lexeme_keys = new Set(Object.keys(this._lexeme_default));
      ref = this.cfg;
      for (k in ref) {
        v = ref[k];
        if (lexeme_keys.has(k)) {
          this._lexeme_default[k] = v;
        }
      }
      this._compile_lexemes();
      return void 0;
    }

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
    _compile_lexemes() {
      var error, get, i, is_function, len, lexeme, lx_type, match, number, ref, tid, xtid;
      ref = Object.getOwnPropertyNames(this.constructor);
      for (i = 0, len = ref.length; i < len; i++) {
        xtid = ref[i];
        if ((match = xtid.match(/^(?<get>get_|)(?<number>lxs?_)(?<tid>.+)$/)) == null) {
          continue;
        }
        ({get, number, tid} = match.groups);
        is_function = get !== '';
        number = number === 'lx_' ? 'singular' : 'plural';
        lexeme = this.constructor[xtid];
        lx_type = this.types.type_of(lexeme);
        urge('^324^', {xtid, tid, number, lexeme});
        try {
          if (is_function) {
            null;
          } else {
            if (number === 'singular') {
              if (lx_type === 'list') {
                throw new Error(`^238947^ must use prefix 'lxs_' for list of lexemes; got ${rpr(xtid)}`);
              }
              lexeme = this._compile_lexeme(tid, lexeme);
            } else {
              lexeme = this._compile_list_of_lexemes(tid, lexeme);
            }
          }
        } catch (error1) {
          error = error1;
          if (error.constructor.name !== 'Intertype_validation_error') {
            throw error;
          }
          // error.message
          throw error;
        }
        debug('^2124^', lexeme);
      }
      // #.....................................................................................................
      // switch type = @types.type_of lexeme
      //   when 'object' then @[ tid ] = { @cfg..., lexeme..., }
      //   when 'list'   then @[ tid ] = ( { @cfg..., lx..., } for lx in lexeme )
      //   #...................................................................................................
      //   when 'function'
      //     lexeme = lexeme.call @
      //     switch subtype = type_of lexeme
      //       when 'object' then  @[ tid ] = lexeme ### NOTE lexemes returned by functions should be complete ###
      //       when 'list'   then  @[ tid ] = lexeme ### NOTE lexemes returned by functions should be complete ###
      //       else throw new Error "^849687388^ expected an object or a list of objects, found a #{type}"
      //   #...................................................................................................
      //   else throw new Error "^849687349^ expected an object or a function, found a #{type}"
      return null;
    }

  };

  //===========================================================================================================
  module.exports = {Syntax};

}).call(this);

//# sourceMappingURL=syntax.js.map