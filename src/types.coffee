
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
  #.........................................................................................................
  declare.ilx_add_lexeme_cfg
    fields:
      mode:           'ilx_mode'
      tid:            'ilx_tid'
      pattern:        'ilx_pattern'
      jump:           'optional.ilx_jump'
      reserved:       'optional.ilx_reserved'
    default:
      mode:           'plain'
      tid:            null
      pattern:        null
      jump:           null
      reserved:       null
  #.........................................................................................................
  declare.ilx_constructor_cfg
    fields:
      autostart:        'boolean'
      start_token:      'boolean'
      end_token:        'boolean'
      error_tokens:     'boolean'
      multiline:        'boolean'
      dotall:           'boolean'
      catchall_concat:  'boolean'
      reserved_concat:  'boolean'
      linewise:         'boolean'
      # global ???
      # ignorecase  # ignoreCase
    default:
      autostart:        true
      start_token:      false
      end_token:        false
      error_tokens:     true
      multiline:        false
      dotall:           false
      catchall_concat:  false
      reserved_concat:  false
      linewise:         false
  #.........................................................................................................
  return base_types


#===========================================================================================================
module.exports = { misfit, jump_symbol, get_base_types, }



