tools           = {
  ( require './tools/start-stop-preprocessor' )...,
  ( require './tools/outline-preprocessor' )..., }
module.exports  = { ( require './interlex' )..., ( require './syntax' )..., tools, }