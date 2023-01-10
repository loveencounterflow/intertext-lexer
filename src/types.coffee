
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
# PATH                      = require 'node:path'


#-----------------------------------------------------------------------------------------------------------
get_base_types = ->
  return base_types if base_types?
  #.........................................................................................................
  base_types                = new Intertype()
  { declare }               = base_types
  #.........................................................................................................
  # declare.ilx_pattern     override: true, isa: ( x ) -> x instanceof Document
  declare.ilx_mode    'nonempty.text'
  declare.ilx_tid     'nonempty.text'
  declare.ilx_pattern 'text.or.regex'
  declare.ilx_add_lexeme_cfg
    fields:
      mode:           'ilx_mode'
      tid:            'ilx_tid'
      pattern:        'ilx_pattern'
      push:           'optional.ilx_mode'
      pop:            'boolean'
    default:
      mode:           'plain'
      tid:            null
      pattern:        null
      push:           null
      pop:            false
  #.........................................................................................................
  return base_types


#===========================================================================================================
module.exports = { misfit, get_base_types, }



