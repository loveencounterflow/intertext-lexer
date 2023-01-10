


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
  add_lexeme: ( mode, name, pattern ) ->
    @base_mode   ?= mode
    lexemes       = ( @registry[ mode ] ?= { lexemes: [], } ).lexemes
    lexemes.push XXX_CRX.namedCapture ( @_metachr + name ), pattern
    return null

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
  _token_from_match: ( prv_last_idx, match, mode = null ) ->
    x = null
    R = { mode, }
    for key, value of match.groups
      continue unless value?
      if key.startsWith @_metachr
        R.key     = key[ @_metachrlen .. ]
        R.mk      = if mode? then "#{mode}:#{R.key}" else R.key
        R.value   = value
      else
        ( x ?= {} )[ key ]  = if value is '' then null else value
    R.start = prv_last_idx
    R.stop  = prv_last_idx + match[ 0 ].length
    R.x     = x
    return R


#===========================================================================================================
module.exports = { Interlex, }

