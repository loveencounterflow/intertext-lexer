
'use strict'


############################################################################################################
GUY                       = require 'guy'
# { alert
#   debug
#   help
#   info
#   plain
#   praise
#   urge
#   warn
#   whisper }               = GUY.trm.get_loggers 'DATAMILL/TYPES'
{ debug }                 = GUY.trm.get_loggers 'INTERTEXT-LEXER/TYPES'
{ rpr
  inspect
  echo
  log     }               = GUY.trm
{ Intertype }             = require 'intertype'
base_types                = null
misfit                    = Symbol 'misfit'
jump_symbol               = '^'
# PATH                      = require 'node:path'


#-----------------------------------------------------------------------------------------------------------
get_base_types = ->
  return base_types if base_types?
  #.........................................................................................................
  base_types                = new Intertype()
  { declare }               = base_types
  #.........................................................................................................
  # declare.ilx_pattern     override: true, isa: ( x ) -> x instanceof Document
  declare.syntax_target 'list.or.object'
  ### TAINT legal mode names, lexeme IDs should be confined to JS identifiers ###
  ### TAINT legal mode names should exclude `lx`, `new` to avoid name clashes ###
  declare.ilx_mode            'nonempty.text'
  declare.ilx_tid             'nonempty.text'
  declare.ilx_pattern         'text.or.regex'
  declare.ilx_pop             ( x ) -> x is jump_symbol
  declare.ilx_jump            'ilx_mode.or.ilx_pop.or.function'
  declare.ilx_reserved        'optional.ilx_reserved_list.or.ilx_reserved_text'
  declare.ilx_reserved_list   'list.of.nonempty.text'
  declare.ilx_reserved_text   'nonempty.text'
  declare.ilx_lexeme_value    'function.or.text'
  declare.ilx_splitmode       ( x ) -> x in [ 'lines', false, ]
  declare.ilx_statemode       ( x ) -> x in [ 'keep', 'reset', ]
  #.........................................................................................................
  declare.ilx_add_lexeme_cfg
    fields:
      mode:           'ilx_mode'
      tid:            'ilx_tid'
      pattern:        'ilx_pattern'
      jump:           'optional.ilx_jump'
      reserved:       'optional.ilx_reserved'
      create:         'optional.function'
      value:          'optional.ilx_lexeme_value'
      empty_value:    'optional.ilx_lexeme_value'
    default:
      mode:           'plain'
      tid:            null
      pattern:        null
      jump:           null
      reserved:       null
      create:         null
      value:          null
      empty_value:    null
  #.........................................................................................................
  declare.ilx_interlex_constructor_cfg
    fields:
      autostart:        'boolean'
      start_token:      'boolean'
      end_token:        'boolean'
      error_tokens:     'boolean'
      multiline:        'boolean'
      dotall:           'boolean'
      split:            'ilx_splitmode'
      state:            'ilx_statemode'
      trim:             'boolean'
      # global ???
      # ignorecase  # ignoreCase
    default:
      autostart:        true
      start_token:      false
      end_token:        false
      error_tokens:     true
      multiline:        false
      dotall:           false
      split:            'lines'
      state:            'keep'
      trim:             true
  #.........................................................................................................
  declare.ilx_walk_source_or_cfg
    fields:
      source:           'optional.text'
      path:             'optional.nonempty.text'
      _error:           'null'
    default:
      source:           null
      path:             null
      _error:           null
    cast: ( x ) ->
      return { @registry.ilx_walk_source_or_cfg.default..., source: x, } if @isa.text x
      return x unless @isa.object x
      R = { @registry.ilx_walk_source_or_cfg.default..., x..., }
      if ( not x.source? and not x.path? )
        R._error = "must set either `source` or `path`"
      if ( x.source? and x.path? )
        R._error = "cannot set both `source` and `path`"
      return R
  #.........................................................................................................
  declare.ilx_add_catchall_lexeme_cfg
    fields:
      mode:           'ilx_mode'
      tid:            'ilx_tid'
      concat:         'boolean'
    default:
      mode:           null
      tid:            '$catchall'
      concat:         false
  declare.ilx_add_reserved_lexeme_cfg
    fields:
      mode:           'ilx_mode'
      tid:            'ilx_tid'
      concat:         'boolean'
    default:
      mode:           null
      tid:            '$reserved'
      concat:         false
  return base_types


#===========================================================================================================
module.exports = { misfit, jump_symbol, get_base_types, }



