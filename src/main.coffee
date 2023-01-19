


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
  jump_symbol
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


#===========================================================================================================
class Interlex

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    @types        = get_base_types()
    @cfg          = Object.freeze @types.create.ilx_constructor_cfg cfg
    @start()
    @base_mode    = null
    @registry     = {}
    @_metachr     = '𝔛' # used for identifying group keys
    @_metachrlen  = @_metachr.length
    @jump_symbol  = jump_symbol
    return undefined

  #---------------------------------------------------------------------------------------------------------
  add_lexeme: ( cfg ) ->
    cfg                       = @types.create.ilx_add_lexeme_cfg cfg
    @state.finalized          = false
    @base_mode               ?= cfg.mode
    ### TAINT use API ###
    entry                     = @registry[ cfg.mode ] ?= { lexemes: {}, pattern: null, }
    type_of_jump              = @_get_type_of_jump cfg.jump
    entry.lexemes[ cfg.tid ]  = lexeme = { cfg..., type_of_jump, }
    lexeme.pattern            = if @types.isa.regex lexeme.pattern then @_rename_groups lexeme.tid, lexeme.pattern
    lexeme.pattern            = C.namedCapture ( @_metachr + cfg.tid ), lexeme.pattern
    return null

  #---------------------------------------------------------------------------------------------------------
  _get_type_of_jump: ( jump ) ->
    return 'nojump'   if not jump?
    return 'popmode'  if jump is jump_symbol
    return 'callme'   if @types.isa.function jump
    return 'pushmode' if @types.isa.nonempty.text jump
    @types.validate.ilx_jump jump
    throw new E.Interlex_internal_error '^interlex._get_type_of_jump@1^', \
      "jump (#{@types.type_of jump}) #{rpr jump} should have caused validation error but didn't"

  #---------------------------------------------------------------------------------------------------------
  _rename_groups: ( name, re ) ->
    source = re.source.replace /(?:(?<=\\\\)|(?<!\\))\(\?<([^>]+)>/gu, "(?<#{name}#{@_metachr}$1>"
    return new RegExp source, re.flags

  #---------------------------------------------------------------------------------------------------------
  _finalize: ->
    return unless @state?
    for mode, entry of @registry
      ### TAINT use API ###
      patterns                  = ( lexeme.pattern for tid, lexeme of entry.lexemes )
      pattern                   = C.either patterns...
      ### TAINT could / should set all flags in single step ###
      pattern                   = C.dotall    pattern if @cfg.dotall
      pattern                   = C.multiline pattern if @cfg.multiline
      @registry[ mode ].pattern = C.sticky C.unicode pattern
    for mode, entry of @registry
      for tid, lexeme of entry.lexemes
        continue if lexeme.type_of_jump isnt 'pushmode'
        continue if @registry[ lexeme.jump ]?
        throw new E.Interlex_TBDUNCLASSIFIED '^interlex._finalize@1^', "unknown jump target in lexeme #{rpr lexeme}"
    @state.finalized = true
    return null

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
    @state.stack                        = []
    @state.prv_last_idx                 = 0
    @state.mode                         = @base_mode ? null
    @state.pattern                      = @registry?[ @state.mode ]?.pattern ? null
    @state.source                       = source
    @state.finished                     = false
    @registry[ mode ].pattern.lastIndex = 0 for mode, entry of @registry
    return null

  #---------------------------------------------------------------------------------------------------------
  feed: ( source ) ->
    @types.validate.text source
    return @_start source if @cfg.autostart
    @state.source = source
    return null

  #---------------------------------------------------------------------------------------------------------
  rpr_token: ( token ) ->
    # @types.validate.ilx_token token
    t = token
    j = token.jump
    R = []
    R.push t.mk + if j? then ( if j is jump_symbol then j else ">#{j}") else ''
    R.push "(#{t.start}:#{t.stop})"
    R.push "=#{rpr t.value}"
    R.push "#{k}:#{rpr v}" for k, v of t.x ? {}
    return "[#{R.join ','}]"

  #---------------------------------------------------------------------------------------------------------
  _new_token: ( tid, value, length, x = null, lexeme = null ) ->
    start     = @state.prv_last_idx
    stop      = start + length
    jump      = lexeme?.jump ? null
    { mode  } = @state
    ### TAINT use `types.create.ilx_token {}` ###
    return new_datom "^#{mode}", { mode, tid, mk: "#{mode}:#{tid}", jump, value, start, stop, x, }
    # return { mode: @state.mode, tid, mk: "#{@state.mode}:#{tid}", jump, value, start, stop, x, }

  #---------------------------------------------------------------------------------------------------------
  _token_and_lexeme_from_match: ( match ) ->
    x = null
    for key, value of match.groups
      continue unless value?
      if key.startsWith @_metachr
        token_tid           = key[ @_metachrlen .. ]
        token_value         = value
      else
        key                 = ( key.split @_metachr )[ 1 ]
        ( x ?= {} )[ key ]  = if value is '' then null else value
    lexeme  = @registry[ @state.mode ].lexemes[ token_tid ]
    token   = @_new_token token_tid, token_value, match[ 0 ].length, x, lexeme
    return { token, lexeme, }

  #---------------------------------------------------------------------------------------------------------
  run: ( source ) -> [ ( @walk source )..., ]

  #---------------------------------------------------------------------------------------------------------
  walk: ( source ) ->
    @feed source
    #.......................................................................................................
    loop
      break if @state.finished
      yield Y if ( Y = @step() )?
    return null

  #---------------------------------------------------------------------------------------------------------
  step: ->
    if @state.prv_last_idx >= @state.source.length
      ### reached end ###
      @state.finished = true
      return @_new_token '$eof', '', 0
    match = @state.source.match @state.pattern
    unless match?
      ### TAINT might want to advance and try again? ###
      @state.finished = true
      return @_new_token '$error', '', 0, { code: 'nomatch', }
    if @state.pattern.lastIndex is @state.prv_last_idx
      if match?
        { token } = @_token_and_lexeme_from_match match
        ### TAINT uses code units, should use codepoints ###
        center    = token.stop
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
    #.....................................................................................................
    { token
      lexeme  } = @_token_and_lexeme_from_match match
    token       = @_xxx { token, lexeme, match, }
    @state.prv_last_idx = @state.pattern.lastIndex
    return token

  #---------------------------------------------------------------------------------------------------------
  _call_jump_handler: ( R ) ->
    return R

  #---------------------------------------------------------------------------------------------------------
  _xxx: ( { token, lexeme, match, }, level = 0 ) ->
    switch lexeme.type_of_jump
      when 'nojump'   then null
      when 'pushmode' then @_push_mode lexeme.jump
      when 'popmode'  then @_pop_mode()
      when 'callme'
        divert = @_call_jump_handler lexeme.jump { token, match, lexer: @, }
        if @types.isa.text ( divert )
          ### TAINT here we're recursively doing the same logic as in the above ###
          if divert is jump_symbol then @_pop_mode()
          else @_push_mode divert
        else
          if divert?
            token = replacement_token if ( replacement_token = divert.token )?
            jump  = divert.jump ? null
          if jump?
            ### TAINT here we're recursively doing the same logic as in the above ###
            if jump is jump_symbol then @_pop_mode()
            else @_push_mode jump
      else
        throw new E.Interlex_internal_error '^interlex.step@1^', "unknown type_of_jump in lexeme #{rpr lexeme}"
    return token

  # #---------------------------------------------------------------------------------------------------------
  # _xxx: ( { token, lexeme, match, }, level = 0 ) ->
  #   switch lexeme.type_of_jump
  #     when 'nojump' then null
  #     when 'pushmode' then @_push_mode lexeme.jump
  #     when 'popmode'  then @_pop_mode()
  #     when 'callme'
  #       divert = lexeme.jump { token, lexeme, match, lexer: @, }
  #       switch @_get_type_of_jump divert
  #         when 'nojump' then null
  #         when 'pushmode' then @_push_mode divert
  #         when 'popmode'  then @_pop_mode()
  #         when 'callme'
  #           throw new Error "^interlex._xxx@1^ not allowed to return function from `jump()`"
  #       else
  #         if divert?
  #           token = replacement_token if ( replacement_token = divert.token )?
  #           jump  = divert.jump ? null
  #         if jump?
  #           ### TAINT here we're recursively doing the same logic as in the above ###
  #           if jump is jump_symbol then @_pop_mode()
  #           else @_push_mode jump
  #     else
  #       throw new Error "^interlex._xxx@1^ internal error: unknown type_of_jump in lexeme #{rpr lexeme}"
  #   return token

  #---------------------------------------------------------------------------------------------------------
  _pop_mode: ->
    @state.mode               = @state.stack.pop()
    old_last_idx              = @state.pattern.lastIndex
    @state.pattern            = @registry[ @state.mode ].pattern
    @state.pattern.lastIndex  = old_last_idx
    return null

  #---------------------------------------------------------------------------------------------------------
  _push_mode: ( jump ) ->
    @state.stack.push @state.mode
    @state.mode               = jump
    old_last_idx              = @state.pattern.lastIndex
    @state.pattern            = @registry[ @state.mode ].pattern
    @state.pattern.lastIndex  = old_last_idx
    return null


#===========================================================================================================
module.exports = { Interlex, compose, }

