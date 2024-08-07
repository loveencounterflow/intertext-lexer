(function() {
  'use strict';
  /* NODE play safe, avoid [A$$es](https://github.com/loveencounterflow/gaps-and-islands#regular-expressions-how-to-avoid-accidental-string-substitutions-so-called-aes) */
  /* TAINT in future version, will want LXID to always start with colon */
  var C, DATOM, E, GUY, Interlex, Ltsort, _CRX, _X, _set_token_mode, _split_token_mode_lxid, alert, compose, copy_regex, debug, echo, equals, freeze, get_base_types, get_token_lxid, get_token_mode, help, info, inspect, lets, log, misfit, new_datom, plain, praise, rpr, set_token_mode, sorter, urge, warn, whisper;

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

  ({new_datom, lets, freeze} = DATOM);

  ({Ltsort} = require('ltsort'));

  sorter = (require('./sorter')).sorter;

  //===========================================================================================================
  get_token_mode = function(token) {
    return (token.$key.split(':'))[0];
  };

  get_token_lxid = function(token) {
    return token.$key.replace(/^[^:]*:/, '');
  };

  set_token_mode = function(token) {
    return lets(token, function(token, mode) {
      return _set_token_mode(token, mode);
    });
  };

  _set_token_mode = function(token, mode) {
    return token.$key = token.$key.replace(/^[^:]+/, function() {
      return mode;
    });
  };

  _split_token_mode_lxid = function(token) {
    return (token.$key.split(/^([^:]+):(.*)$/)).slice(1, 3);
  };

  Interlex = (function() {
    //===========================================================================================================
    class Interlex {
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
        if (entry.lexemes[cfg.lxid] != null) {
          throw new E.Interlex_lexeme_exists('^interlex.add_lexeme@1^', cfg.mode, cfg.lxid);
        }
        //.......................................................................................................
        entry.lexemes[cfg.lxid] = lexeme = {...cfg, jump_action, jump_time, jump_target};
        if (this.types.isa.regex(lexeme.pattern)) {
          lexeme.pattern = this._rename_groups(lexeme.lxid, lexeme.pattern);
        }
        lexeme.pattern = C.namedCapture(this._metachr + cfg.lxid, lexeme.pattern);
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
        if ((jump.startsWith('[')) && (jump.endsWith(']'))) {
          return {
            jump_action: 'pushpop',
            jump_time: 'inclusive',
            jump_target: jump.slice(1, jump.length - 1)
          };
        }
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
        source = re.source.replace(/(?:(?<=\\\\)|(?<!\\))\(\?<([^>=!]+)>/gu, `(?<${name}${this._metachr}$1>`);
        return new RegExp(source, re.flags);
      }

      //---------------------------------------------------------------------------------------------------------
      _toposort_patterns(entry) {
        var g, i, len, lexeme, lxid, needs, precedes, ref, ref1, ref2, ref3, tmp;
        if (!entry.toposort) {
          /* TAINT avoid re-running */
          return entry;
        }
        g = new Ltsort();
        tmp = Object.assign({}, entry.lexemes);
/* NOTE avoiding shorthand for clarity */        ref = entry.lexemes;
        for (lxid in ref) {
          lexeme = ref[lxid];
          tmp[lxid] = lexeme;
          delete entry.lexemes[lxid];
          needs = (ref1 = lexeme.needs) != null ? ref1 : [];
          precedes = (ref2 = lexeme.precedes) != null ? ref2 : [];
          g.add({
            name: lxid,
            needs,
            precedes
          });
        }
        ref3 = g.linearize();
        for (i = 0, len = ref3.length; i < len; i++) {
          lxid = ref3[i];
          entry.lexemes[lxid] = tmp[lxid];
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
        var entry, lexeme, lxid, mode, pattern, patterns, ref, ref1, ref2;
        if (this.state == null) {
          return;
        }
        ref = this.registry;
        for (mode in ref) {
          entry = ref[mode];
          entry = this._toposort_patterns(entry);
          if (entry.catchall != null) {
            //.....................................................................................................
            this._add_catchall_lexeme(mode, entry.catchall.lxid, entry);
          }
          if (entry.reserved != null) {
            this._add_reserved_lexeme(mode, entry.reserved.lxid, entry);
          }
          //.....................................................................................................
          /* TAINT use API */
          patterns = this._set_u_flag((function() {
            var ref1, results;
            ref1 = entry.lexemes;
            results = [];
            for (lxid in ref1) {
              lexeme = ref1[lxid];
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
          for (lxid in ref2) {
            lexeme = ref2[lxid];
            if (lexeme.jump_action !== 'pushmode') {
              continue;
            }
            if (this.registry[lexeme.jump_target] != null) {
              continue;
            }
            throw new E.Interlex_mode_unknown('^interlex._finalize@1^', lexeme.jump_target);
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
      /* For user override */
      reset() {}

      //---------------------------------------------------------------------------------------------------------
      _start(source = null) {
        var base, base1, base2, base3, base4, call_reset, entry, mode, ref, ref1, ref2, ref3, ref4, ref5, ref6;
        if ((this.state != null) && !this.state.finalized) {
          /* TAINT use `@types.create.ilx_state()` */
          this._finalize();
        }
        call_reset = this.state != null;
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
        this.state.delta_x = (ref2 = this.state.posapi_x1) != null ? ref2 : 0;
        this.state.posapi_x1 = null;
        this.state.pattern = (ref3 = (ref4 = this.registry) != null ? (ref5 = ref4[this.state.mode]) != null ? ref5.pattern : void 0 : void 0) != null ? ref3 : null;
        this.state.source = source;
        this.state.finished = false;
        ref6 = this.registry;
        for (mode in ref6) {
          entry = ref6[mode];
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
        if (call_reset) {
          //.......................................................................................................
          this.reset();
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
        var R, j, k, lxid, mode, ref, ref1, ref2, ref3, ref4, t, v;
        // @types.validate.ilx_token token
        t = token;
        R = [];
        if (token.jump != null) {
          [mode, lxid] = _split_token_mode_lxid(token);
          j = (ref = (ref1 = this.registry[mode]) != null ? (ref2 = ref1.lexemes[lxid]) != null ? ref2.jump : void 0 : void 0) != null ? ref : null;
          if (j != null) {
            j = `<${j}>`;
          }
          if (j == null) {
            j = '';
          }
        } else {
          j = '';
        }
        R.push(t.$key + j);
        R.push(`(${t.lnr1}:${t.x1})(${t.lnr2}:${t.x2})`);
        R.push(`=${rpr(t.value)}`);
        ref4 = (ref3 = t.data) != null ? ref3 : {};
        for (k in ref4) {
          v = ref4[k];
          R.push(`${k}:${rpr(v)}`);
        }
        return `[${R.join(',')}]`;
      }

      //---------------------------------------------------------------------------------------------------------
      _new_token(lxid, value, length, data = null, lexeme = null) {
        var $key, R, jump, lnr1, lnr2, mode, pretoken, ref, source, x1, x2;
        x1 = this.state.prv_last_idx + this.state.delta_x;
        x2 = x1 + length;
        jump = (ref = lexeme != null ? lexeme.jump : void 0) != null ? ref : null;
        ({source, mode} = this.state);
        $key = `${mode}:${lxid}`;
        lnr1 = lnr2 = this.state.lnr1;
        pretoken = {$key, jump, value, lnr1, x1, lnr2, x2, data, source};
        this._set_token_value(pretoken, lexeme, value);
        R = (lexeme != null ? lexeme.create : void 0) != null ? lexeme.create.call(this, pretoken) : pretoken;
        return freeze(R);
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
        var data, key, lexeme, ref, token, token_tid, token_value, value;
        data = null;
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
            (data != null ? data : data = {})[key] = value === '' ? null : value;
          }
        }
        lexeme = this.registry[this.state.mode].lexemes[token_tid];
        token = this._new_token(token_tid, token_value, match[0].length, data, lexeme);
        return {token, lexeme};
      }

      //---------------------------------------------------------------------------------------------------------
      run(source_or_cfg) {
        return [...(this.walk(source_or_cfg))];
      }

      //=========================================================================================================
      // WALK
      //---------------------------------------------------------------------------------------------------------
      * walk(source_or_cfg) {
        var cfg;
        cfg = this.types.cast.ilx_walk_source_or_cfg(source_or_cfg);
        if (this.cfg.first != null) {
          // @set_offset cfg
          yield this.cfg.first;
        }
        if (cfg.source != null) {
          yield* this._walk_text(cfg);
        } else {
          yield* this._walk_file_lines(cfg);
        }
        if (this.cfg.last != null) {
          yield this.cfg.last;
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
        this.feed(cfg);
        while (true) {
          if (this.state.finished) {
            //.......................................................................................................
            break;
          }
          yield* this.step();
        }
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      * _walk_text_lines(cfg) {
        var eol, line, lnr1, ref, y;
        ref = GUY.str.walk_lines_with_positions(cfg.source, {
          trim: this.cfg.trim,
          prepend: this.cfg.prepend,
          append: this.cfg.append
        });
        //.......................................................................................................
        for (y of ref) {
          ({
            lnr: lnr1,
            line,
            eol
          } = y);
          if (this.cfg.start_of_line != null) {
            yield this.cfg.start_of_line;
          }
          yield* this._walk_text_whole({
            ...cfg,
            lnr1,
            source: line,
            eol
          });
          if (this.cfg.end_of_line != null) {
            yield this.cfg.end_of_line;
          }
        }
        //.......................................................................................................
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      * _walk_file_lines(cfg) {
        var line, ref, y;
        ref = GUY.fs.walk_lines_with_positions(cfg.path, {
          trim: this.cfg.trim,
          prepend: this.cfg.prepend,
          append: this.cfg.append
        });
        /* TAINT should provide `lnr1`, `eol` as well */
        /* TAINT derive `cfg` for line iterator (`trim`, `chunk_size`) */
        for (y of ref) {
          ({line} = y);
          if (this.cfg.start_of_line != null) {
            yield this.cfg.start_of_line;
          }
          yield* this._walk_text({
            ...cfg,
            source: line
          });
          if (this.cfg.end_of_line != null) {
            yield this.cfg.end_of_line;
          }
        }
        return null;
      }

      //=========================================================================================================

      //---------------------------------------------------------------------------------------------------------
      step() {
        var R, border, is_singleton_jump, nxt, prv, prv_mode, token, token_mode;
        R = [];
        prv_mode = this.state.mode;
        token = this._step();
        //.......................................................................................................
        if (token != null) {
          R.push(token);
          token_mode = get_token_mode(token);
          if (this.cfg.border_tokens && ((this.state.mode !== prv_mode) || (token_mode !== prv_mode))) {
            if (is_singleton_jump = this.state.mode === prv_mode) {
              prv = prv_mode;
              nxt = this.get_token_mode(token);
            } else {
              prv = prv_mode;
              nxt = this.state.mode;
            }
            border = this._new_token('$border', this.cfg.border_value, 0, {prv, nxt});
            //...................................................................................................
            if (is_singleton_jump) {
              R.unshift(lets(border, function(border) {
                return border.x1 = border.x2 = token.x1;
              }));
              R.push(lets(border, function(border) {
                border.x1 = border.x2 = border.x2;
                return [border.data.prv, border.data.nxt] = [border.data.nxt, border.data.prv];
              }));
            } else {
              //...................................................................................................
              if (token_mode !== prv_mode) {
                R.unshift(lets(border, function(border) {
                  return border.x1 = border.x2 = token.x1;
                }));
              } else if (token_mode === prv_mode) {
                R.push(lets(border, function(border) {
                  return border.x1 = border.x2 = border.x2;
                }));
              }
            }
          }
        }
        //.......................................................................................................
        return R;
      }

      //---------------------------------------------------------------------------------------------------------
      _step() {
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
          if (this.cfg.eof_token) {
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
            warn('^31-10^', GUY.trm.reverse(`pattern ${rpr(token.$key)} matched empty string; stopping`));
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
          jump_cfg = GUY.props.pick_with_fallback(lexeme, null, 'jump_time', 'jump_target');
          token = lets(token, function(token) {
            return token.jump = null;
          });
          return {
            token,
            ...jump_cfg,
            jump_action: null
          };
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
        throw new E.Interlex_TBDUNCLASSIFIED('^interlex._call_jump_handler@1^', `jump handler of lexeme ${rpr(lexeme.$key)} returned illegal value ${rpr(divert)}`);
      }

      //---------------------------------------------------------------------------------------------------------
      _get_next_token(lexeme, token, match) {
        /* ???
             token = lets token, ( token ) => token.jump = if jump_action is 'nojump' then null else @state.mode
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
          case 'pushpop':
            token = this._push_mode(lexeme, token, overrides);
            token = this._pop_mode(lexeme, token, overrides);
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
            _set_token_mode(token, this.state.mode);
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
            _set_token_mode(token, jump_target);
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
      _add_catchall_lexeme(mode, lxid, entry) {
        var pattern;
        pattern = this._get_catchall_regex(mode, entry);
        if (entry.catchall.concat) {
          pattern = compose.suffix('+', pattern);
        }
        this.add_lexeme({mode, lxid, pattern});
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      _add_reserved_lexeme(mode, lxid, entry) {
        var pattern;
        pattern = this._get_reserved_regex(mode, entry);
        if (entry.reserved.concat) {
          pattern = compose.suffix('+', pattern);
        }
        this.add_lexeme({mode, lxid, pattern});
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
          throw new E.Interlex_catchall_exists('^interlex.add_catchall_lexeme@1^', cfg.mode, entry.catchall.lxid);
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
          throw new E.Interlex_reserved_exists('^interlex.add_reserved_lexeme@1^', cfg.mode, entry.reserved.lxid);
        }
        entry.reserved = cfg;
        return null;
      }

      //=========================================================================================================
      // POSITIONING API
      //---------------------------------------------------------------------------------------------------------
      set_position(cfg) {
        cfg = this.types.create.ilx_set_position_cfg(cfg);
        if (cfg.lnr1 != null) {
          this.state.lnr1 = cfg.lnr1 - 1;
        }
        if (cfg.x1 != null) {
          this.state.posapi_x1 = cfg.x1;
        }
        return null;
      }

      //---------------------------------------------------------------------------------------------------------
      get_token_position(token) {
        return GUY.props.pick_with_fallback(token, null, 'lnr1', 'x1', 'lnr2', 'x2');
      }

      static get_token_position(token) {
        return GUY.props.pick_with_fallback(token, null, 'lnr1', 'x1', 'lnr2', 'x2');
      }

    };

    //=========================================================================================================
    // GETTING AND SETTING TOKEN $KEY PARTS
    //---------------------------------------------------------------------------------------------------------
    Interlex.prototype.get_token_lxid = get_token_lxid;

    Interlex.get_token_lxid = get_token_lxid;

    //---------------------------------------------------------------------------------------------------------
    Interlex.prototype.get_token_mode = get_token_mode;

    Interlex.get_token_mode = get_token_mode;

    //---------------------------------------------------------------------------------------------------------
    Interlex.prototype.set_token_mode = set_token_mode;

    Interlex.set_token_mode = set_token_mode;

    return Interlex;

  }).call(this);

  //===========================================================================================================
  module.exports = {Interlex, compose, sorter};

}).call(this);

//# sourceMappingURL=interlex.js.map