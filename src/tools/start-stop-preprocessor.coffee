


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
  whisper }               = GUY.trm.get_loggers 'INTERLEX/START-STOP-PREPROC'
{ rpr
  inspect
  echo
  log     }               = GUY.trm
{ misfit
  get_base_types }        = require '../types'
lets                      = GUY.lft.lets


#===========================================================================================================
class @Start_stop_preprocessor

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    @types        = get_base_types()
    @cfg          = Object.freeze @types.create.ilx_start_stop_preprocessor_cfg cfg
    @_lexer       = @_new_prelexer()
    @_parser      = @_new_preparser()
    return undefined

  #---------------------------------------------------------------------------------------------------------
  walk: ( source_or_cfg ) -> @_parser.send source_or_cfg; yield from @_parser.walk()
  run:  ( source_or_cfg ) -> [ ( @walk source_or_cfg )..., ]

  #---------------------------------------------------------------------------------------------------------
  _new_prelexer: ( cfg ) ->
    { Interlex }  = require '../main'
    lexer         = new Interlex { split: 'lines', append: '\n', cfg..., }
    #.......................................................................................................
    do =>
      mode = 'meta'
      create = ( token ) ->
        token.data        ?= {}
        token.data.scope  ?= 'local'
        return token
      lexer.add_lexeme { mode, tid: 'start',          pattern: /(?<!\\)<\?start\?>/,                      reserved: '<', }
      lexer.add_lexeme { mode, tid: 'stop',   create, pattern: /(?<!\\)<\?stop(?:[-_](?<scope>all))?\?>/, reserved: '<', }
      lexer.add_lexeme { mode, tid: 'nl',             pattern: /$/u, value: '\n', }
      lexer.add_lexeme { mode, tid: 'text_lt',        pattern: /<(?=\?)/, }
      lexer.add_catchall_lexeme { mode, tid: 'text', concat: true, }
    #.......................................................................................................
    return lexer

  #---------------------------------------------------------------------------------------------------------
  _new_preparser: ->
    { Pipeline }  = require 'moonriver'
    p             = new Pipeline()
    #.......................................................................................................
    $parse = => parse = ( source, send ) =>
      send token for token from @_lexer.walk source
    #.......................................................................................................
    $mark_active = =>
      active = @cfg.active
      set_active = ( d, active ) -> GUY.lft.lets d, ( d ) ->
        d.data         ?= {}
        d.data.active   = active
      return mark_active = ( d, send ) ->
        if d.mk is 'meta:start'
          active = true
          return send set_active d, false
        if d.mk is 'meta:stop'
          active = false
          return send set_active d, false
        send set_active d, active
    #.......................................................................................................
    $collect_chunks = ->
      collector = []
      active    = null
      #.....................................................................................................
      join      = ->
        first_t = collector.at 0
        last_t  = collector.at -1
        return GUY.lft.lets first_t, ( d ) ->
          d.value = ( t.value for t in collector ).join ''
          d.lnr1  = first_t.lnr1
          d.x1    = first_t.x1
          d.lnr2  = last_t.lnr2
          d.x2    = last_t.x2
      #.....................................................................................................
      return collect_chunks = ( d, send ) ->
        # active ?= d.data.active
        if d.mk is 'meta:nl'
          collector.push d
          send join()
          collector = []
        else if active isnt d.data.active
          send join() if collector.length > 0
          collector = [ d, ]
        else
          collector.push d
        active = d.data.active
    #.......................................................................................................
    p.push $parse()
    p.push $mark_active()
    p.push $collect_chunks()
    return p
