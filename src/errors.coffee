'use strict'


############################################################################################################
{ rpr }                   = ( require 'guy' ).trm


#-----------------------------------------------------------------------------------------------------------
class @Interlex_error extends Error
  constructor: ( ref, message ) ->
    super()
    @message  = "#{ref} (#{@constructor.name}) #{message}"
    @ref      = ref
    return undefined ### always return `undefined` from constructor ###

#-----------------------------------------------------------------------------------------------------------
class @Interlex_internal_error            extends @Interlex_error
  constructor: ( ref, message )     -> super ref, message
class @Interlex_mode_stack_exhausted      extends @Interlex_error
  constructor: ( ref, message )     -> super ref, message
class @Interlex_TBDUNCLASSIFIED           extends @Interlex_error
  constructor: ( ref, message )     -> super ref, message


