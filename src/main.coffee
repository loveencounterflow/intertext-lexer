


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
{ get_base_types }        = require './types'

# { atomic
#   bound
#   capture
#   charSet
#   either
#   flags
#   lookAhead
#   lookBehind
#   maybe
#   namedCapture
#   noBound
#   notAhead
#   notBehind
#   ref
#   sequence
#   suffix                } = require 'compose-regexp-commonjs'
XXX_CRX = require 'compose-regexp-commonjs'
#-----------------------------------------------------------------------------------------------------------
XXX_unicode = ( x ) -> if ( x instanceof RegExp ) then copy_regex x, { unicode: true, } else flags.add 'u', x
XXX_sticky  = ( x ) -> if ( x instanceof RegExp ) then copy_regex x, { sticky: true,  } else flags.add 'y', x
XXX_dotall  = ( x ) -> if ( x instanceof RegExp ) then copy_regex x, { dotAll: true,  } else flags.add 's', x
XXX_dotAll  = XXX_dotall



#===========================================================================================================
class Interlex

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    throw new Error "^interlex@1^ cfg not implemented" if cfg?
    @types        = get_base_types()
    @reset()
    @base_mode    = null
    @registry     = {}
    @_metachr     = '𝔛' # used for identifying group keys
    @_metachrlen  = @_metachr.length
    return undefined

  #---------------------------------------------------------------------------------------------------------
  add_lexeme: ( cfg ) ->
    cfg           = @types.create.ilx_add_lexeme_cfg cfg
    @base_mode   ?= cfg.mode
    lexemes       = ( @registry[ cfg.mode ] ?= { lexemes: [], } ).lexemes
    pattern       =  if @types.isa.text pattern then cfg.pattern else @_rename_groups cfg.tid, cfg.pattern
    lexemes.push XXX_CRX.namedCapture ( @_metachr + cfg.tid ), pattern
    return null

  #---------------------------------------------------------------------------------------------------------
  _rename_groups: ( name, re ) ->
    source = re.source.replace /(?:(?<=\\\\)|(?<!\\))\(\?<([^>]+)>/gu, "(?<#{name}#{@_metachr}$1>"
    return new RegExp source, re.flags

  #---------------------------------------------------------------------------------------------------------
  finalize: ->
    for mode, entry of @registry
      @registry[ mode ].pattern = XXX_sticky XXX_unicode XXX_dotall XXX_CRX.either entry.lexemes...
    return null

  #---------------------------------------------------------------------------------------------------------
  reset: ->
    @state                             ?= {}
    @state.stack                        = []
    @state.mode                         = @base_mode
    @state.prv_last_idx                 = 0
    @registry[ mode ].pattern.lastIndex = 0 for mode, entry of @registry
    return null

  #---------------------------------------------------------------------------------------------------------
  _new_token: ( key, value, length, x = null ) ->
    start = @state.prv_last_idx
    stop  = start + length
    return { mode: @state.mode, key, mk: "#{@state.mode}:#{key}", value, start, stop, x, }

  #---------------------------------------------------------------------------------------------------------
  _token_from_match: ( match ) ->
    x = null
    for key, value of match.groups
      continue unless value?
      if key.startsWith @_metachr
        token_key           = key[ @_metachrlen .. ]
        token_value         = value
      else
        key                 = ( key.split @_metachr )[ 1 ]
        ( x ?= {} )[ key ]  = if value is '' then null else value
    return @_new_token token_key, token_value, match[ 0 ].length, x

  #---------------------------------------------------------------------------------------------------------
  run: ( source ) -> [ ( @walk source )..., ]

  #---------------------------------------------------------------------------------------------------------
  walk: ( source ) ->
    @reset() # if @cfg.autoreset
    pattern   = @registry[ @state.mode ].pattern
    max_index = source.length - 1
    #.......................................................................................................
    loop
      if @state.prv_last_idx > max_index
        ### reached end ###
        yield @_new_token '$eof', '', 0
        break
      match = source.match pattern
      unless match?
        yield @_new_token '$error', '', 0, { code: 'nomatch', }
        break
      if pattern.lastIndex is @state.prv_last_idx
        if match?
          warn '^31-7^', { match.groups..., }
          warn '^31-8^', token  = @_token_from_match match
          ### TAINT uses code units, should use codepoints ###
          center = token.stop
          left   = Math.max 0, center - 11
          right  = Math.min source.length, center + 11
          before = source[ left ... center ]
          after  = source[ center + 1 .. right ]
          mid    = source[ center ]
          warn '^31-9^', { before, mid, after, }
          warn '^31-10^', GUY.trm.reverse "pattern #{rpr token.key} matched empty string; stopping"
        else
          warn '^31-11^', GUY.trm.reverse "nothing matched; detected loop, stopping"
        break
      #.....................................................................................................
      token = @_token_from_match match
      yield token
      #.....................................................................................................
      if token.key.startsWith 'gosub_'
        @state.stack.push @state.mode
        @state.mode       = token.key.replace 'gosub_', ''
        old_last_idx      = pattern.lastIndex
        pattern           = @registry[ @state.mode ].pattern
        pattern.lastIndex = old_last_idx
      #.....................................................................................................
      else if token.key is 'return'
        @state.mode       = @state.stack.pop()
        old_last_idx      = pattern.lastIndex
        pattern           = @registry[ @state.mode ].pattern
        pattern.lastIndex = old_last_idx
      #.....................................................................................................
      @state.prv_last_idx = pattern.lastIndex

  #---------------------------------------------------------------------------------------------------------
  step: ->


#===========================================================================================================
module.exports = { Interlex, }

