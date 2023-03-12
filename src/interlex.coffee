


'use strict'


############################################################################################################
GUY                       = require 'guy'
{ alert
  debug
  help
  info
  plain
  praise
  urge
  warn
  whisper }               = GUY.trm.get_loggers 'INTERTEXT-LEXER'
{ rpr
  inspect
  echo
  log     }               = GUY.trm
#...........................................................................................................
{ equals
  copy_regex }            = GUY.samesame
{ misfit
  get_base_types }        = require './types'
E                         = require './errors'
#...........................................................................................................
_CRX  = require 'compose-regexp-commonjs'
_X    =
  unicode:    ( x ) -> if ( x instanceof RegExp ) then copy_regex x, { unicode: true,   } else flags.add 'u', x
  sticky:     ( x ) -> if ( x instanceof RegExp ) then copy_regex x, { sticky: true,    } else flags.add 'y', x
  dotall:     ( x ) -> if ( x instanceof RegExp ) then copy_regex x, { dotAll: true,    } else flags.add 's', x
  multiline:  ( x ) -> if ( x instanceof RegExp ) then copy_regex x, { multiline: true, } else flags.add 'm', x
_X.dotAll = _X.dotall
compose   = C = { _CRX..., _X..., }
#...........................................................................................................
{ DATOM }                 = require 'datom'
{ new_datom
  lets      }             = DATOM
{ Ltsort }                = require 'ltsort'
sorter                    = ( require './sorter' ).sorter


