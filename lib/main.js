(function() {
  'use strict';
  var GUY, Interlex, XXX_CRX, XXX_dotAll, XXX_dotall, XXX_sticky, XXX_unicode, alert, copy_regex, debug, echo, equals, get_base_types, help, info, inspect, log, plain, praise, rpr, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('INTERTEXT-LEXER'));

  ({rpr, inspect, echo, log} = GUY.trm);

  //...........................................................................................................
  ({equals, copy_regex} = GUY.samesame);

  ({get_base_types} = require('./types'));

  // { atomic
  //   bound
  //   capture
  //   charSet
  //   either
  //   flags
  //   lookAhead
  //   lookBehind
  //   maybe
  //   namedCapture
  //   noBound
  //   notAhead
  //   notBehind
  //   ref
  //   sequence
  //   suffix                } = require 'compose-regexp-commonjs'
  XXX_CRX = require('compose-regexp-commonjs');

  //-----------------------------------------------------------------------------------------------------------
  XXX_unicode = function(x) {
    if (x instanceof RegExp) {
      return copy_regex(x, {
        unicode: true
      });
    } else {
      return flags.add('u', x);
    }
  };

  XXX_sticky = function(x) {
    if (x instanceof RegExp) {
      return copy_regex(x, {
        sticky: true
      });
    } else {
      return flags.add('y', x);
    }
  };

  XXX_dotall = function(x) {
    if (x instanceof RegExp) {
      return copy_regex(x, {
        dotAll: true
      });
    } else {
      return flags.add('s', x);
    }
  };

  XXX_dotAll = XXX_dotall;

  //===========================================================================================================
  Interlex = class Interlex {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      if (cfg != null) {
        throw new Error("^interlex@1^ cfg not implemented");
      }
      this.types = get_base_types();
      this.reset();
      this.base_mode = null;
      this.registry = {};
      this._metachr = '𝔛'; // used for identifying group keys
      this._metachrlen = this._metachr.length;
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    add_lexeme(mode, name, pattern) {
      var base, lexemes;
      if (this.base_mode == null) {
        this.base_mode = mode;
      }
      lexemes = ((base = this.registry)[mode] != null ? base[mode] : base[mode] = {
        lexemes: []
      }).lexemes;
      if (this.types.isa.regex(pattern)) {
        pattern = this._rename_groups(name, pattern);
      }
      lexemes.push(XXX_CRX.namedCapture(this._metachr + name, pattern));
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _rename_groups(name, re) {
      var source;
      source = re.source.replace(/(?<!\\)\(\?<([^>]+)>/gu, `(?<${name}${this._metachr}$1>`);
      return new RegExp(source, re.flags);
    }

    //---------------------------------------------------------------------------------------------------------
    finalize() {
      var entry, mode, ref;
      ref = this.registry;
      for (mode in ref) {
        entry = ref[mode];
        this.registry[mode].pattern = XXX_sticky(XXX_unicode(XXX_dotall(XXX_CRX.either(...entry.lexemes))));
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    reset() {
      var entry, mode, ref;
      if (this.state == null) {
        this.state = {};
      }
      this.state.stack = [];
      this.state.mode = this.base_mode;
      this.state.prv_last_idx = 0;
      ref = this.registry;
      for (mode in ref) {
        entry = ref[mode];
        this.registry[mode].pattern.lastIndex = 0;
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _token_from_match(prv_last_idx, match, mode = null) {
      var R, key, ref, value, x;
      x = null;
      R = {mode};
      ref = match.groups;
      for (key in ref) {
        value = ref[key];
        if (value == null) {
          continue;
        }
        if (key.startsWith(this._metachr)) {
          R.key = key.slice(this._metachrlen);
          R.mk = mode != null ? `${mode}:${R.key}` : R.key;
          R.value = value;
        } else {
          key = (key.split(this._metachr))[1];
          (x != null ? x : x = {})[key] = value === '' ? null : value;
        }
      }
      R.start = prv_last_idx;
      R.stop = prv_last_idx + match[0].length;
      R.x = x;
      return R;
    }

  };

  //===========================================================================================================
  module.exports = {Interlex};

}).call(this);

//# sourceMappingURL=main.js.map