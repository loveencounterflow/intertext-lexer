


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
{ $window }               = transforms
{ DATOM }                 = require 'datom'
{ new_datom
  select }                = DATOM


#===========================================================================================================
new_prelexer = ( cfg ) ->
  { Interlex }  = require '../main'
  lexer         = new Interlex { split: 'lines', cfg..., }
  prv_spc_count = 0
  #.......................................................................................................
  do =>
    mode = 'outline'
    nl = ( token ) => lets token, ( token ) =>
      token.value           = '\n'
      token.data           ?= {}
      token.data.spc_count  = prv_spc_count
      return token
    material = ( token ) => lets token, ( token ) =>
      token.data           ?= {}
      token.data.indent    ?= ''
      token.data.material  ?= ''
      token.data.spc_count  = prv_spc_count = token.data.indent.length
      return token
    ### NOTE consider to allow escaping newlines ###
    # lexer.add_lexeme { mode, lxid: 'escchr',         pattern: /\\(?<chr>.)/u,                      reserved: '\\', }
    lexer.add_lexeme { mode, lxid: 'nl',       create: nl,       pattern: /$/u, }
    lexer.add_lexeme { mode, lxid: 'material', create: material, pattern: /^(?<indent>\x20*)(?<material>.+)$/, }
  #.......................................................................................................
  return lexer

#===========================================================================================================
class $010_lexing extends Transformer

  #---------------------------------------------------------------------------------------------------------
  constructor: ->
    super()
    GUY.props.hide @, '_lexer', new_prelexer()
    return undefined

  #---------------------------------------------------------------------------------------------------------
  $parse: => parse = ( source, send ) =>
    for d from @_lexer.walk source
      send lets d, ( d ) -> d.$ = '^outliner@010^'
    return null


#===========================================================================================================
class $020_consolidate extends $010_lexing

  #---------------------------------------------------------------------------------------------------------
  $consolidate_newlines: ->
    { Interlex }  = require '../main'
    position      = null
    nl_count      = 0
    spc_count     = null
    stop          = Symbol 'stop'
    ref           = '^outliner@020^'
    #.......................................................................................................
    flush = ( send ) =>
      return null if nl_count is 0
      value         = '\n'.repeat nl_count
      position.lnr2 = position.lnr1 + nl_count
      if nl_count is 1
        $key          = 'outline:nl'
      else
        position.lnr2 = position.lnr1 + nl_count - 1
        position.x2   = 0
        $key          = 'outline:nls'
      data          = { nl_count, spc_count, }
      nls           = new_datom $key, { value, data, position..., $: ref, }
      nl_count      = 0
      position      = null
      spc_count     = null
      send nls
    #.......................................................................................................
    return $ { stop, }, consolidate_newlines = ( d, send ) =>
      return flush send if d is stop
      return send d if d.$stamped
      if select d, 'outline:nl'
        nl_count++
        position   ?= Interlex.get_token_position d
        spc_count  ?= d.data.spc_count
      else
        flush send
        send d
      return null

#===========================================================================================================
class $030_dentchgs extends $020_consolidate

  #---------------------------------------------------------------------------------------------------------
  start = Symbol 'start'
  stop  = Symbol 'stop'

  #---------------------------------------------------------------------------------------------------------
  $add_start_and_stop: => $ { start, stop, }, ( d, send ) => send d

  #---------------------------------------------------------------------------------------------------------
  $mark_indentation_levels: =>
    { Interlex }  = require '../main'
    prv_spc_count = 0
    ref           = '^outliner@030^'
    $key          = 'outline:dentchg'
    position      = null
    return group_indentation_levels = ( d, send ) =>
      #.....................................................................................................
      if d is start
        send start
        send new_datom $key, { lnr1: 1, x1: 0, lnr2: 1, x2: 0, data: { from: null, to: 0, }, $: ref, }
        return null
      #.....................................................................................................
      if d is stop
        send new_datom $key, { position..., data: { from: prv_spc_count, to: null, }, $: ref, }
        send stop
        return null
      #.....................................................................................................
      position = Interlex.get_token_position d
      if ( spc_count = d.data.spc_count ) isnt prv_spc_count
        send new_datom $key, { position..., data: { from: prv_spc_count, to: spc_count, }, $: ref, }
        prv_spc_count = spc_count
      #.....................................................................................................
      send d
      return null

  #---------------------------------------------------------------------------------------------------------
  $remove_start_and_stop: => ( d, send ) => send d unless ( d is start ) or ( d is stop )


#===========================================================================================================
class $040_blocks extends $030_dentchgs

  #---------------------------------------------------------------------------------------------------------
  $add_block_starts: =>
    { Interlex }  = require '../main'
    $key          = 'outline:block:start'
    ref           = '^outliner@040^'
    return add_block_starts = $window { min: -1, max: 0, empty: null, }, ( [ prv, d, ], send ) =>
      return send d unless select d, 'outline:material'
      return send d unless select prv, 'outline:dentchg', 'outline:nls'
      data      = { spc_count: d.data.spc_count, }
      position  = Interlex.get_token_position prv
      send new_datom $key, { data, position..., $: ref, }
      send d
      return null

  #---------------------------------------------------------------------------------------------------------
  $add_block_stops: =>
    { Interlex }  = require '../main'
    $key          = 'outline:block:stop'
    ref           = '^outliner@040^'
    return add_block_stops = $window { min: 0, max: +2, empty: null, }, ( [ d, d1, d2, ], send ) =>
      return send d unless select d, 'outline:material'
      return send d unless ( select d1, 'outline:nls' ) \
                      or ( ( select d1, 'outline:nl'  ) and ( select d2, 'outline:dentchg' ) )
      send d
      data      = { spc_count: d.data.spc_count, }
      position  = Interlex.get_token_position d1
      send new_datom $key, { data, position..., $: ref, }
      return null

#===========================================================================================================
@Outliner = class Outliner extends $040_blocks
  @$010_lexing:       $010_lexing
  @$020_consolidate:  $020_consolidate
  @$030_dentchgs:     $030_dentchgs
  @$040_blocks:       $040_blocks



