(function() {
  'use strict';
  var C, DATOM, E, GUY, Interlex, Ltsort, _CRX, _X, alert, compose, copy_regex, debug, echo, equals, get_base_types, help, info, inspect, jump_symbol, lets, log, misfit, new_datom, plain, praise, rpr, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('INTERTEXT-LEXER'));

  ({rpr, inspect, echo, log} = GUY.trm);

  //...........................................................................................................
  ({equals, copy_regex} = GUY.samesame);

  ({misfit, jump_symbol, get_base_types} = require('./types'));

  E = require('./errors');

  //...........................................................................................................
  _CRX = require('compose-regexp-commonjs');

  _X = {
    unicode: function(x) {
      if (x instanceof RegExp) {
        return copy_regex(x, {
          unicode: true
        });
      } else {
        return flags.add('u', x);
      }
    },
    sticky: function(x) {
      if (x instanceof RegExp) {
        return copy_regex(x, {
          sticky: true
        });
      } else {
        return flags.add('y', x);
      }
    },
    dotall: function(x) {
      if (x instanceof RegExp) {
        return copy_regex(x, {
          dotAll: true
        });
      } else {
        return flags.add('s', x);
      }
    },
    multiline: function(x) {
      if (x instanceof RegExp) {
        return copy_regex(x, {
          multiline: true
        });
      } else {
        return flags.add('m', x);
      }
    }
  };

  _X.dotAll = _X.dotall;

  compose = C = {..._CRX, ..._X};

  //...........................................................................................................
  ({DATOM} = require('datom'));

  ({new_datom, lets} = DATOM);

  ({Ltsort} = require('ltsort'));

  //===========================================================================================================
  Interlex = class Interlex {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      this.types = get_base_types();
      this.cfg = Object.freeze(this.types.create.ilx_constructor_cfg(cfg));
      this.start();
      this.base_mode = null;
      this.registry = {};
      this._metachr = '𝔛'; // used for identifying group keys
      this._metachrlen = this._metachr.length;
      this.jump_symbol = jump_symbol;
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    add_lexeme(cfg) {
      /* TAINT use API, types */
      var base, entry, lexeme, name1, type_of_jump;
      cfg = this.types.create.ilx_add_lexeme_cfg(cfg);
      this.state.finalized = false;
      if (this.base_mode == null) {
        this.base_mode = cfg.mode;
      }
      entry = (base = this.registry)[name1 = cfg.mode] != null ? base[name1] : base[name1] = {
        lexemes: {},
        pattern: null,
        toposort: false,
        reserved: new Set()
      };
      entry.toposort || (entry.toposort = (cfg.needs != null) || (cfg.precedes != null));
      type_of_jump = this._get_type_of_jump(cfg.jump);
      entry.lexemes[cfg.tid] = lexeme = {...cfg, type_of_jump};
      if (this.types.isa.regex(lexeme.pattern)) {
        lexeme.pattern = this._rename_groups(lexeme.tid, lexeme.pattern);
      }
      lexeme.pattern = C.namedCapture(this._metachr + cfg.tid, lexeme.pattern);
      if (cfg.reserved != null) {
        this._add_reserved(cfg.mode, cfg.reserved);
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _get_type_of_jump(jump) {
      if (jump == null) {
        return 'nojump';
      }
      if (jump === jump_symbol) {
        return 'popmode';
      }
      if (this.types.isa.function(jump)) {
        return 'callme';
      }
      if (this.types.isa.nonempty.text(jump)) {
        return 'pushmode';
      }
      this.types.validate.ilx_jump(jump);
      throw new E.Interlex_internal_error('^interlex._get_type_of_jump@1^', `jump (${this.types.type_of(jump)}) ${rpr(jump)} should have caused validation error but didn't`);
    }

    //---------------------------------------------------------------------------------------------------------
    _rename_groups(name, re) {
      var source;
      source = re.source.replace(/(?:(?<=\\\\)|(?<!\\))\(\?<([^>]+)>/gu, `(?<${name}${this._metachr}$1>`);
      return new RegExp(source, re.flags);
    }

    //---------------------------------------------------------------------------------------------------------
    _toposort_patterns(entry) {
      var g, i, len, lexeme, needs, precedes, ref, ref1, ref2, ref3, tid, tmp;
      if (!entry.toposort) {
        /* TAINT avoid re-running */
        return entry;
      }
      g = new Ltsort();
      tmp = Object.assign({}, entry.lexemes);
/* NOTE avoiding shorthand for clarity */      ref = entry.lexemes;
      for (tid in ref) {
        lexeme = ref[tid];
        tmp[tid] = lexeme;
        delete entry.lexemes[tid];
        needs = (ref1 = lexeme.needs) != null ? ref1 : [];
        precedes = (ref2 = lexeme.precedes) != null ? ref2 : [];
        g.add({
          name: tid,
          needs,
          precedes
        });
      }
      ref3 = g.linearize();
      for (i = 0, len = ref3.length; i < len; i++) {
        tid = ref3[i];
        entry.lexemes[tid] = tmp[tid];
      }
      return entry;
    }

    //---------------------------------------------------------------------------------------------------------
    _set_u_flag(patterns) {
      var i, idx, len, pattern;
      for (idx = i = 0, len = patterns.length; i < len; idx = ++i) {
        pattern = patterns[idx];
        if ((!this.types.isa.regex(pattern)) || pattern.unicode) {
          continue;
        }
        patterns[idx] = compose.unicode(pattern);
      }
      return patterns;
    }

    //---------------------------------------------------------------------------------------------------------
    _finalize() {
      /* TAINT could / should set all flags in single step */
      /* TAINT use API */
      var entry, lexeme, mode, pattern, patterns, ref, ref1, ref2, tid;
      if (this.state == null) {
        return;
      }
      ref = this.registry;
      for (mode in ref) {
        entry = ref[mode];
        entry = this._toposort_patterns(entry);
        patterns = this._set_u_flag((function() {
          var ref1, results;
          ref1 = entry.lexemes;
          results = [];
          for (tid in ref1) {
            lexeme = ref1[tid];
            results.push(lexeme.pattern);
          }
          return results;
        })());
        pattern = C.either(...patterns);
        if (this.cfg.dotall) {
          pattern = C.dotall(pattern);
        }
        if (this.cfg.multiline) {
          pattern = C.multiline(pattern);
        }
        this.registry[mode].pattern = C.sticky(C.unicode(pattern));
      }
      ref1 = this.registry;
      for (mode in ref1) {
        entry = ref1[mode];
        ref2 = entry.lexemes;
        for (tid in ref2) {
          lexeme = ref2[tid];
          if (lexeme.type_of_jump !== 'pushmode') {
            continue;
          }
          if (this.registry[lexeme.jump] != null) {
            continue;
          }
          throw new E.Interlex_TBDUNCLASSIFIED('^interlex._finalize@1^', `unknown jump target in lexeme ${rpr(lexeme)}`);
        }
      }
      this.state.finalized = true;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    start(source = null) {
      this.types.validate.optional.text(source);
      return this._start(source);
    }

    //---------------------------------------------------------------------------------------------------------
    _start(source = null) {
      var base, base1, base2, entry, mode, ref, ref1, ref2, ref3, ref4;
      if ((this.state != null) && !this.state.finalized) {
        /* TAINT use `@types.create.ilx_state()` */
        this._finalize();
      }
      if (this.state == null) {
        this.state = {};
      }
      if ((base = this.state).finalized == null) {
        base.finalized = false;
      }
      this.state.stack = [];
      this.state.prv_last_idx = 0;
      this.state.mode = (ref = this.base_mode) != null ? ref : null;
      this.state.pattern = (ref1 = (ref2 = this.registry) != null ? (ref3 = ref2[this.state.mode]) != null ? ref3.pattern : void 0 : void 0) != null ? ref1 : null;
      this.state.source = source;
      this.state.finished = false;
      ref4 = this.registry;
      for (mode in ref4) {
        entry = ref4[mode];
        this.registry[mode].pattern.lastIndex = 0;
      }
      if (this.cfg.linewise) {
        if ((base1 = this.state).lnr == null) {
          base1.lnr = this.cfg.lnr - 1;
        }
        if ((base2 = this.state).eol == null) {
          base2.eol = '';
        }
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    feed(source_or_cfg) {
      if (this.types.isa.text(source_or_cfg)) {
        return this._feed_source(source_or_cfg);
      }
      return this._feed_cfg(source_or_cfg);
    }

    //---------------------------------------------------------------------------------------------------------
    _feed_cfg(cfg) {
      var ref;
      if (this.cfg.linewise) {
        this.state.eol = (ref = cfg.eol) != null ? ref : '';
      }
      return this._feed_source(cfg.source);
    }

    //---------------------------------------------------------------------------------------------------------
    _feed_source(source) {
      if (this.cfg.linewise) {
        this.state.lnr++;
      }
      this.types.validate.text(source);
      if (this.cfg.autostart) {
        return this._start(source);
      }
      this.state.source = source;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    rpr_token(token) {
      var R, j, k, ref, ref1, t, v;
      // @types.validate.ilx_token token
      t = token;
      j = token.jump;
      R = [];
      R.push(t.mk + (j != null ? (j === jump_symbol ? j : `>${j}`) : ''));
      R.push(`(${t.start}:${t.stop})`);
      R.push(`=${rpr(t.value)}`);
      ref1 = (ref = t.x) != null ? ref : {};
      for (k in ref1) {
        v = ref1[k];
        R.push(`${k}:${rpr(v)}`);
      }
      return `[${R.join(',')}]`;
    }

    //---------------------------------------------------------------------------------------------------------
    _new_token(tid, value, length, x = null, lexeme = null) {
      var jump, lnr, mode, ref, source, start, stop;
      start = this.state.prv_last_idx;
      stop = start + length;
      jump = (ref = lexeme != null ? lexeme.jump : void 0) != null ? ref : null;
      ({source, mode} = this.state);
      /* TAINT use `types.create.ilx_token {}` */
      if (this.cfg.linewise) {
        lnr = this.state.lnr;
        return new_datom(`^${mode}`, {
          mode,
          tid,
          mk: `${mode}:${tid}`,
          jump,
          value,
          lnr,
          start,
          stop,
          x,
          source
        });
      }
      return new_datom(`^${mode}`, {
        mode,
        tid,
        mk: `${mode}:${tid}`,
        jump,
        value,
        start,
        stop,
        x,
        source
      });
    }

    //---------------------------------------------------------------------------------------------------------
    _token_and_lexeme_from_match(match) {
      var key, lexeme, ref, token, token_tid, token_value, value, x;
      x = null;
      ref = match.groups;
      for (key in ref) {
        value = ref[key];
        if (value == null) {
          continue;
        }
        if (key.startsWith(this._metachr)) {
          token_tid = key.slice(this._metachrlen);
          token_value = value;
        } else {
          key = (key.split(this._metachr))[1];
          (x != null ? x : x = {})[key] = value === '' ? null : value;
        }
      }
      lexeme = this.registry[this.state.mode].lexemes[token_tid];
      token = this._new_token(token_tid, token_value, match[0].length, x, lexeme);
      return {token, lexeme};
    }

    //---------------------------------------------------------------------------------------------------------
    run(source_or_cfg) {
      return [...(this.walk(source_or_cfg))];
    }

    //---------------------------------------------------------------------------------------------------------
    walk(source_or_cfg) {
      var cfg;
      cfg = this.types.cast.ilx_walk_source_or_cfg(source_or_cfg);
      if (cfg.source != null) {
        return this._walk_text(cfg);
      }
      return this._walk_file_lines(cfg);
    }

    //---------------------------------------------------------------------------------------------------------
    * _walk_file_lines(cfg) {
      var eol, line, lnr, ref, y;
      ref = GUY.fs.walk_lines_with_positions(cfg.path, {
        trim: this.cfg.trim
      });
      /* TAINT should provide `lnr`, `eol` as well */
      /* TAINT derive `cfg` for line iterator (`trim`, `chunk_size`) */
      for (y of ref) {
        ({lnr, line, eol} = y);
        yield* this._walk_text({
          ...cfg,
          source: line
        });
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _walk_text(cfg) {
      if (this.cfg.linewise) {
        return this._walk_text_lines(cfg);
      }
      return this._walk_text_whole(cfg);
    }

    //---------------------------------------------------------------------------------------------------------
    * _walk_text_whole(cfg) {
      var Y;
      this.feed(cfg);
      while (true) {
        if (this.state.finished) {
          //.......................................................................................................
          break;
        }
        if ((Y = this.step()) != null) {
          yield Y;
        }
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    * _walk_text_lines(cfg) {
      var eol, line, lnr, ref, y;
      ref = GUY.str.walk_lines_with_positions(cfg.source, {
        trim: this.cfg.trim
      });
      for (y of ref) {
        ({lnr, line, eol} = y);
        yield* this._walk_text_whole({
          ...cfg,
          lnr,
          source: line,
          eol
        });
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    step() {
      /* TAINT uses code units, should use codepoints */
      /* TAINT code duplication */
      var after, before, center, left, lexeme, match, mid, right, token;
      //.......................................................................................................
      /* Affordance for lexemes matching only end-of-input (pattern `/$/y`): */
      if ((this.state.prv_last_idx === this.state.source.length) && ((match = this.state.source.match(this.state.pattern)) != null)) {
        ({token, lexeme} = this._token_and_lexeme_from_match(match));
        token = this._get_next_token(lexeme, token, match);
        this.state.prv_last_idx = this.state.pattern.lastIndex + 1;
        return token;
      }
      //.......................................................................................................
      if (this.state.prv_last_idx >= this.state.source.length) {
        /* reached end */
        this.state.finished = true;
        if (this.cfg.end_token) {
          token = this._new_token('$eof', '', 0);
        }
        return token;
      }
      //.......................................................................................................
      match = this.state.source.match(this.state.pattern);
      //.......................................................................................................
      if (match == null) {
        /* TAINT might want to advance and try again? */
        this.state.finished = true;
        token = this._new_token('$error', '', 0, {
          code: 'nomatch'
        });
        return token;
      }
      //.......................................................................................................
      if (this.state.pattern.lastIndex === this.state.prv_last_idx) {
        if (match != null) {
          ({token} = this._token_and_lexeme_from_match(match));
          center = token.stop;
          left = Math.max(0, center - 11);
          right = Math.min(this.state.source.length, center + 11);
          before = this.state.source.slice(left, center);
          after = this.state.source.slice(center + 1, +right + 1 || 9e9);
          mid = this.state.source[center];
          /* TAINT raise error or return error token */
          warn('^31-9^', {before, mid, after});
          warn('^31-10^', GUY.trm.reverse(`pattern ${rpr(token.tid)} matched empty string; stopping`));
          this.state.finished = true;
        } else {
          /* TAINT raise error or return error token */
          warn('^31-11^', GUY.trm.reverse("nothing matched; detected loop, stopping"));
          this.state.finished = true;
          return null;
        }
      }
      //.......................................................................................................
      ({token, lexeme} = this._token_and_lexeme_from_match(match));
      token = this._get_next_token(lexeme, token, match);
      this.state.prv_last_idx = this.state.pattern.lastIndex;
      return token;
    }

    //---------------------------------------------------------------------------------------------------------
    _call_jump_handler(lexeme, token, match) {
      var divert, jump, ref, replacement_token, type_of_jump;
      divert = lexeme.jump({
        token,
        match,
        lexer: this
      });
      if (divert == null) {
        return {
          token,
          jump: null,
          type_of_jump: 'nojump'
        };
      }
      if (this.types.isa.text(divert)) {
        if (divert === jump_symbol) {
          return {
            token,
            jump: jump_symbol,
            type_of_jump: 'popmode'
          };
        }
        return {
          token,
          jump: divert,
          type_of_jump: 'pushmode'
        };
      }
      if (this.types.isa.function(divert)) {
        throw new E.Interlex_TBDUNCLASSIFIED('^interlex._call_jump_handler@1^', `jump handler of lexeme ${rpr(lexeme.mk)} returned illegal value ${rpr(divert)}`);
      }
      if ((replacement_token = divert.token) != null) {
        token = replacement_token;
      }
      jump = (ref = divert.jump) != null ? ref : null;
      type_of_jump = this._get_type_of_jump(jump);
      return {token, jump, type_of_jump};
    }

    //---------------------------------------------------------------------------------------------------------
    _get_next_token(lexeme, token, match) {
      var jump, type_of_jump;
      switch (lexeme.type_of_jump) {
        case 'nojump':
          null;
          break;
        case 'pushmode':
          this._push_mode(lexeme.jump);
          break;
        case 'popmode':
          this._pop_mode();
          token = lets(token, (token) => {
            return token.jump = this.state.mode;
          });
          break;
        case 'callme':
          ({token, jump, type_of_jump} = this._call_jump_handler(lexeme, token, match));
          // debug '^2343^', ( rpr jump ), token
          switch (type_of_jump) {
            case 'nojump':
              null;
              break;
            case 'pushmode':
              this._push_mode(jump);
              break;
            case 'popmode':
              this._pop_mode();
              break;
            default:
              throw new E.Interlex_internal_error('^interlex._get_next_token@1^', `unknown type_of_jump ${rpr(type_of_jump)} in lexeme ${rpr(lexeme)}`);
          }
          token = lets(token, (token) => {
            return token.jump = type_of_jump === 'nojump' ? null : this.state.mode;
          });
          break;
        default:
          throw new E.Interlex_internal_error('^interlex._get_next_token@2^', `unknown type_of_jump in lexeme ${rpr(lexeme)}`);
      }
      return token;
    }

    //---------------------------------------------------------------------------------------------------------
    _pop_mode() {
      var old_last_idx;
      if (!(this.state.stack.length > 0)) {
        throw new E.Interlex_mode_stack_exhausted('^interlex._pop_mode@2^', "unable to jump back from initial state");
      }
      this.state.mode = this.state.stack.pop();
      old_last_idx = this.state.pattern.lastIndex;
      this.state.pattern = this.registry[this.state.mode].pattern;
      this.state.pattern.lastIndex = old_last_idx;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _push_mode(jump) {
      var old_last_idx;
      this.state.stack.push(this.state.mode);
      this.state.mode = jump;
      old_last_idx = this.state.pattern.lastIndex;
      this.state.pattern = this.registry[this.state.mode].pattern;
      this.state.pattern.lastIndex = old_last_idx;
      return null;
    }

    //=========================================================================================================
    // RESERVED ITEMS
    //---------------------------------------------------------------------------------------------------------
    _add_reserved(mode, reserved) {
      var entry, i, len, x;
      if ((entry = this.registry[mode]) == null) {
        throw new E.Interlex_internal_error('^interlex._add_reserved@1^', `no such mode: ${rpr(mode)}`);
      }
      if (this.types.isa.list(reserved)) {
        for (i = 0, len = reserved.length; i < len; i++) {
          x = reserved[i];
          this._add_reserved(mode, x);
        }
        return null;
      }
      /* NOTE may accept regexes in the future */
      this.types.validate.nonempty.text(reserved);
      entry.reserved.add(reserved);
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _get_catchall_regex(mode, entry) {
      return compose.charSet.complement(this._get_reserved_regex(mode, entry));
    }

    _get_reserved_regex(mode, entry) {
      return compose.either(...entry.reserved);
    }

    //---------------------------------------------------------------------------------------------------------
    add_catchall_lexeme({mode}) {
      var entry, pattern;
      if ((entry = this.registry[mode]) == null) {
        throw new E.Interlex_mode_unknown('^interlex.add_catchall_lexeme@1^', mode);
      }
      pattern = this._get_catchall_regex(mode, entry);
      if (this.cfg.catchall_concat) {
        pattern = compose.suffix('+', pattern);
      }
      this.add_lexeme({
        mode,
        tid: '$catchall',
        pattern
      });
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    add_reserved_lexeme({mode}) {
      var entry, pattern;
      if ((entry = this.registry[mode]) == null) {
        throw new E.Interlex_mode_unknown('^interlex.add_reserved_lexeme@1^', mode);
      }
      pattern = this._get_reserved_regex(mode, entry);
      if (this.cfg.reserved_concat) {
        pattern = compose.suffix('+', pattern);
      }
      this.add_lexeme({
        mode,
        tid: '$reserved',
        pattern
      });
      return null;
    }

  };

  //===========================================================================================================
  module.exports = {Interlex, compose};

}).call(this);

//# sourceMappingURL=interlex.js.map