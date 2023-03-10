tools           = { ( require './tools/start-stop-preprocessor' )..., }
module.exports  = { ( require './interlex' )..., ( require './syntax' )..., tools, }