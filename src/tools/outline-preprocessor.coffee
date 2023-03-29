


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
@$030_structure = class $030_structure extends Transformer

  #---------------------------------------------------------------------------------------------------------
  constructor: ->
    super()
    GUY.props.hide @, '_lexer', _new_prelexer()
    return undefined

  #---------------------------------------------------------------------------------------------------------
  $structure: => structure = ( source, send ) =>
    send token for token from @_lexer.walk source
    return null

#===========================================================================================================
class @Outline_preprocessor

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    @types        = get_base_types()
    @cfg          = Object.freeze @types.create.ilx_outline_preprocessor_cfg cfg
    @_lexer       = @_new_prelexer()
    @_parser      = @_new_preparser()
    return undefined

  #---------------------------------------------------------------------------------------------------------
  walk: ( source_or_cfg ) -> @_parser.send source_or_cfg; yield from @_parser.walk()
  run:  ( source_or_cfg ) -> [ ( @walk source_or_cfg )..., ]


  #---------------------------------------------------------------------------------------------------------
  _new_preparser: ->
    { Pipeline
      $         } = require 'moonriver'
    p             = new Pipeline()
    # #.......................................................................................................
    # join = ( collector, joinerase ) =>
    #   { joiner
    #     eraser }  = joinerase
    #   first_t     = collector.at 0
    #   last_t      = collector.at -1
    #   return lets first_t, ( d ) =>
    #     #...................................................................................................
    #     if joiner?
    #       d.value = ( ( t.value for t in collector ).join joiner ).trimEnd()
    #     else
    #       parts     = []
    #       last_idx  = collector.length - 1




