tools           = {
  ( require './tools/start-stop-preprocessor' )...,
  outline: ( require './tools/outline-preprocessor' ), }
module.exports  = { ( require './interlex' )..., ( require './syntax' )..., tools, }