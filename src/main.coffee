


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
#...........................................................................................................
_CRX  = require 'compose-regexp-commonjs'
_X    =
  unicode:  ( x ) -> if ( x instanceof RegExp ) then copy_regex x, { unicode: true, } else flags.add 'u', x
  sticky:   ( x ) -> if ( x instanceof RegExp ) then copy_regex x, { sticky: true,  } else flags.add 'y', x
  dotall:   ( x ) -> if ( x instanceof RegExp ) then copy_regex x, { dotAll: true,  } else flags.add 's', x
_X.dotAll = _X.dotall
compose   = C = { _CRX..., _X..., }

#===========================================================================================================
class Interlex

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    throw new Error "^interlex@1^ cfg not implemented" if cfg?
    ###
    cfg =
      autoreset:    true
      end_token:    true
      error_tokens: true
    ###
    @types        = get_base_types()
    @reset()
    @base_mode    = null
    @registry     = {}
    @_metachr     = '𝔛' # used for identifying group keys
    @_metachrlen  = @_metachr.length
    @jump_symbol  = jump_symbol
    return undefined

  #---------------------------------------------------------------------------------------------------------
  add_lexeme: ( cfg ) ->
    cfg                       = @types.create.ilx_add_lexeme_cfg cfg
    @base_mode               ?= cfg.mode
    ### TAINT use API ###
    entry                     = @registry[ cfg.mode ] ?= { lexemes: {}, pattern: null, }
    entry.lexemes[ cfg.tid ]  = lexeme = { cfg..., }
    lexeme.pattern            = if @types.isa.regex lexeme.pattern then @_rename_groups lexeme.tid, lexeme.pattern
    lexeme.pattern            = C.namedCapture ( @_metachr + cfg.tid ), lexeme.pattern
    return null

  #---------------------------------------------------------------------------------------------------------
  _rename_groups: ( name, re ) ->
    source = re.source.replace /(?:(?<=\\\\)|(?<!\\))\(\?<([^>]+)>/gu, "(?<#{name}#{@_metachr}$1>"
    return new RegExp source, re.flags

  #---------------------------------------------------------------------------------------------------------
  finalize: ->
    for mode, entry of @registry
      ### TAINT use API ###
      patterns                  = ( lexeme.pattern for tid, lexeme of entry.lexemes )
      @registry[ mode ].pattern = C.sticky C.unicode C.dotall C.either patterns...
    for mode, entry of @registry
      for tid, lexeme of entry.lexemes
        continue unless lexeme.jump?
        continue if lexeme.jump is jump_symbol
        continue if @registry[ lexeme.jump ]?
        throw new Error "^interlex.finalize@1^ unknown jump target in lexeme #{rpr lexeme}"
    return null

  #---------------------------------------------------------------------------------------------------------
  reset: ->
    ### TAINT use `@types.create.ilx_state()` ###
    @state                             ?= {}
    @state.stack                        = []
    @state.mode                         = @base_mode
    @state.prv_last_idx                 = 0
    @state.pattern                      = null
    @registry[ mode ].pattern.lastIndex = 0 for mode, entry of @registry
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
    start = @state.prv_last_idx
    stop  = start + length
    jump  = lexeme?.jump ? null
    ### TAINT use `types.create.ilx_token {}` ###
    return { mode: @state.mode, tid, mk: "#{@state.mode}:#{tid}", jump, value, start, stop, x, }

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
    @reset() # if @cfg.autoreset
    @state.pattern  = @registry[ @state.mode ].pattern
    max_index       = source.length - 1
    #.......................................................................................................
    loop
      if @state.prv_last_idx > max_index
        ### reached end ###
        yield @_new_token '$eof', '', 0
        break
      match = source.match @state.pattern
      unless match?
        yield @_new_token '$error', '', 0, { code: 'nomatch', }
        break
      if @state.pattern.lastIndex is @state.prv_last_idx
        if match?
          { token } = @_token_and_lexeme_from_match match
          ### TAINT uses code units, should use codepoints ###
          center    = token.stop
          left      = Math.max 0, center - 11
          right     = Math.min source.length, center + 11
          before    = source[ left ... center ]
          after     = source[ center + 1 .. right ]
          mid       = source[ center ]
          warn '^31-9^', { before, mid, after, }
          warn '^31-10^', GUY.trm.reverse "pattern #{rpr token.tid} matched empty string; stopping"
        else
          warn '^31-11^', GUY.trm.reverse "nothing matched; detected loop, stopping"
        break
      #.....................................................................................................
      { token
        lexeme } = @_token_and_lexeme_from_match match
      yield token
      #.....................................................................................................
      if      lexeme.jump is jump_symbol  then @_pop_mode()
      else if lexeme.jump?                then @_push_mode lexeme
      @state.prv_last_idx = @state.pattern.lastIndex
    #.......................................................................................................
    return null

  #---------------------------------------------------------------------------------------------------------
  _pop_mode: ->
    @state.mode               = @state.stack.pop()
    old_last_idx              = @state.pattern.lastIndex
    @state.pattern            = @registry[ @state.mode ].pattern
    @state.pattern.lastIndex  = old_last_idx
    return null

  #---------------------------------------------------------------------------------------------------------
  _push_mode: ( lexeme ) ->
    @state.stack.push @state.mode
    @state.mode               = lexeme.jump
    old_last_idx              = @state.pattern.lastIndex
    @state.pattern            = @registry[ @state.mode ].pattern
    @state.pattern.lastIndex  = old_last_idx
    return null

  #---------------------------------------------------------------------------------------------------------
  step: ->


#===========================================================================================================
module.exports = { Interlex, compose, }

