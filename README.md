

# InterText Lexer `Interlex`


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [InterText Lexer `Interlex`](#intertext-lexer-interlex)
  - [Notes](#notes)
  - [Adding Lexemes](#adding-lexemes)
  - [Example](#example)
  - [Topological Sorting](#topological-sorting)
  - [To Do](#to-do)
  - [Is Done](#is-done)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# InterText Lexer `Interlex`


<!-- A collection of *lexemes* defines a *syntax* -->

## Notes

* An 'empty lexer' (i.e. a lexer without any lexemes) will match the empty string and nothing else;
  depending on the lexer's configuration, the former may contain `$start` and / or `$end` tokens, and the
  latter, in addition, may either contain a single `$error` token or else throw an error, as the case may
  be.

## Adding Lexemes

* ATM adding lexemes one by one is supported by calling `lexer.add_lexeme()`
* in the future, defining entire grammars in one go should become possible
* `lexer.add_lexeme()` expects a `cfg` ('configuration') object with the following keys:
  * `cfg.mode`: a valid JS identifier to identify the lexeing mode;
    * if no base mode was passed on instantiation of the lexer, the mode named in the first call
      to `lexer.add_lexeme()` will become the base mode
    * lexing will start from the base mode, which thereby becomes the initial mode (but note that the base
      mode may be re-assumed later without it becoming the initial mode)
  * `cfg.tid`: a valid JS identifier to identify the token / lexeme ID;
  * `cfg.pattern`: a string or a regular expression to describe a constant or variable pattern. Strings will
    be converted to regexes, using proper escaping for all characters that are special in regexes (like `*`,
    `(` and so on);
  * `cfg.jump`: an optional string or function that describes whether to change the lexing mode and / or
    which token should result
    * if `cfg.jump` is a valid JS identifier, then it should be the name of the lexing mode that should be entered
      right after the present token
    * if `cfg.jump` is the caret `^`, this means 'jump back', i.e. resume the previous mode. This causes a
      runtime error in case a jump back from the initial mode is attempted
  * names of modes and lexemes will be used to construct regex group names; therefore, they must all be
    [valid JS identifiers](https://mathiasbynens.be/notes/javascript-identifiers-es6)

## Example

Here is a minimal lexer that understands a tiny fraction of the MarkDown grammar, namely, single stars `*`
for emphasis and single backticks `` ` `` for code spans. The single star will be passed through
as-is inside code spans:

```coffee
{ Interlex
  compose  }        = require '../../../apps/intertext-lexer'
first               = Symbol 'first'
last                = Symbol 'last'
#.........................................................................................................
new_toy_md_lexer = ( mode = 'plain' ) ->
  lexer   = new Interlex { dotall: false, }
  #.........................................................................................................
  lexer.add_lexeme { mode: 'plain',   tid: 'escchr',    jump: null,       pattern:  /\\(?<chr>.)/u,     }
  lexer.add_lexeme { mode: 'plain',   tid: 'star1',     jump: null,       pattern:  /(?<!\*)\*(?!\*)/u, }
  lexer.add_lexeme { mode: 'plain',   tid: 'codespan',  jump: 'literal',  pattern:  /(?<!`)`(?!`)/u,    }
  lexer.add_lexeme { mode: 'plain',   tid: 'other',     jump: null,       pattern:  /[^*`\\]+/u,        }
  lexer.add_lexeme { mode: 'literal', tid: 'codespan',  jump: '^',        pattern:  /(?<!`)`(?!`)/u,    }
  lexer.add_lexeme { mode: 'literal', tid: 'text',      jump: null,       pattern:  /(?:\\`|[^`])+/u,   }
```

## Topological Sorting

Interlex optionally uses topological sorting (provided by
[`ltsort`](https://github.com/loveencounterflow/ltsort), q.v.) of lexemes. This is triggered by adding a
`before` or `after` attribute when calling `leyer.add_lexeme()`. Either attribute may be a TID (which
identifies a lexeme in the same mode) or a list (array) of TIDs. Both values may also be a star `*` meaning
'before' or 'after everything else'. These dependency indicators don't have to be exhaustive; where left
unspecified, the relative ordering of addition of the lexemes is kept.

Observe that ordering is only defined for lexemes *within the same lexer mode*; there's no notion of
relative ordering between lexer modes or lexemes across modes.

## To Do

* **[–]** documentation
* **[–]** allow to configure `start`, `stop`, `error` tokens, implicit `finalize()`
* **[–]** introduce aliases for names of `compose` that don't use snake case &c
* **[–]** implement `line`, `col` coordinates for tokens
* **[–]** group renaming has a fault in that it will wrongly accept things looking like a named group inside
  a squra-bracket character class, as in `/[?<abc>)]`
* **[–]** we cannot mix regexes with and without `s` / `dotall` flag; configure that per mode, per instance?
* **[–]** allow to add lexemes w/out explicit mode, will provide default / add to base mode
* **[–]** use [`datom`s](https://github.com/loveencounterflow/datom)
* **[–]** provide collection of standard lexers for recurring tasks, including an abstracted version of
  MarkDown star lexer
* **[–]** allow lexemes to announce 'reserved characters' (such as `<` that signals start of an HTML tag)
  that can later be used to formulate a fallback pattern to capture otherwise unmatched text portions
* **[–]** disallow lexemes to be accidentally overwritten
* **[–]** clarify whether to use 'lexeme ID' or 'token ID'; whould really be the former because a lexeme is
  the description ('class' or 'type' if you will) of its instances (the tokens); tokens with the same `tid`
  may repeat while there can only be at most one lexeme with a given `tid` in a given namespace / mode
* **[–]** implement readable representation / RPR for lexers, maybe as table
* **[–]** safeguard against undefined lexemes mentioned by `before`, `after`


## Is Done

* **[+]** demo in
  [`hengist/dev/snippets/src/demo-compose-regexp.coffee`](https://github.com/loveencounterflow/hengist/blob/master/dev/snippets/src/demo-compose-regexp.coffee)
  and
  [`hengist/blob/master/dev/intertext-lexer/src/first-demo.coffee`](https://github.com/loveencounterflow/hengist/blob/master/dev/intertext-lexer/src/first-demo.coffee)
* **[+]** prefix named groups for parameters with rule name (token key) to enable re-use of parameter names
* **[+]** allow multiple `gosub_*`, `return` tokens in a single lexer mode; use API rather than naming
  convention for these
* **[+]** implement `cfg`-based API for `add_lexeme()` that provides `jump` argument to replace
  `gosub_`/`return` naming convention
* **[+]** implement `step()`
* **[+]** rename `autoreset`, `reset()` -> `autostart`, `start()`
* **[+]** make calls to `finalize()` implicit
* **[+]** with `cfg.autostart`, `feed()` and `reset()` behave identically
* **[+]** implement `feed()` to add new source
* **[+]** implement functions for `jump`
* **[+]** implement topological sorting of lexemes

