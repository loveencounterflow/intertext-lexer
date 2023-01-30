
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
  whisper }               = GUY.trm.get_loggers 'INTERTEXT-LEXER/SYNTAX'
{ rpr
  inspect
  echo
  log     }               = GUY.trm
{ get_base_types }        = require './types'
E                         = require './errors'


#===========================================================================================================
#
#===========================================================================================================
class Syntax

  ###
  * lexemes to be declared as *static* members (i.e. as class attributes) will be compiled
  * lexeme factories that need additional parameters should use the prefix `new_` and be put on the
    instance
  * lexeme factories that are defined on the class will be called with the implicit `this`/`@` being the
    *instance*, not the class

  * specials:
    `@mode` indicates the (name of the) (base) mode; this can be overridden at instantiation time
    `@mode_*` indicate the (names of the) other modes; these can be overridden at instantiation time

  * use prefix `@lx_*` for string, regex, object, or a list thereof; alternatively a function returning one
    of the aforementioned
  * use prefix `new_*` for lexeme-factories that need additional parameters

  * TID (the lexeme's name) will default to the part after the prefix

  ```coffee
  class ClassWithStaticMethod
    @staticProperty: 'someValue'
    @staticMethod: () ->
      return 'static method has been called.'
  ```

  ```js
  class ClassWithStaticMethod {
    static staticProperty = 'someValue';
    static staticMethod() {
      return 'static method has been called.'; } }
  ```

  ###

  #---------------------------------------------------------------------------------------------------------
  constructor: ( cfg ) ->
    GUY.props.hide @, 'types', get_base_types()
    ### TAINT allow renaming of lexemes ###
    mode                  = @constructor.mode ? 'std'
    ### TAINT use types ###
    @cfg                  = { mode, cfg..., }
    @_lexeme_default      = { @types.registry.ilx_add_lexeme_cfg.default..., }
    lexeme_keys           = new Set Object.keys @_lexeme_default
    @_lexeme_default[ k ] = v for k, v of @cfg when lexeme_keys.has k
    # @_compile_lexemes { target: @, }
    return undefined

  #---------------------------------------------------------------------------------------------------------
  add_lexemes: ( target = null ) ->
    target ?= @
    @types.validate.syntax_target target
    @_compile_lexemes { target, }
    return null


  #=========================================================================================================
  #
  #---------------------------------------------------------------------------------------------------------
  _compile_list_of_lexemes: ( tid, list_of_lexemes ) ->
    return ( ( @_compile_lexeme ( "#{tid}_#{idx + 1}" ), lexeme ) for lexeme, idx in list_of_lexemes )

  #---------------------------------------------------------------------------------------------------------
  _compile_lexeme: ( tid, lexeme ) ->
    lexeme  = { tid, pattern: lexeme, } if @types.isa.ilx_pattern lexeme
    lexeme  = { @_lexeme_default..., lexeme..., } if @types.isa.object lexeme
    @types.validate.ilx_add_lexeme_cfg lexeme
    return lexeme

  #---------------------------------------------------------------------------------------------------------
  _compile_lexemes: ({ target, }) ->
    target       ?= @
    use_push      = @types.isa.list target
    #.......................................................................................................
    for xtid in Object.getOwnPropertyNames @constructor
      continue unless ( match = xtid.match /^lx_(?<tid>.+)$/ )?
      { tid, }      = match.groups
      lexeme        = @constructor[ xtid ]
      lx_type       = @types.type_of lexeme
      #.....................................................................................................
      if lx_type is 'function'
        lexeme        = lexeme.call @
        lx_type       = @types.type_of lexeme
      ### TAINT validate proto-lexeme ###
      #.....................................................................................................
      if lx_type is 'list' then lexeme = @_compile_list_of_lexemes tid, lexeme
      else                      lexeme = @_compile_lexeme tid, lexeme
      #.....................................................................................................
      if use_push
        if lx_type is 'list' then ( target.push lx for lx in lexeme )
        else                      ( target.push lexeme )
      #.....................................................................................................
      else
        if lx_type is 'list' then ( target[ "#{lx.mode}_#{lx.tid}" ] = lx for lx in lexeme )
        else                      ( target[ "#{lexeme.mode}_#{lexeme.tid}" ] = lexeme )
    #.......................................................................................................
    return null


#===========================================================================================================
module.exports = { Syntax, }




