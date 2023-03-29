


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
  whisper }               = GUY.trm.get_loggers 'INTERLEX/OUTLINE-PREPROC'
{ rpr
  inspect
  echo
  log     }               = GUY.trm
{ misfit
  get_base_types }        = require '../types'
lets                      = GUY.lft.lets
{ Transformer
  transforms
  $           }           = require 'moonriver'



#===========================================================================================================
_new_prelexer = ( cfg ) ->
  { Interlex }  = require '../main'
  lexer         = new Interlex { split: 'lines', cfg..., }
  prv_spc_count = 0
  #.......................................................................................................
  do =>
    mode = 'outline'
    nl = ( token ) =>
      token.value           = '\n'
      token.data           ?= {}
      token.data.spc_count  = prv_spc_count
      return token
    material = ( token ) =>
      token.data           ?= {}
      token.data.indent    ?= ''
      token.data.material  ?= ''
      token.data.spc_count  = prv_spc_count = token.data.indent.length
      return token
    ### NOTE consider to allow escaping newlines ###
    # lexer.add_lexeme { mode, tid: 'escchr',         pattern: /\\(?<chr>.)/u,                      reserved: '\\', }
    lexer.add_lexeme { mode, tid: 'nl',       create: nl,       pattern: /$/u, }
    lexer.add_lexeme { mode, tid: 'material', create: material, pattern: /^(?<indent>\x20*)(?<material>.+)$/, }
  #.......................................................................................................
  return lexer

#===========================================================================================================
@$010_lexing = class $010_lexing extends Transformer

  #---------------------------------------------------------------------------------------------------------
  constructor: ->
    super()
    GUY.props.hide @, '_lexer', _new_prelexer()
    return undefined

  #---------------------------------------------------------------------------------------------------------
  $parse: => parse = ( source, send ) =>
    send token for token from @_lexer.walk source
    return null

#===========================================================================================================
@$020_consolidate = class $020_consolidate extends $010_lexing

  #---------------------------------------------------------------------------------------------------------
  $consolidate_newlines: ->
    { Interlex }  = require '../main'
    position      = null
    nl_count      = 0
    spc_count     = null
    stop          = Symbol 'stop'
    template      = { mode: 'plain', tid: 'nls', mk: 'plain:nls', $: '^outliner.020^', }
    #.......................................................................................................
    flush = ( send ) =>
      return null if nl_count is 0
      value         = '\n'.repeat nl_count
      position.lnr2 = position.lnr1 + nl_count
      if nl_count > 1
        position.lnr2 = position.lnr1 + nl_count - 1
        position.x2   = 0
      data          = { nl_count, spc_count, }
      nls           = { template..., value, data, position..., }
      nl_count         = 0
      position      = null
      spc_count     = null
      send nls
    #.......................................................................................................
    return $ { stop, }, consolidate_newlines = ( d, send ) =>
      return flush send if d is stop
      return send d if d.$stamped
      if d.mk is 'outline:nl'
        nl_count++
        position   ?= Interlex.get_token_position d
        spc_count  ?= d.data.spc_count
      else
        flush send
        send d
      return null

#===========================================================================================================
@$030_structure = class $030_structure extends $020_consolidate

  #---------------------------------------------------------------------------------------------------------
  start = Symbol 'start'
  stop  = Symbol 'stop'

  #---------------------------------------------------------------------------------------------------------
  $add_start_and_stop: => $ { start, stop, }, ( d, send ) => send d

  #---------------------------------------------------------------------------------------------------------
  $mark_indentation_levels: =>
    { Interlex }  = require '../main'
    prv_spc_count = 0
    template      = { mode: 'outline', tid: 'dentchg', mk: 'outline:dentchg', $: '^outliner.030^', }
    position      = null
    return group_indentation_levels = ( d, send ) =>
      if d is start
        return send { template..., lnr1: 1, x1: 0, lnr2: 1, x2: 0, data: { from: prv_spc_count, to: 0, }, }
      if d is stop
        return send { template..., position..., data: { from: prv_spc_count, to: 0, }, }
      position = Interlex.get_token_position d
      if ( spc_count = d.data.spc_count ) isnt prv_spc_count
        send { template..., position..., data: { from: prv_spc_count, to: spc_count, }, }
        prv_spc_count = spc_count
      send d
      return null





