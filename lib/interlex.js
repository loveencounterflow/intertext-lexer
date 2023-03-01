(function() {
  'use strict';
  var C, DATOM, E, GUY, Interlex, Ltsort, _CRX, _X, alert, compose, copy_regex, debug, echo, equals, get_base_types, help, info, inspect, lets, log, misfit, new_datom, plain, praise, rpr, sorter, urge, warn, whisper;

  //###########################################################################################################
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('INTERTEXT-LEXER'));

  ({rpr, inspect, echo, log} = GUY.trm);

  //...........................................................................................................
  ({equals, copy_regex} = GUY.samesame);

  ({misfit, get_base_types} = require('./types'));

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

  sorter = (require('./sorter')).sorter;

  //===========================================================================================================
  Interlex = class Interlex {
    //---------------------------------------------------------------------------------------------------------
    constructor(cfg) {
      this.types = get_base_types();
      this.cfg = Object.freeze(this.types.create.ilx_interlex_constructor_cfg(cfg));
      this.start();
      this.base_mode = null;
      this.registry = {};
      this._metachr = '𝔛'; // used for identifying group keys
      this._metachrlen = this._metachr.length;
      return void 0;
    }

    //---------------------------------------------------------------------------------------------------------
    add_lexeme(cfg) {
      var entry, jump_action, jump_target, jump_time, lexeme;
      cfg = this.types.create.ilx_add_lexeme_cfg(cfg);
      this.state.finalized = false;
      if (this.base_mode == null) {
        this.base_mode = cfg.mode;
      }
      entry = this._get_mode_entry(cfg);
      entry.toposort || (entry.toposort = (cfg.needs != null) || (cfg.precedes != null));
      ({jump_action, jump_time, jump_target} = this._parse_jump_cfg(cfg.jump));
      //.......................................................................................................
      if (entry.lexemes[cfg.tid] != null) {
        throw new E.Interlex_lexeme_exists('^interlex.add_lexeme@1^', cfg.mode, cfg.tid);
      }
      //.......................................................................................................
      entry.lexemes[cfg.tid] = lexeme = {...cfg, jump_action, jump_time, jump_target};
      if (this.types.isa.regex(lexeme.pattern)) {
        lexeme.pattern = this._rename_groups(lexeme.tid, lexeme.pattern);
      }
      lexeme.pattern = C.namedCapture(this._metachr + cfg.tid, lexeme.pattern);
      lexeme.type_of_value = this.types.type_of(lexeme.value);
      lexeme.type_of_empty_value = this.types.type_of(lexeme.empty_value);
      if (cfg.reserved != null) {
        this._add_reserved_chrs(cfg.mode, cfg.reserved);
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _get_mode_entry(cfg) {
      /* TAINT use @types.create.ilx_registry_mode_entry */
      var R;
      if ((R = this.registry[cfg.mode]) != null) {
        return R;
      }
      R = {
        lexemes: {},
        pattern: null,
        toposort: false,
        reserved_chrs: new Set(),
        value: cfg.value,
        empty_value: cfg.empty_value,
        catchall: null,
        reserved: null
      };
      this.registry[cfg.mode] = R;
      return R;
    }

    //---------------------------------------------------------------------------------------------------------
    _parse_jump_cfg(jump) {
      var type;
      if (jump == null) {
        return {
          jump_action: 'nojump',
          jump_time: null,
          jump_target: null
        };
      }
      if ((type = this.types.type_of(jump)) === 'function') {
        return {
          jump_action: 'callme',
          jump_time: null,
          jump_target: null
        };
      }
      //.......................................................................................................
      if (!(type === 'text' && jump.length > 1)) {
        throw new E.Interlex_illegal_jump_target('^interlex._parse_jump_cfg@1^', type, jump);
      }
      if (jump === '.]') {
        return {
          //.......................................................................................................
          jump_action: 'popmode',
          jump_time: 'inclusive',
          jump_target: null
        };
      }
      if (jump === '].') {
        return {
          jump_action: 'popmode',
          jump_time: 'exclusive',
          jump_target: null
        };
      }
      //.......................................................................................................
      if (jump.startsWith('[')) {
        return {
          jump_action: 'pushmode',
          jump_time: 'inclusive',
          jump_target: jump.slice(1)
        };
      }
      if (jump.endsWith('[')) {
        return {
          jump_action: 'pushmode',
          jump_time: 'exclusive',
          jump_target: jump.slice(0, jump.length - 1)
        };
      }
      //.......................................................................................................
      throw new E.Interlex_illegal_jump_target('^interlex._parse_jump_cfg@2^', type, jump);
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
      var entry, lexeme, mode, pattern, patterns, ref, ref1, ref2, tid;
      if (this.state == null) {
        return;
      }
      ref = this.registry;
      for (mode in ref) {
        entry = ref[mode];
        entry = this._toposort_patterns(entry);
        if (entry.catchall != null) {
          //.....................................................................................................
          this._add_catchall_lexeme(mode, entry.catchall.tid, entry);
        }
        if (entry.reserved != null) {
          this._add_reserved_lexeme(mode, entry.reserved.tid, entry);
        }
        //.....................................................................................................
        /* TAINT use API */
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

    //=========================================================================================================

    //---------------------------------------------------------------------------------------------------------
    start(source = null) {
      this.types.validate.optional.text(source);
      return this._start(source);
    }

    //---------------------------------------------------------------------------------------------------------
    _start(source = null) {
      var base, base1, base2, base3, base4, entry, mode, ref, ref1, ref2, ref3, ref4, ref5;
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
      switch (this.cfg.state) {
        case 'keep':
          if ((base1 = this.state).stack == null) {
            base1.stack = [];
          }
          if ((base2 = this.state).mode == null) {
            base2.mode = (ref = this.base_mode) != null ? ref : null;
          }
          break;
        case 'reset':
          this.state.stack = [];
          this.state.mode = (ref1 = this.base_mode) != null ? ref1 : null;
          break;
        default:
          throw new E.Interlex_TBDUNCLASSIFIED('^_start@1^', `illegal value for @cfg.state: ${rpr(this.cfg.state)}`);
      }
      this.state.prv_last_idx = 0;
      this.state.pattern = (ref2 = (ref3 = this.registry) != null ? (ref4 = ref3[this.state.mode]) != null ? ref4.pattern : void 0 : void 0) != null ? ref2 : null;
      this.state.source = source;
      this.state.finished = false;
      ref5 = this.registry;
      for (mode in ref5) {
        entry = ref5[mode];
        this.registry[mode].pattern.lastIndex = 0;
      }
      //.......................................................................................................
      if (this.cfg.split === 'lines') {
        if ((base3 = this.state).lnr1 == null) {
          base3.lnr1 = 0;
        }
        if ((base4 = this.state).eol == null) {
          base4.eol = '';
        }
      } else {
        this.state.lnr1 = 0;
      }
      //.......................................................................................................
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
      if (this.cfg.split === 'lines') {
        this.state.eol = (ref = cfg.eol) != null ? ref : '';
      }
      return this._feed_source(cfg.source);
    }

    //---------------------------------------------------------------------------------------------------------
    _feed_source(source) {
      if (this.cfg.split === 'lines') {
        this.state.lnr1++;
      }
      this.types.validate.text(source);
      return this._start(source); // if @cfg.autostart
      this.state.source = source;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    rpr_token(token) {
      var R, j, k, ref, ref1, ref2, ref3, ref4, t, v;
      // @types.validate.ilx_token token
      t = token;
      R = [];
      if (token.jump != null) {
        j = (ref = (ref1 = this.registry[token.mode]) != null ? (ref2 = ref1.lexemes[token.tid]) != null ? ref2.jump : void 0 : void 0) != null ? ref : null;
        if (j != null) {
          j = `<${j}>`;
        }
        if (j == null) {
          j = '';
        }
      } else {
        j = '';
      }
      R.push(t.mk + j);
      R.push(`(${t.lnr1}:${t.x1})(${t.lnr2}:${t.x2})`);
      R.push(`=${rpr(t.value)}`);
      ref4 = (ref3 = t.x) != null ? ref3 : {};
      for (k in ref4) {
        v = ref4[k];
        R.push(`${k}:${rpr(v)}`);
      }
      return `[${R.join(',')}]`;
    }

    //---------------------------------------------------------------------------------------------------------
    _new_token(tid, value, length, x = null, lexeme = null) {
      var R, jump, lnr1, lnr2, mode, ref, source, x1, x2;
      x1 = this.state.prv_last_idx;
      x2 = x1 + length;
      jump = (ref = lexeme != null ? lexeme.jump : void 0) != null ? ref : null;
      ({source, mode} = this.state);
      //.......................................................................................................
      /* TAINT use `types.create.ilx_token {}` */
      lnr1 = lnr2 = this.state.lnr1;
      R = {
        mode,
        tid,
        mk: `${mode}:${tid}`,
        jump,
        value,
        lnr1,
        x1,
        lnr2,
        x2,
        x,
        source
      };
      //.......................................................................................................
      this._set_token_value(R, lexeme, value);
      //.......................................................................................................
      if ((lexeme != null ? lexeme.create : void 0) != null) {
        R = lexeme.create.call(this, R);
      }
      return new_datom(`^${mode}`, R);
    }

    //---------------------------------------------------------------------------------------------------------
    _set_token_value(token, lexeme, value) {
      if (((lexeme != null ? lexeme.empty_value : void 0) != null) && ((token.value == null) || (token.value === ''))) {
        switch (lexeme.type_of_empty_value) {
          case 'text':
            token.value = lexeme.empty_value;
            break;
          case 'function':
            token.value = lexeme.empty_value.call(this, token);
            break;
          default:
            throw new E.Interlex_internal_error('^_new_token@1^', `unknown type of lexeme.empty_value: ${rpr(lexeme.type_of_empty_value)}`);
        }
      } else if ((lexeme != null ? lexeme.value : void 0) != null) {
        switch (lexeme.type_of_value) {
          case 'text':
            token.value = lexeme.value;
            break;
          case 'function':
            token.value = lexeme.value.call(this, token);
            break;
          default:
            throw new E.Interlex_internal_error('^_new_token@2^', `unknown type of lexeme.value: ${rpr(lexeme.type_of_value)}`);
        }
      }
      return null;
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
      var line, ref, y;
      ref = GUY.fs.walk_lines_with_positions(cfg.path, {
        trim: this.cfg.trim
      });
      /* TAINT should provide `lnr1`, `eol` as well */
      /* TAINT derive `cfg` for line iterator (`trim`, `chunk_size`) */
      for (y of ref) {
        ({line} = y);
        yield* this._walk_text({
          ...cfg,
          source: line
        });
      }
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _walk_text(cfg) {
      if (this.cfg.split === 'lines') {
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
      var eol, line, lnr1, ref, y;
      ref = GUY.str.walk_lines_with_positions(cfg.source, {
        trim: this.cfg.trim
      });
      for (y of ref) {
        ({
          lnr: lnr1,
          line,
          eol
        } = y);
        yield* this._walk_text_whole({
          ...cfg,
          lnr1,
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
          center = token.x2;
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
      var divert, jump_cfg, ref, type;
      if ((divert = lexeme.jump({
        token,
        match,
        lexer: this
      })) == null) {
        jump_cfg = GUY.props.pick_with_fallback(lexeme, null, 'jump_action', 'jump_time', 'jump_target');
        return {token, ...jump_cfg};
      }
      //.......................................................................................................
      switch (type = this.types.type_of(divert)) {
        case 'text':
          return {token, ...(this._parse_jump_cfg(divert))};
        case 'object':
          token = (ref = divert.token) != null ? ref : token;
          if (divert.jump != null) {
            jump_cfg = this._parse_jump_cfg(divert.jump);
          } else {
            jump_cfg = null;
          }
          return {token, ...jump_cfg};
      }
      //.......................................................................................................
      throw new E.Interlex_TBDUNCLASSIFIED('^interlex._call_jump_handler@1^', `jump handler of lexeme ${rpr(lexeme.mk)} returned illegal value ${rpr(divert)}`);
    }

    //---------------------------------------------------------------------------------------------------------
    _get_next_token(lexeme, token, match) {
      /* ???
           token = lets token, ( token ) => token.jump = if type_of_jump is 'nojump' then null else @state.mode
           */
      var jump_action, jump_target, jump_time, overrides;
      /* TAINT code duplication */
      if (lexeme.jump_action === 'callme') {
        ({token, jump_action, jump_time, jump_target} = this._call_jump_handler(lexeme, token, match));
        overrides = {jump_action, jump_time, jump_target};
      } else {
        ({jump_action, jump_time, jump_target} = lexeme);
        overrides = null;
      }
      if (jump_action == null) {
        return token;
      }
      switch (jump_action) {
        case 'nojump':
          null;
          break;
        case 'pushmode':
          token = this._push_mode(lexeme, token, overrides);
          break;
        case 'popmode':
          token = this._pop_mode(lexeme, token, overrides);
          break;
        default:
          throw new E.Interlex_internal_error('^interlex._get_next_token@2^', `unknown jump_action (${rpr(jump_action)}) from lexeme ${rpr(lexeme)}`);
      }
      return token;
    }

    //---------------------------------------------------------------------------------------------------------
    _pop_mode(lexeme, token, overrides) {
      var jump_time, old_last_idx;
      if (!(this.state.stack.length > 0)) {
        throw new E.Interlex_mode_stack_exhausted('^interlex._pop_mode@2^', "unable to jump back from initial state");
      }
      ({jump_time} = overrides != null ? overrides : lexeme);
      this.state.mode = this.state.stack.pop();
      old_last_idx = this.state.pattern.lastIndex;
      this.state.pattern = this.registry[this.state.mode].pattern;
      this.state.pattern.lastIndex = old_last_idx;
      return lets(token, (token) => {
        token.jump = this.state.mode;
        if (jump_time === 'exclusive') {
          token.mode = this.state.mode;
          /* TAINT use API */
          token.mk = `${token.mode}:${token.tid}`;
        }
        return null;
      });
    }

    //---------------------------------------------------------------------------------------------------------
    _push_mode(lexeme, token, overrides) {
      var jump_target, jump_time, old_last_idx;
      ({jump_target, jump_time} = overrides != null ? overrides : lexeme);
      this.state.stack.push(this.state.mode);
      this.state.mode = jump_target;
      old_last_idx = this.state.pattern.lastIndex;
      this.state.pattern = this.registry[this.state.mode].pattern;
      this.state.pattern.lastIndex = old_last_idx;
      return lets(token, (token) => {
        token.jump = jump_target;
        if (jump_time === 'inclusive') {
          token.mode = jump_target;
          /* TAINT use API */
          token.mk = `${token.mode}:${token.tid}`;
        }
        return null;
      });
    }

    //=========================================================================================================
    // CATCHALL & RESERVED
    //---------------------------------------------------------------------------------------------------------
    _add_reserved_chrs(mode, reserved_chrs) {
      var entry, i, len, x;
      if ((entry = this.registry[mode]) == null) {
        throw new E.Interlex_internal_error('^interlex._add_reserved_chrs@1^', `no such mode: ${rpr(mode)}`);
      }
      if (this.types.isa.list(reserved_chrs)) {
        for (i = 0, len = reserved_chrs.length; i < len; i++) {
          x = reserved_chrs[i];
          this._add_reserved_chrs(mode, x);
        }
        return null;
      }
      /* NOTE may accept regexes in the future */
      this.types.validate.nonempty.text(reserved_chrs);
      entry.reserved_chrs.add(reserved_chrs);
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _get_catchall_regex(mode, entry) {
      return compose.charSet.complement(this._get_reserved_regex(mode, entry));
    }

    _get_reserved_regex(mode, entry) {
      return compose.either(...entry.reserved_chrs);
    }

    //---------------------------------------------------------------------------------------------------------
    _add_catchall_lexeme(mode, tid, entry) {
      var pattern;
      pattern = this._get_catchall_regex(mode, entry);
      if (entry.catchall.concat) {
        pattern = compose.suffix('+', pattern);
      }
      this.add_lexeme({mode, tid, pattern});
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    _add_reserved_lexeme(mode, tid, entry) {
      var pattern;
      pattern = this._get_reserved_regex(mode, entry);
      if (entry.reserved.concat) {
        pattern = compose.suffix('+', pattern);
      }
      this.add_lexeme({mode, tid, pattern});
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    add_catchall_lexeme(cfg) {
      var entry;
      cfg = this.types.create.ilx_add_catchall_lexeme_cfg(cfg);
      if (cfg.mode == null) {
        cfg.mode = this.base_mode;
      }
      if ((entry = this.registry[cfg.mode]) == null) {
        throw new E.Interlex_mode_unknown('^interlex.add_catchall_lexeme@1^', cfg.mode);
      }
      if (entry.catchall != null) {
        throw new E.Interlex_catchall_exists('^interlex.add_catchall_lexeme@1^', cfg.mode, entry.catchall.tid);
      }
      entry.catchall = cfg;
      return null;
    }

    //---------------------------------------------------------------------------------------------------------
    add_reserved_lexeme(cfg) {
      var entry;
      cfg = this.types.create.ilx_add_reserved_lexeme_cfg(cfg);
      if (cfg.mode == null) {
        cfg.mode = this.base_mode;
      }
      if ((entry = this.registry[cfg.mode]) == null) {
        throw new E.Interlex_mode_unknown('^interlex.add_reserved_lexeme@1^', cfg.mode);
      }
      if (entry.reserved != null) {
        throw new E.Interlex_reserved_exists('^interlex.add_reserved_lexeme@1^', cfg.mode, entry.reserved.tid);
      }
      entry.reserved = cfg;
      return null;
    }

  };

  //===========================================================================================================
  module.exports = {Interlex, compose, sorter};

}).call(this);

//# sourceMappingURL=interlex.js.map