#===========================================================================================================
class Interlex

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    @types        = get_base_types()
    @cfg          = Object.freeze @types.create.ilx_interlex_constructor_cfg cfg
    @start()
    @base_mode    = null
    @registry     = {}
    @_metachr     = '𝔛' # used for identifying group keys
    @_metachrlen  = @_metachr.length
    return undefined

  #---------------------------------------------------------------------------------------------------------
  add_lexeme: ( cfg ) ->
    cfg                         = @types.create.ilx_add_lexeme_cfg cfg
    @state.finalized            = false
    @base_mode                 ?= cfg.mode
    entry                       = @_get_mode_entry cfg
    entry.toposort            or= cfg.needs? or cfg.precedes?
    { jump_action
      jump_time
      jump_target             } = @_parse_jump_cfg cfg.jump
    #.......................................................................................................
    if entry.lexemes[ cfg.tid ]?
      throw new E.Interlex_lexeme_exists '^interlex.add_lexeme@1^', cfg.mode, cfg.tid
    #.......................................................................................................
    entry.lexemes[ cfg.tid ]    = lexeme = { cfg..., jump_action, jump_time, jump_target, }
    lexeme.pattern              = @_rename_groups lexeme.tid, lexeme.pattern if @types.isa.regex lexeme.pattern
    lexeme.pattern              = C.namedCapture ( @_metachr + cfg.tid ), lexeme.pattern
    lexeme.type_of_value        = @types.type_of lexeme.value
    lexeme.type_of_empty_value  = @types.type_of lexeme.empty_value
    @_add_reserved_chrs cfg.mode, cfg.reserved if cfg.reserved?
    return null

  #---------------------------------------------------------------------------------------------------------
  _get_mode_entry: ( cfg ) ->
    return R if ( R = @registry[ cfg.mode ] )?
    ### TAINT use @types.create.ilx_registry_mode_entry ###
    R =
      lexemes:        {}
      pattern:        null
      toposort:       false
      reserved_chrs:  new Set()
      value:          cfg.value
      empty_value:    cfg.empty_value
      catchall:       null
      reserved:       null
    @registry[ cfg.mode ] = R
    return R

  #---------------------------------------------------------------------------------------------------------
  _parse_jump_cfg: ( jump ) ->
    return { jump_action: 'nojump',  jump_time: null, jump_target: null } unless jump?
    return { jump_action: 'callme',  jump_time: null, jump_target: null } if ( type = @types.type_of jump ) is 'function'
    #.......................................................................................................
    unless type is 'text' and jump.length > 1
      throw new E.Interlex_illegal_jump_target '^interlex._parse_jump_cfg@1^', type, jump
    #.......................................................................................................
    return { jump_action: 'popmode', jump_time: 'inclusive', jump_target: null } if jump is '.]'
    return { jump_action: 'popmode', jump_time: 'exclusive', jump_target: null } if jump is '].'
    #.......................................................................................................
    if ( jump.startsWith '[' ) and ( jump.endsWith ']' )
      return { jump_action: 'pushpop',  jump_time: 'inclusive', jump_target: jump[ 1 ... jump.length - 1 ], }
    if jump.startsWith '['
      return { jump_action: 'pushmode', jump_time: 'inclusive', jump_target: jump[ 1  ..                 ], }
    if jump.endsWith   '['
      return { jump_action: 'pushmode', jump_time: 'exclusive', jump_target: jump[   ... jump.length - 1 ], }
    #.......................................................................................................
    throw new E.Interlex_illegal_jump_target '^interlex._parse_jump_cfg@2^', type, jump

  #---------------------------------------------------------------------------------------------------------
  _rename_groups: ( name, re ) ->
    source = re.source.replace /(?:(?<=\\\\)|(?<!\\))\(\?<([^>=!]+)>/gu, "(?<#{name}#{@_metachr}$1>"
    return new RegExp source, re.flags

  #---------------------------------------------------------------------------------------------------------
  _toposort_patterns: ( entry ) ->
    ### TAINT avoid re-running ###
    return entry unless entry.toposort
    g   = new Ltsort()
    tmp = Object.assign {}, entry.lexemes ### NOTE avoiding shorthand for clarity ###
    for tid, lexeme of entry.lexemes
      tmp[ tid ]  = lexeme
      delete entry.lexemes[ tid ]
      needs       = lexeme.needs  ? []
      precedes      = lexeme.precedes ? []
      g.add { name: tid, needs, precedes, }
    for tid in g.linearize()
      entry.lexemes[ tid ] = tmp[ tid ]
    return entry

  #---------------------------------------------------------------------------------------------------------
  _set_u_flag: ( patterns ) ->
    for pattern, idx in patterns
      continue if ( not @types.isa.regex pattern ) or ( pattern.unicode )
      patterns[ idx ] = compose.unicode pattern
    return patterns

  #---------------------------------------------------------------------------------------------------------
  _finalize: ->
    return unless @state?
    for mode, entry of @registry
      entry                     = @_toposort_patterns entry
      #.....................................................................................................
      @_add_catchall_lexeme mode, entry.catchall.tid, entry if entry.catchall?
      @_add_reserved_lexeme mode, entry.reserved.tid, entry if entry.reserved?
      #.....................................................................................................
      ### TAINT use API ###
      patterns                  = @_set_u_flag ( lexeme.pattern for tid, lexeme of entry.lexemes )
      pattern                   = C.either patterns...
      ### TAINT could / should set all flags in single step ###
      pattern                   = C.dotall    pattern if @cfg.dotall
      pattern                   = C.multiline pattern if @cfg.multiline
      @registry[ mode ].pattern = C.sticky C.unicode pattern
    for mode, entry of @registry
      for tid, lexeme of entry.lexemes
        continue if lexeme.jump_action isnt 'pushmode'
        continue if @registry[ lexeme.jump_target ]?
        throw new E.Interlex_mode_unknown '^interlex._finalize@1^', lexeme.jump_target
    @state.finalized = true
    return null


  #=========================================================================================================
  #
  #---------------------------------------------------------------------------------------------------------
  start: ( source = null ) ->
    @types.validate.optional.text source
    return @_start source

  #---------------------------------------------------------------------------------------------------------
  _start: ( source = null ) ->
    ### TAINT use `@types.create.ilx_state()` ###
    @_finalize() if @state? and not @state.finalized
    @state                             ?= {}
    @state.finalized                   ?= false
    @state.offset                      ?= { lnr: 1, x: 0, }
    switch @cfg.state
      when 'keep'
        @state.stack                       ?= []
        @state.mode                        ?= @base_mode ? null
      when 'reset'
        @state.stack                        = []
        @state.mode                         = @base_mode ? null
      else
        throw new E.Interlex_TBDUNCLASSIFIED '^_start@1^', "illegal value for @cfg.state: #{rpr @cfg.state}"
    @state.prv_last_idx                 = 0
    @state.pattern                      = @registry?[ @state.mode ]?.pattern ? null
    @state.source                       = source
    @state.finished                     = false
    @registry[ mode ].pattern.lastIndex = 0 for mode, entry of @registry
    #.......................................................................................................
    if @cfg.split is 'lines'
      @state.lnr1    ?= 0
      @state.eol     ?= ''
    else
      @state.lnr1     = 0
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  feed: ( source_or_cfg ) ->
    return @_feed_source  source_or_cfg if @types.isa.text source_or_cfg
    return @_feed_cfg     source_or_cfg

  #---------------------------------------------------------------------------------------------------------
  _feed_cfg: ( cfg ) ->
    @state.eol  = ( cfg.eol ? '' ) if ( @cfg.split is 'lines' )
    return @_feed_source cfg.source

  #---------------------------------------------------------------------------------------------------------
  _feed_source: ( source ) ->
    @state.lnr1++ if ( @cfg.split is 'lines' )
    @types.validate.text source
    return @_start source # if @cfg.autostart
    @state.source = source
    return null

  #---------------------------------------------------------------------------------------------------------
  rpr_token: ( token ) ->
    # @types.validate.ilx_token token
    t = token
    R = []
    if token.jump?
      j   = @registry[ token.mode ]?.lexemes[ token.tid ]?.jump ? null
      j   = "<#{j}>" if j?
      j  ?= ''
    else
      j   = ''
    R.push t.mk + j
    R.push "(#{t.lnr1}:#{t.x1})(#{t.lnr2}:#{t.x2})"
    R.push "=#{rpr t.value}"
    R.push "#{k}:#{rpr v}" for k, v of t.data ? {}
    return "[#{R.join ','}]"

  #---------------------------------------------------------------------------------------------------------
  _new_token: ( tid, value, length, data = null, lexeme = null ) ->
    x1        = @state.prv_last_idx + @state.offset.x
    x2        = x1 + length
    jump      = lexeme?.jump ? null
    { source
      mode  } = @state
    #.......................................................................................................
    ### TAINT use `types.create.ilx_token {}` ###
    lnr1  = lnr2 = @state.lnr1 + @state.offset.lnr - 1
    R     = { mode, tid, mk: "#{mode}:#{tid}", jump, value, lnr1, x1, lnr2, x2, data, source, }
    #.......................................................................................................
    @_set_token_value R, lexeme, value
    #.......................................................................................................
    if lexeme?.create?
      R = lexeme.create.call @, R
    return new_datom "^#{mode}", R

  #---------------------------------------------------------------------------------------------------------
  _set_token_value: ( token, lexeme, value ) ->
    if lexeme?.empty_value? and ( ( not token.value? ) or ( token.value is '' ) )
      switch lexeme.type_of_empty_value
        when 'text'     then token.value  = lexeme.empty_value
        when 'function' then token.value  = lexeme.empty_value.call @, token
        else throw new E.Interlex_internal_error '^_new_token@1^', \
          "unknown type of lexeme.empty_value: #{rpr lexeme.type_of_empty_value}"
    else if lexeme?.value?
      switch lexeme.type_of_value
        when 'text'     then token.value  = lexeme.value
        when 'function' then token.value  = lexeme.value.call       @, token
        else throw new E.Interlex_internal_error '^_new_token@2^', \
          "unknown type of lexeme.value: #{rpr lexeme.type_of_value}"
    return null

  #---------------------------------------------------------------------------------------------------------
  _token_and_lexeme_from_match: ( match ) ->
    data = null
    for key, value of match.groups
      continue unless value?
      if key.startsWith @_metachr
        token_tid           = key[ @_metachrlen .. ]
        token_value         = value
      else
        key                 = ( key.split @_metachr )[ 1 ]
        ( data ?= {} )[ key ]  = if value is '' then null else value
    lexeme  = @registry[ @state.mode ].lexemes[ token_tid ]
    token   = @_new_token token_tid, token_value, match[ 0 ].length, data, lexeme
    return { token, lexeme, }

  #---------------------------------------------------------------------------------------------------------
  run: ( source_or_cfg ) -> [ ( @walk source_or_cfg )..., ]


  #=========================================================================================================
  # WALK
  #---------------------------------------------------------------------------------------------------------
  walk: ( source_or_cfg ) ->
    cfg = @types.cast.ilx_walk_source_or_cfg source_or_cfg
    @set_offset cfg
    return @_walk_text        cfg if cfg.source?
    return @_walk_file_lines  cfg

  #---------------------------------------------------------------------------------------------------------
  _walk_text: ( cfg ) ->
    return @_walk_text_lines cfg if ( @cfg.split is 'lines' )
    return @_walk_text_whole cfg

  #---------------------------------------------------------------------------------------------------------
  _walk_text_whole: ( cfg ) ->
    @feed cfg
    #.......................................................................................................
    loop
      break if @state.finished
      yield from @step()
    return null

  #---------------------------------------------------------------------------------------------------------
  _walk_text_lines: ( cfg ) ->
    for { lnr: lnr1, line, eol, } from GUY.str.walk_lines_with_positions cfg.source, \
      { trim: @cfg.trim, prepend: @cfg.prepend, append: @cfg.append, }
      yield from @_walk_text_whole { cfg..., lnr1, source: line, eol, }
    return null

  #---------------------------------------------------------------------------------------------------------
  _walk_file_lines: ( cfg ) ->
    ### TAINT should provide `lnr1`, `eol` as well ###
    ### TAINT derive `cfg` for line iterator (`trim`, `chunk_size`) ###
    for { line, } from GUY.fs.walk_lines_with_positions cfg.path, \
      { trim: @cfg.trim, prepend: @cfg.prepend, append: @cfg.append, }
      yield from @_walk_text { cfg..., source: line, }
    return null


  #=========================================================================================================
  #
  #---------------------------------------------------------------------------------------------------------
  step: ->
    R         = []
    prv_mode  = @state.mode
    token     = @_step()
    #.......................................................................................................
    if token?
      R.push token
      if @cfg.border_tokens and ( ( @state.mode isnt prv_mode ) or ( token.mode isnt prv_mode ) )
        if is_singleton_jump = ( @state.mode is prv_mode )
          prv = prv_mode
          nxt = token.mode
        else
          prv = prv_mode
          nxt = @state.mode
        border = @_new_token '$border', @cfg.border_value, 0, { prv, nxt, }
        #...................................................................................................
        if is_singleton_jump
          R.unshift lets border, ( border ) ->
            border.x1 = border.x2 = token.x1
          R.push    lets border, ( border ) ->
            border.x1 = border.x2 = border.x2
            [ border.data.prv, border.data.nxt, ] = [ border.data.nxt, border.data.prv, ]
        #...................................................................................................
        else
          if token.mode isnt prv_mode
            R.unshift lets border, ( border ) -> border.x1 = border.x2 = token.x1
          else if token.mode is prv_mode
            R.push    lets border, ( border ) -> border.x1 = border.x2 = border.x2
    #.......................................................................................................
    return R

  #---------------------------------------------------------------------------------------------------------
  _step: ->
    #.......................................................................................................
    ### Affordance for lexemes matching only end-of-input (pattern `/$/y`): ###
    if ( @state.prv_last_idx is @state.source.length ) and ( match = @state.source.match @state.pattern )?
      ### TAINT code duplication ###
      { token
        lexeme          } = @_token_and_lexeme_from_match match
      token               = @_get_next_token lexeme, token, match
      @state.prv_last_idx = @state.pattern.lastIndex + 1
      return token
    #.......................................................................................................
    if @state.prv_last_idx >= @state.source.length
      ### reached end ###
      @state.finished     = true
      token               = @_new_token '$eof', '', 0 if @cfg.end_token
      return token
    #.......................................................................................................
    match = @state.source.match @state.pattern
    #.......................................................................................................
    unless match?
      ### TAINT might want to advance and try again? ###
      @state.finished  = true
      token            = @_new_token '$error', '', 0, { code: 'nomatch', }
      return token
    #.......................................................................................................
    if @state.pattern.lastIndex is @state.prv_last_idx
      if match?
        { token } = @_token_and_lexeme_from_match match
        ### TAINT uses code units, should use codepoints ###
        center    = token.x2
        left      = Math.max 0, center - 11
        right     = Math.min @state.source.length, center + 11
        before    = @state.source[ left ... center ]
        after     = @state.source[ center + 1 .. right ]
        mid       = @state.source[ center ]
        ### TAINT raise error or return error token ###
        warn '^31-9^', { before, mid, after, }
        warn '^31-10^', GUY.trm.reverse "pattern #{rpr token.tid} matched empty string; stopping"
        @state.finished = true
      else
        ### TAINT raise error or return error token ###
        warn '^31-11^', GUY.trm.reverse "nothing matched; detected loop, stopping"
        @state.finished = true
        return null
    #.......................................................................................................
    { token
      lexeme          } = @_token_and_lexeme_from_match match
    token               = @_get_next_token lexeme, token, match
    @state.prv_last_idx = @state.pattern.lastIndex
    return token

  #---------------------------------------------------------------------------------------------------------
  _call_jump_handler: ( lexeme, token, match ) ->
    unless ( divert = lexeme.jump { token, match, lexer: @, } )?
      jump_cfg = GUY.props.pick_with_fallback lexeme, null, 'jump_action', 'jump_time', 'jump_target'
      return { token, jump_cfg..., }
    #.......................................................................................................
    switch type = @types.type_of divert
      when 'text'
        return { token, ( @_parse_jump_cfg divert )..., }
      when 'object'
        token = divert.token ? token
        if divert.jump?
          jump_cfg = @_parse_jump_cfg divert.jump
        else
          jump_cfg = null
        return { token, jump_cfg..., }
    #.......................................................................................................
    throw new E.Interlex_TBDUNCLASSIFIED '^interlex._call_jump_handler@1^', \
      "jump handler of lexeme #{rpr lexeme.mk} returned illegal value #{rpr divert}"

  #---------------------------------------------------------------------------------------------------------
  _get_next_token: ( lexeme, token, match ) ->
    ### TAINT code duplication ###
    if lexeme.jump_action is 'callme'
      { token
        jump_action
        jump_time
        jump_target } = @_call_jump_handler lexeme, token, match
      overrides       = { jump_action, jump_time, jump_target, }
      ### ???
      token = lets token, ( token ) => token.jump = if jump_action is 'nojump' then null else @state.mode
      ###
    else
      { jump_action
        jump_time
        jump_target } = lexeme
      overrides       = null
    return token unless jump_action?
    switch jump_action
      when 'nojump'   then null
      when 'pushpop'
        token = @_push_mode  lexeme, token, overrides
        token = @_pop_mode   lexeme, token, overrides
      when 'pushmode' then token = @_push_mode  lexeme, token, overrides
      when 'popmode'  then token = @_pop_mode   lexeme, token, overrides
      else
        throw new E.Interlex_internal_error '^interlex._get_next_token@2^', \
          "unknown jump_action (#{rpr jump_action}) from lexeme #{rpr lexeme}"
    return token

  #---------------------------------------------------------------------------------------------------------
  _pop_mode: ( lexeme, token, overrides ) ->
    unless @state.stack.length > 0
      throw new E.Interlex_mode_stack_exhausted '^interlex._pop_mode@2^', \
        "unable to jump back from initial state"
    { jump_time }             = overrides ? lexeme
    @state.mode               = @state.stack.pop()
    old_last_idx              = @state.pattern.lastIndex
    @state.pattern            = @registry[ @state.mode ].pattern
    @state.pattern.lastIndex  = old_last_idx
    return lets token, ( token ) =>
      token.jump = @state.mode
      if jump_time is 'exclusive'
        token.mode = @state.mode
        ### TAINT use API ###
        token.mk = "#{token.mode}:#{token.tid}"
      return null

  #---------------------------------------------------------------------------------------------------------
  _push_mode: ( lexeme, token, overrides ) ->
    { jump_target
      jump_time   }           = overrides ? lexeme
    @state.stack.push @state.mode
    @state.mode               = jump_target
    old_last_idx              = @state.pattern.lastIndex
    @state.pattern            = @registry[ @state.mode ].pattern
    @state.pattern.lastIndex  = old_last_idx
    return lets token, ( token ) =>
      token.jump = jump_target
      if jump_time is 'inclusive'
        token.mode = jump_target
        ### TAINT use API ###
        token.mk = "#{token.mode}:#{token.tid}"
      return null


  #=========================================================================================================
  # CATCHALL & RESERVED
  #---------------------------------------------------------------------------------------------------------
  _add_reserved_chrs: ( mode, reserved_chrs ) ->
    unless ( entry = @registry[ mode ] )?
      throw new E.Interlex_internal_error '^interlex._add_reserved_chrs@1^', "no such mode: #{rpr mode}"
    if @types.isa.list reserved_chrs
      @_add_reserved_chrs mode, x for x in reserved_chrs
      return null
    ### NOTE may accept regexes in the future ###
    @types.validate.nonempty.text reserved_chrs
    entry.reserved_chrs.add reserved_chrs
    return null

  #---------------------------------------------------------------------------------------------------------
  _get_catchall_regex: ( mode, entry ) -> compose.charSet.complement @_get_reserved_regex mode, entry
  _get_reserved_regex: ( mode, entry ) -> compose.either entry.reserved_chrs...

  #---------------------------------------------------------------------------------------------------------
  _add_catchall_lexeme: ( mode, tid, entry ) ->
    pattern = @_get_catchall_regex mode, entry
    pattern = compose.suffix '+', pattern if entry.catchall.concat
    @add_lexeme { mode, tid, pattern, }
    return null

  #---------------------------------------------------------------------------------------------------------
  _add_reserved_lexeme: ( mode, tid, entry ) ->
    pattern = @_get_reserved_regex mode, entry
    pattern = compose.suffix '+', pattern if entry.reserved.concat
    @add_lexeme { mode, tid, pattern, }
    return null

  #---------------------------------------------------------------------------------------------------------
  add_catchall_lexeme: ( cfg ) ->
    cfg       = @types.create.ilx_add_catchall_lexeme_cfg cfg
    cfg.mode ?= @base_mode
    unless ( entry = @registry[ cfg.mode ] )?
      throw new E.Interlex_mode_unknown '^interlex.add_catchall_lexeme@1^', cfg.mode
    if entry.catchall?
      throw new E.Interlex_catchall_exists '^interlex.add_catchall_lexeme@1^', cfg.mode, entry.catchall.tid
    entry.catchall = cfg
    return null

  #---------------------------------------------------------------------------------------------------------
  add_reserved_lexeme: ( cfg ) ->
    cfg       = @types.create.ilx_add_reserved_lexeme_cfg cfg
    cfg.mode ?= @base_mode
    unless ( entry = @registry[ cfg.mode ] )?
      throw new E.Interlex_mode_unknown '^interlex.add_reserved_lexeme@1^', cfg.mode
    if entry.reserved?
      throw new E.Interlex_reserved_exists '^interlex.add_reserved_lexeme@1^', cfg.mode, entry.reserved.tid
    entry.reserved = cfg
    return null

  #=========================================================================================================
  # POSITIONING API
  #---------------------------------------------------------------------------------------------------------
  set_offset: ( cfg ) ->
    cfg           = @types.create.ilx_set_offset_cfg cfg
    @state.offset = { cfg..., }
    return null


#===========================================================================================================
module.exports = { Interlex, compose, sorter, }

