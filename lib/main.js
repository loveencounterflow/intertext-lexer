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
      /*
      cfg =
        autoreset:    true
        end_token:    true
        error_tokens: true
      */
      this.types = get_base_types();
      this.reset();
      this.base_mode = null;
      this.registry = {};
      this._metachr = '𝔛'; // used for identifying group keys
      this._metachrlen = this._metachr.length;
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    add_lexeme(cfg) {
      var base, lexemes, name1, pattern;
      cfg = this.types.create.ilx_add_lexeme_cfg(cfg);
      if (this.base_mode == null) {
        this.base_mode = cfg.mode;
      }
      lexemes = ((base = this.registry)[name1 = cfg.mode] != null ? base[name1] : base[name1] = {
        lexemes: []
      }).lexemes;
      pattern = this.types.isa.text(pattern) ? cfg.pattern : this._rename_groups(cfg.tid, cfg.pattern);
      lexemes.push(XXX_CRX.namedCapture(this._metachr + cfg.tid, pattern));
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _rename_groups(name, re) {
      var source;
      source = re.source.replace(/(?:(?<=\\\\)|(?<!\\))\(\?<([^>]+)>/gu, `(?<${name}${this._metachr}$1>`);
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
    _new_token(key, value, length, x = null) {
      var start, stop;
      start = this.state.prv_last_idx;
      stop = start + length;
      return {
        mode: this.state.mode,
        key,
        mk: `${this.state.mode}:${key}`,
        value,
        start,
        stop,
        x
      };
    }

    //---------------------------------------------------------------------------------------------------------
    _token_from_match(match) {
      var key, ref, token_key, token_value, value, x;
      x = null;
      ref = match.groups;
      for (key in ref) {
        value = ref[key];
        if (value == null) {
          continue;
        }
        if (key.startsWith(this._metachr)) {
          token_key = key.slice(this._metachrlen);
          token_value = value;
        } else {
          key = (key.split(this._metachr))[1];
          (x != null ? x : x = {})[key] = value === '' ? null : value;
        }
      }
      return this._new_token(token_key, token_value, match[0].length, x);
    }

    //---------------------------------------------------------------------------------------------------------
    run(source) {
      return [...(this.walk(source))];
    }

    //---------------------------------------------------------------------------------------------------------
    * walk(source) {
      /* TAINT uses code units, should use codepoints */
      var after, before, center, left, match, max_index, mid, old_last_idx, pattern, results, right, token;
      this.reset(); // if @cfg.autoreset
      pattern = this.registry[this.state.mode].pattern;
      max_index = source.length - 1;
      results = [];
      while (true) {
        //.......................................................................................................
        if (this.state.prv_last_idx > max_index) {
          /* reached end */
          yield this._new_token('$eof', '', 0);
          break;
        }
        match = source.match(pattern);
        if (match == null) {
          yield this._new_token('$error', '', 0, {
            code: 'nomatch'
          });
          break;
        }
        if (pattern.lastIndex === this.state.prv_last_idx) {
          if (match != null) {
            warn('^31-7^', {...match.groups});
            warn('^31-8^', token = this._token_from_match(match));
            center = token.stop;
            left = Math.max(0, center - 11);
            right = Math.min(source.length, center + 11);
            before = source.slice(left, center);
            after = source.slice(center + 1, +right + 1 || 9e9);
            mid = source[center];
            warn('^31-9^', {before, mid, after});
            warn('^31-10^', GUY.trm.reverse(`pattern ${rpr(token.key)} matched empty string; stopping`));
          } else {
            warn('^31-11^', GUY.trm.reverse("nothing matched; detected loop, stopping"));
          }
          break;
        }
        //.....................................................................................................
        token = this._token_from_match(match);
        yield token;
        //.....................................................................................................
        if (token.key.startsWith('gosub_')) {
          this.state.stack.push(this.state.mode);
          this.state.mode = token.key.replace('gosub_', '');
          old_last_idx = pattern.lastIndex;
          pattern = this.registry[this.state.mode].pattern;
          pattern.lastIndex = old_last_idx;
        //.....................................................................................................
        } else if (token.key === 'return') {
          this.state.mode = this.state.stack.pop();
          old_last_idx = pattern.lastIndex;
          pattern = this.registry[this.state.mode].pattern;
          pattern.lastIndex = old_last_idx;
        }
        //.....................................................................................................
        results.push(this.state.prv_last_idx = pattern.lastIndex);
      }
      return results;
    }

    //---------------------------------------------------------------------------------------------------------
    step() {}

  };

  //===========================================================================================================
  module.exports = {Interlex};

}).call(this);

//# sourceMappingURL=main.js.map