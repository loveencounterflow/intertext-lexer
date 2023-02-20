


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
{ get_base_types }        = require './types'


#===========================================================================================================
class Sorter

  #---------------------------------------------------------------------------------------------------------
  constructor: ->
    @types        = get_base_types()
    return undefined

  #---------------------------------------------------------------------------------------------------------
  sort: ( tokens... ) ->
    @types.validate.list tokens
    R = tokens.flat Infinity
    R.sort @cmp
    return R

  #---------------------------------------------------------------------------------------------------------
  cmp: ( a, b ) =>
    throw new E.Interlex_TBDUNCLASSIFIED '^Sorter.sort@1^', "missing required lnr1: #{rpr a}" unless a.lnr1?
    throw new E.Interlex_TBDUNCLASSIFIED '^Sorter.sort@1^', "missing required lnr1: #{rpr b}" unless b.lnr1?
    return +1 if a.lnr1 > b.lnr1
    return -1 if a.lnr1 < b.lnr1
    throw new E.Interlex_TBDUNCLASSIFIED '^Sorter.sort@1^', "missing required x1: #{rpr a}" unless a.x1?
    throw new E.Interlex_TBDUNCLASSIFIED '^Sorter.sort@1^', "missing required x1: #{rpr b}" unless b.x1?
    return +1 if a.x1 > b.x1
    return -1 if a.x1 < b.x1
    return  0

  #---------------------------------------------------------------------------------------------------------
  ordering_is: ( a, b ) -> ( @cmp a, b ) is -1



#===========================================================================================================
module.exports = { sorter: ( new Sorter() ), }
