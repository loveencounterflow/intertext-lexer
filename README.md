

# InterText Lexer `Interlex`


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [InterText Lexer `Interlex`](#intertext-lexer-interlex)
  - [Notes](#notes)
  - [Adding Lexemes](#adding-lexemes)
    - [Jumps](#jumps)
  - [Example](#example)
  - [Topological Sorting](#topological-sorting)
  - [Reserved and Catchall Lexemes](#reserved-and-catchall-lexemes)
  - [Linewise Lexing and State-Keeping](#linewise-lexing-and-state-keeping)
    - [CFG Settings `first`, `last`, `start_of_line`, `end_of_line`](#cfg-settings-first-last-start_of_line-end_of_line)
    - [The `reset()` Method](#the-reset-method)
    - [Linewise Lexing](#linewise-lexing)
  - [Prepending and Appending to Chunks and Lines](#prepending-and-appending-to-chunks-and-lines)
  - [Comparing Token Positions](#comparing-token-positions)
  - [Positioning](#positioning)
  - [Tools](#tools)
    - [Start-Stop Preprocessor](#start-stop-preprocessor)
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
  * `cfg.mode`: a valid JS identifier to identify the lexing mode;
    * if no base mode was passed on instantiation of the lexer, the mode named in the first call
      to `lexer.add_lexeme()` will become the base mode
    * lexing will start from the base mode, which thereby becomes the initial mode (but note that the base
      mode may be re-assumed later without it becoming the initial mode)
  * `cfg.lxid` (**L**e**x**eme **ID**): a valid JS identifier to identify the matched lexeme;
  * `cfg.pattern`: a string or a regular expression to describe a constant or variable pattern. Strings will
    be converted to regexes, using proper escaping for all characters that are special in regexes (like `*`,
    `(` and so on);
    * **named groups (captures)**: when a regular expression has named groups (as in
      `/abc(?<letter>[a-z]+)/`), those matches will be put into an object named `g` of the token (so if the
      above matches, `token.g.letter` will contain a string matching one or more of the basic 26 lower case
      Latin letters)
  * names of modes and lexemes will be used to construct regex group names; therefore, they must all be
    [valid JS identifiers](https://mathiasbynens.be/notes/javascript-identifiers-es6)
  * `cfg.jump`: see [Jumps](#jumps)
  * `cfg.create`: an optional function that will be called right after a token is created from the lexeme
    (and right before it is frozen and yielded to the caller); whatever `create()` returns will become
    the next token
  * `cfg.value` and `cfg.empty_value` allow to set the `value` property of a token; both can be either
    `null` (the default), a text or a function whose return value will become `token.value`.
    * when defined, `cfg.value` will always override the token value; `cfg.empty_value` will only be
      considered when the token value would be an empty string
    * when `cfg.value` or `cfg.empty_value` are functions, they will be called in the context of the lexer
      and with the token as only argument
    * `cfg.value` or `cfg.empty_value` will be considered immediately before `cfg.create()` is called (where
      applicable)

### Jumps

The `jump` property of a lexeme declaration indicates which new mode the lexer should switch to when
it encounters a matching pattern. It is either a string or a function. Allowed strings take one of four forms
(assuming we're in mode `plain` in the below):

* **entry jumps** (jumps that mandate a jump to a new mode): say we're looking for left pointy brackets `<`
  and want to switch to mode `tag`. Depending on whether the *boundary itself* should belong to the current
  or the upcoming mode, the value for `jump` should have either a leading or a trailing left square bracket
  `[`:
  * `{ jump: '[tag', }`: an *inclusive entry jump*; the 'boundary post' (the token for the `<`) will belong
    to the *new* mode, `tag`). This is called 'inclusive' because the new mode already includes the upcoming
    token (although it is declared with `mode: 'plain'`). The jump target `tag` appears 'inside' the square
    bracket.
  * `{ jump: 'tag[', }`: an *exclusive entry jump*; the 'boundary post' (the token for the `<`) will belong
    to the *old* mode, `plain`). This is called 'exclusive' because the new mode will *not* include the
    upcoming token. The jump target appears 'outside' the square bracket.

* **exit jumps** (jumps that mandate a jump out of the current mode back to the previous one): say we're
  inside a pair of pointy brackets `<...>` that we're lexing in mode `tag`; now we encounter the right
  pointy bracket `>` that signals the end of that stretch, so it's time to revert to `plain`. This can be
  symbolized by a `jump` value that either starts or ends with a `]` (right square bracket) and has a `.`
  (dot) symbolizing the location of the mode the 'boundary post' will belong to:
  * `{ jump: '.]', }`: an *inclusive exit jump*; 'boundary post' belongs to the *old* mode, `tag`
  * `{ jump: '].', }`: an *exclusive exit jump*; 'boundary post' belongs to the *new* mode, `plain`

* **singleton (or virtual) jumps**: lexemes that are declared with a mode name enclosed by a left and a
  right bracket as in `jump: '[foo]'` will, when a match occurs, cause a token to be emitted for that match
  whose mode is set to the jump target (here `foo`). For example, when declaring tokens and modes for
  typical `"string literals"`, it is possible to fast-track, as it were, the special case of an empty string
  literal, `""`, in plain mode, but still make that lexeme and token belong to the string literal mode (say,
  `dqstr` for 'double quoted string'): `lexer.add_lexeme { mode: 'plain', lxid: 'dq2', jump: '[dqstr]',
  pattern: /(?<!")""(?!")/u, reserved: '"', }`.
  * Singleton jumps will cause border tokens to be emitted just as with regular jumps (when the lexer is
    configured with `border_tokens: true`).

* In case the value of the `jump` property is a function, it will be called with an object `{ token, match,
  lexer, }`. It should return one of:
  * `null` in case nothing should be done; the token will be used as passed into this function, and the
    mode will not be changed, or
  * an object with two optional properties, `jump` and `token`, in which case
    * `jump` should be an optional string whose be interpreted as described above, and
    * `token` which could be the token passed in or a completely new one.
    * In any event, the token's `jump`, `mode` and `mk` properties will be adjusted as appropriate which means
      that setting or not setting these values makes no difference.
  * **Note**: You can only change the lexer's mode by returning an allowable value for `jump`; a returned
    `token`'s `mode` will be ignored.

## Example

Here is a minimal lexer that understands a tiny fraction of the Markdown grammar, namely, single stars `*`
for emphasis and single backticks `` ` `` for code spans. The single star will be passed through
as-is inside code spans:

```coffee
{ Interlex
  compose  }        = require 'intertext-lexer'
first               = Symbol 'first'
last                = Symbol 'last'
#.........................................................................................................
new_toy_md_lexer = ( mode = 'plain' ) ->
  lexer   = new Interlex { dotall: false, }
  #.........................................................................................................
  lexer.add_lexeme { mode: 'plain',   lxid: 'escchr',    jump: null,       pattern:  /\\(?<chr>.)/u,     }
  lexer.add_lexeme { mode: 'plain',   lxid: 'star1',     jump: null,       pattern:  /(?<!\*)\*(?!\*)/u, }
  lexer.add_lexeme { mode: 'plain',   lxid: 'codespan',  jump: 'literal[', pattern:  /(?<!`)`(?!`)/u,    }
  lexer.add_lexeme { mode: 'plain',   lxid: 'other',     jump: null,       pattern:  /[^*`\\]+/u,        }
  lexer.add_lexeme { mode: 'literal', lxid: 'codespan',  jump: '.]',       pattern:  /(?<!`)`(?!`)/u,    }
  lexer.add_lexeme { mode: 'literal', lxid: 'text',      jump: null,       pattern:  /(?:\\`|[^`])+/u,   }
  #.........................................................................................................
  return lexer
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

## Reserved and Catchall Lexemes

Each lexeme can announce so-called 'reserved' characters or words; these are for now restricted to strings and
lists of strings, but could support regexes in the future as well. The idea is to collect those characters
and character sequences that are 'triggers' for a given lexeme and, when the mode has been defined, to
automatically construct two lexemes that will capture

* all the remaining sequences of non-reserved characters; this is called a *catchall* lexeme (whose default
  TID is set to `$catchall` unless overriden by a `lxid` setting). The catchall lexeme's function lies in
  explicitly capturing any part of the input that has not been covered by any other lexemer higher up in the
  chain of patterns, thereby avoiding a more unhelpful `$error` token that would just say 'no match at
  position so-and-so' and terminate lexing.

* all the remaining *reserved* characters (default TID: `$reserved`); these could conceivably be used to
  produce a list of fishy parts in the source, and / or to highlight such places in the output, or, if one
  feels so inclined, terminate parsing with an error message. For example, when one wants to translate
  Markdown-like markup syntax to HTML, one could decide that double stars start and end bold type
  (`<strong>...</strong>`), or, when a single asterisk is used at the start of a line, indicate unordered
  list items (`<ul>...<li>...</ul>`), and are considered illegal in any other position except inside code
  stretches and when escaped with a backslash. Such a mechanism can help to uncover problems with the source
  text instead of just glancing over dubious markup and 'just do something', possibly leading to subtle
  errors.

Whether the catchall and the reserved lexemes should match single occurrences or contiguous stretches of
occurrences of reserved items can be set with `concat: true` and `concat: false`. In the below lexer these
have been left to their defaults (no concatenation called for), but in the last tabular output below the
result for a string of 'foreign' and 'reserved' characters with `concat: true` is shown.



```coffee
{ Interlex, } = require 'intertext-lexer'
### NOTE these are the default settings, shown here for clarity ###
lexer = new Interlex()
#.........................................................................................................
mode    = 'plain'
lexer.add_lexeme { mode, lxid: 'escchr',           pattern:  /\\(?<chr>.)/u, reserved: '\\', }
lexer.add_lexeme { mode, lxid: 'star2',            pattern: ( /(?<!\*)\*\*(?!\*)/u   ), reserved: '*', }
lexer.add_lexeme { mode, lxid: 'heading',          pattern: ( /^(?<hashes>#+)\s+/u ), reserved: '#', }
lexer.add_lexeme { mode, lxid: 'word',             pattern: ( /\p{Letter}+/u ), }
lexer.add_lexeme { mode, lxid: 'number_symbol',    pattern: ( /#(?=\p{Number})/u ), }
lexer.add_lexeme { mode, lxid: 'number',           pattern: ( /\p{Number}+/u ), }
lexer.add_lexeme { mode, lxid: 'ws',               pattern: ( /\s+/u ), }
lexer.add_catchall_lexeme { mode, concat: false, }
lexer.add_reserved_lexeme { mode, concat: false, }
#.........................................................................................................
H.tabulate "lexer", ( x for _, x of lexer.registry.plain.lexemes )
for probe in [ 'helo', 'helo*x', '*x', "## question #1 and a hash: #", "## question #1 and a hash: \\#", ]
  debug GUY.trm.reverse GUY.trm.steel probe
  H.tabulate ( rpr probe ), lexer.run probe
```

The lexer's `plain` mode now has a `$catchall` and a `reserved` lexeme:

```
 lexer
┌───────┬───────────────┬─────────────────────────────────────────┬──────┬──────────┬──────────────┐
│mode   │lxid           │pattern                                  │jump  │reserved  │type_of_jump  │
├───────┼───────────────┼─────────────────────────────────────────┼──────┼──────────┼──────────────┤
│plain  │escchr         │/(?<𝔛escchr>\\(?<escchr𝔛chr>.))/u        │●     │\         │nojump        │
│plain  │star2          │/(?<𝔛star2>(?<!\*)\*\*(?!\*))/u          │●     │*         │nojump        │
│plain  │heading        │/(?<𝔛heading>^(?<heading𝔛hashes>#+)\s+)/u│●     │#         │nojump        │
│plain  │word           │/(?<𝔛word>\p{Letter}+)/u                 │●     │●         │nojump        │
│plain  │number_symbol  │/(?<𝔛number_symbol>#(?=\p{Number}))/u    │●     │●         │nojump        │
│plain  │number         │/(?<𝔛number>\p{Number}+)/u               │●     │●         │nojump        │
│plain  │ws             │/(?<𝔛ws>\s+)/u                           │●     │●         │nojump        │
│plain  │$catchall      │/(?<𝔛$catchall>(?!\\|\*|#)[^])/          │●     │●         │nojump        │
│plain  │$reserved      │/(?<𝔛$reserved>\\|\*|#)/                 │●     │●         │nojump        │
└───────┴───────────────┴─────────────────────────────────────────┴──────┴──────────┴──────────────┘
```

Results:

```
 'helo'
┌───────┬──────┬────────────┬──────┬───────┬───────┬──────┬────┬────────┐
│mode   │lxid  │mk          │jump  │value  │x1     │x2    │g   │$key    │
├───────┼──────┼────────────┼──────┼───────┼───────┼──────┼────┼────────┤
│plain  │word  │plain:word  │●     │helo   │0      │4     │●   │^plain  │
└───────┴──────┴────────────┴──────┴───────┴───────┴──────┴────┴────────┘
```

```
 'helo*x'
┌───────┬───────────┬─────────────────┬──────┬───────┬───────┬──────┬────┬────────┐
│mode   │lxid       │mk               │jump  │value  │x1     │x2    │g   │$key    │
├───────┼───────────┼─────────────────┼──────┼───────┼───────┼──────┼────┼────────┤
│plain  │word       │plain:word       │●     │helo   │0      │4     │●   │^plain  │
│plain  │$reserved  │plain:$reserved  │●     │*      │4      │5     │●   │^plain  │
│plain  │word       │plain:word       │●     │x      │5      │6     │●   │^plain  │
└───────┴───────────┴─────────────────┴──────┴───────┴───────┴──────┴────┴────────┘
```

```
 '*x'
┌───────┬───────────┬─────────────────┬──────┬───────┬───────┬──────┬────┬────────┐
│mode   │lxid       │mk               │jump  │value  │x1     │x2    │g   │$key    │
├───────┼───────────┼─────────────────┼──────┼───────┼───────┼──────┼────┼────────┤
│plain  │$reserved  │plain:$reserved  │●     │*      │0      │1     │●   │^plain  │
│plain  │word       │plain:word       │●     │x      │1      │2     │●   │^plain  │
└───────┴───────────┴─────────────────┴──────┴───────┴───────┴──────┴────┴────────┘
```

```
 '## question #1 and a hash: #'
┌───────┬───────────────┬─────────────────────┬──────┬──────────┬───────┬──────┬────────────────┬────────┐
│mode   │lxid           │mk                   │jump  │value     │x1     │x2    │g               │$key    │
├───────┼───────────────┼─────────────────────┼──────┼──────────┼───────┼──────┼────────────────┼────────┤
│plain  │heading        │plain:heading        │●     │##        │0      │3     │{ hashes: '##' }│^plain  │
│plain  │word           │plain:word           │●     │question  │3      │11    │●               │^plain  │
│plain  │ws             │plain:ws             │●     │          │11     │12    │●               │^plain  │
│plain  │number_symbol  │plain:number_symbol  │●     │#         │12     │13    │●               │^plain  │
│plain  │number         │plain:number         │●     │1         │13     │14    │●               │^plain  │
│plain  │ws             │plain:ws             │●     │          │14     │15    │●               │^plain  │
│plain  │word           │plain:word           │●     │and       │15     │18    │●               │^plain  │
│plain  │ws             │plain:ws             │●     │          │18     │19    │●               │^plain  │
│plain  │word           │plain:word           │●     │a         │19     │20    │●               │^plain  │
│plain  │ws             │plain:ws             │●     │          │20     │21    │●               │^plain  │
│plain  │word           │plain:word           │●     │hash      │21     │25    │●               │^plain  │
│plain  │$catchall      │plain:$catchall      │●     │:         │25     │27    │●               │^plain  │
│plain  │$reserved      │plain:$reserved      │●     │#         │27     │28    │●               │^plain  │
└───────┴───────────────┴─────────────────────┴──────┴──────────┴───────┴──────┴────────────────┴────────┘
```

```
 '## question #1 and a hash: \\#'
┌───────┬───────────────┬─────────────────────┬──────┬──────────┬───────┬──────┬────────────────┬────────┐
│mode   │lxid           │mk                   │jump  │value     │x1     │x2    │g               │$key    │
├───────┼───────────────┼─────────────────────┼──────┼──────────┼───────┼──────┼────────────────┼────────┤
│plain  │heading        │plain:heading        │●     │##        │0      │3     │{ hashes: '##' }│^plain  │
│plain  │word           │plain:word           │●     │question  │3      │11    │●               │^plain  │
│plain  │ws             │plain:ws             │●     │          │11     │12    │●               │^plain  │
│plain  │number_symbol  │plain:number_symbol  │●     │#         │12     │13    │●               │^plain  │
│plain  │number         │plain:number         │●     │1         │13     │14    │●               │^plain  │
│plain  │ws             │plain:ws             │●     │          │14     │15    │●               │^plain  │
│plain  │word           │plain:word           │●     │and       │15     │18    │●               │^plain  │
│plain  │ws             │plain:ws             │●     │          │18     │19    │●               │^plain  │
│plain  │word           │plain:word           │●     │a         │19     │20    │●               │^plain  │
│plain  │ws             │plain:ws             │●     │          │20     │21    │●               │^plain  │
│plain  │word           │plain:word           │●     │hash      │21     │25    │●               │^plain  │
│plain  │$catchall      │plain:$catchall      │●     │:         │25     │27    │●               │^plain  │
│plain  │escchr         │plain:escchr         │●     │\#        │27     │29    │{ chr: '#' }    │^plain  │
└───────┴───────────────┴─────────────────────┴──────┴──────────┴───────┴──────┴────────────────┴────────┘
```

Result with `add_catchall_lexeme { mode, concat: false, }`, `add_reserved_lexeme { mode, concat: false, }`:

```
 ':.;*#'
┌───────┬───────────┬─────────────────┬──────┬───────┬───────┬──────┬────┬────────┐
│mode   │lxid       │mk               │jump  │value  │x1     │x2    │g   │$key    │
├───────┼───────────┼─────────────────┼──────┼───────┼───────┼──────┼────┼────────┤
│plain  │$catchall  │plain:$catchall  │●     │:      │0      │1     │●   │^plain  │
│plain  │$catchall  │plain:$catchall  │●     │.      │1      │2     │●   │^plain  │
│plain  │$catchall  │plain:$catchall  │●     │;      │2      │3     │●   │^plain  │
│plain  │$reserved  │plain:$reserved  │●     │*      │3      │4     │●   │^plain  │
│plain  │$reserved  │plain:$reserved  │●     │#      │4      │5     │●   │^plain  │
└───────┴───────────┴─────────────────┴──────┴───────┴───────┴──────┴────┴────────┘
```

Result with `add_catchall_lexeme { mode, concat: true, }`, `add_reserved_lexeme { mode, concat: true, }`:

```
 ':.;*#'
┌───────┬───────────┬─────────────────┬──────┬───────┬───────┬──────┬────┬────────┐
│mode   │lxid       │mk               │jump  │value  │x1     │x2    │g   │$key    │
├───────┼───────────┼─────────────────┼──────┼───────┼───────┼──────┼────┼────────┤
│plain  │$catchall  │plain:$catchall  │●     │:.;    │0      │3     │●   │^plain  │
│plain  │$reserved  │plain:$reserved  │●     │*#     │3      │5     │●   │^plain  │
└───────┴───────────┴─────────────────┴──────┴───────┴───────┴──────┴────┴────────┘
```

* it is possible to give `$catchall` and `$reserved` lexemes a custom TID by settting the `lxid` parameter
  when calling `lexer.add_catchall_lexeme()` and `lexer.add_reserved_lexeme()`

## Linewise Lexing and State-Keeping

* `state`:
  * `state: 'keep'`—do not reset lexer state implicitly (except once before the very first chunk of
    source is passed to the lexer with `lexer.walk()` or `lexer.run()`)
    * this is the default for both `split: 'lines'` and `split: false`, so modes (but not lexemes) may
      stretch across line or chunk boundaries
  * `state: 'reset'`—reset lexer state before processing each new chunk of source. This happens always
    when `lexer.walk()` (or `lexer.run()`) is called, and, if `split: 'lines'` is set, before each new line
    of input

* `split`:
  * `split: 'lines'`—the default; when `lexer.walk { source, }` (or `lexer.run { source, }`) is called, the
    lexer will internally use `GUY.str.walk_lines source` to split the source into line-sized chunks (with
    line endings such as `\n` removed)
  * `split: false`—no splitting of `source` is attempted.
    * when `lexer.walk { path, }` is used with `split: false` (not recommended), then *the entire content of
      the corresponding file* are first (synchronously) read into memory and then lexed in its entirety.
      This may be suboptimal when files get big in comparison to available RAM.

* automatic `$border` tokens:
  * enabled with `cfg.border_tokens: true`
  * issued whenever a jump from one mode to the other occurs
  * when jump lexemes are declared as inclusive, just looking at the stream of tokens may make it impossible
    to determine stretches of contiguous tokens; e.g. when `<` starts and `>` ends `tag` mode inclusively,
    then `<t1><t2>` will have a sequence of `{ value: '>', mode: 'tag', }`, `{ value: '<', mode: 'tag', }`
    with no change in mode. Enable border tokens and now you get a sequence

      ```coffee
      { mode: 'tag', lxid: 'rightpointy',  value: '>', }
      { mode: 'tag', lxid: '$border',      value: '', atrs: { prv: 'tag',   nxt: 'plain', }, }
      { mode: 'tag', lxid: '$border',      value: '', atrs: { prv: 'plain', nxt: 'tag',   }, }
      { mode: 'tag', lxid: 'leftpointy',   value: '<', }`
      ```

  * `value` of border tokens can be set with e.g. `cfg.border_value: '|'` (can then concatenate all `value`
    properties of all tokens to visualize where lexer mode was changed)

* Behavior of automatic `$eof` tokens:
  * only when enabled at instantiation with `eof_token: true`
  * when start tokens are enabled, they will be sent
    * when `state` is `reset`: each time `lexer.walk()` is called
    * when `state` is `keep`: only when `lexer.walk()` is called for the first time after an implicit or
      explicit reset of the lexer state (an implicit call only occurs once after a lexer has been
      instantiated and is used for the first time, or is triggered by a prior explicit call to
      `lexer.end()`)
  * in any event, 'reset of lexer state' means that mode stack is emptied and the lexing mode is set to the
    base mode; however, the line number will not be reset to `1`
  * when EOF tokens are enabled, they will be sent
    * when `state` is `reset`: each time `lexer.walk()` is called and has exhausted the current source
    * when `state` is `keep`: any time when `lexer.end()` is called (explicitly)
  * there's the edge case that a reset of the lexer state caused by an explicit call to `lexer.start()` from
    application code *within* a `for token from lexer.walk source` loop; this is a question that will have
    to be dealt with later

* using `{ state: 'reset', }` can be advantageous when lexing line-oriented code such as CSV because it
  guarantees that at the start of each line, the lexer is reset to its base mode and hence things like an
  erroneously forgotten closing quote will not affect the entire rest of the result; in other words, it
  makes lexing a little more robust.

### CFG Settings `first`, `last`, `start_of_line`, `end_of_line`

It is possible to include any kind of values when lexing starts or ends and also before and after each line;
in each case, no value is sent if the respective setting is `null` or `undefined`; when the setting has been
set to a function, that function is called without arguments; all other values are sent as-is. In order to
send `null`, `undefined` or a function, use a function with that return value.

* **`first`**: emitted as first token
* **`last`**: emitted as last token when end of source has been reached
* **`start_of_line`**: only when `split: 'lines'` is set: emitted before first token (if any) of each line
* **`end_of_line`**: only when `split: 'lines'` is set: emitted after last token (if any) of each line

### The `reset()` Method

The `reset()` method of the Lexer will be called at the beginning of lexing and, additionally when `split:
'lines'` is set, before each new line.

### Linewise Lexing

***TO BE UPDATED***


* advantages
  * no more struggling with [different end-of-line (EOL) standards](https://en.wikipedia.org/wiki/Newline)
  * lexeme definitions can simply assume `/^/` will match start-of-line and `/$/` will match end-of-line,
    forget about the 'dot match all' flag (`/.../s`)
  * oftentimes, 'lines of text' will be reasonably small and meaningful chunks of data to work with, as
    certified by the success of decades of Posix-style line-oriented data processing; the alternative is
    handling the content of an entire (arbitrarily huge) file, or abitrary chunks of a file derived from a
    running offsets + some byte lengths (which always risks cutting through a multibyte UTF-8-encoded
    character and needs some sort of careful state-keeping)
  * most of time, lexers will have no need to look at EOL characters; many languages do not care for
    newlines (outside of string literals) at all and those that do care only (at least at the lexing level)
    about whether something comes close to the start or the end of a given line, or that something like a
    line comment will extend to the end of the present line
* initialize with `lexer = new Interlex { linewise: true, }`
* each time `lexer.feed()`, `lexer.walk()`, or `lexer.run()` is called, internal line counter is incremented
* therefore, should call `lexer.feed()`, `lexer.walk()`, and `lexer.run()` only with a single line of text
* observe that one can always call `lexer.walk { path, }`, then lexer will iterate over lines of the file
* lexer will yield lexemes in the shape `{ mode, lxid, mk, jump, value, lnr1, x1, lnr2, x2, g, source, }` as
  with non-linewise lexing, but with `source` representing the current line (not the entire lexed text),
  `lnr1` indicating the 1-based line number of the start of the match, `lnr2` the same for the end of the
  match, and `x1` and `x2` indexing into those lines in terms of exclusive 0-based [UTF-16 code unit
  indexes](https://mathiasbynens.be/notes/javascript-encoding)) (so if the first letter on the first line is
  matched, its token will contain `{ lnr1: 1, x1: 0, lnr2: 1, x2: 1, }`)
  * since `lnr1` and `lnr2` are only present in linewise lexing which implies that the lexer only gets to
    see a single line at a time, `lnr1` and `lnr2` must always be equal (IOW there can be no tokens across
    linebreaks in linewise mode). However, if those tokens are then fed to a parser, that parser may match
    tokens across linebreaks, and in that case it will be convenient to derive the position of the resulting
    region by `{ lnr1, x1, } = first_token; { lnr2, x2, } = last_token`

## Prepending and Appending to Chunks and Lines

* Can instantiate lexer with `prepend`, `append` settings
* this will prefix, suffix each line or chunk with the string given, if any
* may choose to instantiate as `lexer = new Interlex { split: 'lines', append: '\n', }` to ensure each line
  is properly terminated depending on use case
* when prepending, `x` positions will take prefix length into account and will not match positions in the
  source


## Comparing Token Positions

* import as **`{ sorter } = require 'intertext-lexer'`**
* **`sorter.sort: ( tokens... ) ->`**—sort tokens according to their relative positions as given by
  the attributes `lnr1`, `x1`
* **`sorter.cmp: ( a, b ) =>`**—compare the positions of two tokens `a`, `b` according to their
  attributes `lnr1`, `x1`; returns `-1` if `a` starts before `b`, `0` if `a` and `b` start at the same point
  (not possible if `a ≠ b` and both tokens came out of the same lexer running over the same source), and
  `+1` if `a` starts after `b`
* **`sorter.ordering_is: ( a, b ) -> ( @cmp a, b ) is -1`**—returns `true` if the ordering of the two
  tokens `a`, `b` is as given in the call, otherwise `false`. If JavaScript allowed for custom operators or
  operator overrides, then maybe I would've implemented this as `a << b` or `a precedes b` instead of
  `ordering_is a, b`

## Positioning

* can increase (but not decrease) line number `lnr1`, `lnr2`, code unit index `x1`, `x2` by calling
  `lexer.set_offset { lnr, x, }` before lexing a chunk of source
* `lnr` must be a one-based line number; it will be decremented by `1` and added to both `lnr1` and `lnr2`
* `x` must be a zero-based code unit index (JS string index); it will be added to both `x1` and `x2`
* both `lnr` and `x` are optional; their defaults are `{ lnr: 1, x: 0, }`
* this is useful when parts of a file or a string are to be lexed with some parts omitted
* output of `Start_stop_preprocessor` can be used, line and column positions will be those in the original
  source

## Tools

(experimental)

Collection of useful stuff

### Start-Stop Preprocessor

* use it to find start, stop tokens in source before applying your main lexer
* currently fixed to recognize XML processing instruction-like `<?start?>`, `<?stop?>`, `<?stop-all?>` (with
  variant `<?stop_all?>` to avoid risk of line breaks when re-flowing text in editor); no whitespace may be
  used inside these
* could be extended to accept custom lexer or custom lexemes
* will yield tokens with `{ data: { active: true, }, }` (or `false`) depending on whether source text
  followed more close a start or a stop instruction
* the tokens containing the relevant processing instructions will always be set to `active: false`
* uses linewise mode
* initialize as

  ```coffee
  { tools } = require 'intertext-lexer'
  prepro    = new tools.Start_stop_preprocessor { active: true, eraser: ' ', }
  ```

  Shown here are the defaults:
    * set `active: false` to only start when a `<?start?>` marker is found
    * `eraser` and `joiner` control how gaps in the source are treated
    * consider a source like `abc<?start?>xyz` being processed with initial `active: true`
    * the `<?start?>` marker is redundant in that case and will be 'elided', meaning a token with `value:
      <?start?>, $stamped: true, data: { active: false, }` is yielded (and may be discarded as seen fit)
    * but that leaves a hole in the source: `abc❓❓❓xyz`, how to deal with it?
    * the MVP solution was to send one active chunk `abc`, one inactive chunk `<?start?>`, then one active
      chunk `xyz`. But this is not a good solution if the downstream lexer operates in linewise fashion
      because it then will treat `abc` and `xyz` as appearing on two consecutive lines and mess up their
      position data
    * most of the time one would prefer all `lnr1, x1` positions to be preserved as faithfully as feasable
    * `xyz` occurred at `x1: 12` in the input; if we now pass on `abcxyz` that would change its position to
      `x1: 3`. What's more, it isn't quite clear whether we should treat `abc` and `xyz` as separate
      stretches / words (because they were separated by a marker) or as a single stretch / word (because the
      marker was elided). Only the consumer can tell what they want
    * The preprocessor tries to err on the side of the 'safe' and practical assumption that the consumer
      probably wants their source positions be preserved and won't mind extraneous inline spaces (true for a
      lot or source code, HTML &c) and will replace each elided character by a `\x20` (U+0020 Space),
      yielding<br>`abc         xyz`.
    * This behavior is called 'erasing' and is controlled by the `eraser` configuration setting. This can be
      any string, including the empty string; it will be repeated for as many times as the number of code
      units (JS string index, length) the erased part comprised (so any codepoint in U+0000..U+FFFF will
      preserve positions)
    * The alternative to 'erasing' is 'joining' which will put a single copy of whatever text is present in
      the `joiner` configuration setting into the spot where a marker was found, so processing
      `abc<?start?>xyz` with `joiner: ' '` will produce `abc xyz`
    * settings `eraser: ''` and `joiner: ''` are equivalent and will produce `abcxyz`
    * if the default setting of `eraser: ' '` is no good fit for your use case consider to use something
      like `eraser: '\x00'`; U+0000 should not normally be part of any human-readable text source; a pattern
      `/\x00+/` will preserve the information that the source has a hole in this spot, and the resulting
      line `abc␀␀␀␀␀␀␀␀␀xyz` will preserve positions
    * Because the preprocessor will keep lines with 'holes' rather than breaking up lines that have
      intermittend start/stop marks, the relative ordering of active and inactive chunks is not guaranteed;
      only the ordering relative to other active (respectively inactive) tokens is preserved

<!--
## Practical Example: The Prompt Parser

* Match anything except the sequence `p#` followed by a digit: (thx to [this top-rated SO answer](https://stackoverflow.com/a/977294/7568091))

```coffee
  lexer.add_lexeme { mode: 'marks', lxid: 'comment',    jump: null,     pattern:  /(?:(?!p#[0-9]|\]).)+/u,              }
```

 -->

## To Do

* **[–]** documentation
* **[–]** allow to configure `start`, `stop`, `error` tokens, implicit `finalize()`
* **[–]** introduce aliases for names of `compose` that don't use snake case &c
* **[–]** group renaming has a fault in that it will wrongly accept things looking like a named group inside
  a square-bracket character class, as in `/[?<abc>)]`
* **[–]** we cannot mix regexes with and without `s` / `dotall` flag; configure that per mode, per instance?
* **[–]** allow to add lexemes w/out explicit mode, will provide default / add to base mode
* **[–]** use [`datom`s](https://github.com/loveencounterflow/datom)
* **[–]** provide collection of standard lexers for recurring tasks, including an abstracted version of
  Markdown star lexer
* **[–]** clarify whether to use 'lexeme ID' or 'token ID'; whould really be the former because a lexeme is
  the description ('class' or 'type' if you will) of its instances (the tokens); tokens with the same `lxid`
  may repeat while there can only be at most one lexeme with a given `lxid` in a given namespace / mode
* **[–]** implement readable representation / RPR for lexers, maybe as table
* **[–]** safeguard against undefined lexemes mentioned by `before`, `after`
* **[–]** distinguish between
  * proto-lexemes (which are lexeme definitions may be incomplete and have not yet been compiled; they are
    'dormant' and stateless),
  * (proper) lexemes (which are lexemes in the registry lexer that is ready to be used; these may be
    stateful), and
  * tokens (the results of certain lexemes having matched at some point in the source text)
* **[–]** allow symbolic mode, jump values as in `'$codespan_mode'` that refer to values in `@cfg`?
* **[–]** allow to set prefixes for input (as class members) and output (as instance members, object
  properties, or list elements)
* **[–]** implement `add_lexemes()` for adding single and multiple lexemes
* **[–]** make use of mode names in `lx_*` properties mandatory to avoid name conflicts
* **[–]** implement `set_lnr()`

* **[–]** offer text normalization that includes removing trailing whitespace, different line endings
  ```coffee
  echo '–––'; echo "a1 xyz123\nb1"
  echo '–––'; echo "a2 xyz123\n\rb2"
  echo '–––'; echo "a3 xyz123\r\nb3"
  echo '–––'; echo "a4 xyz123\n\nb4"
  echo '–––'; echo "a5 xyz123\n\r\n\rb5"
  echo '–––'; echo "a6 xyz123\n\n\r\rb6"
  echo '–––'; echo "a7 xyz123\r\n\r\nb7"
  echo '–––'; echo "a8 xyz123\r\n\n\rb8"
  /(\n\r|\r\n|\n)/ -> '\n'
  /\r/ -> ''
  ```

  * pay attention to the excellent SO answer https://stackoverflow.com/a/3469155/7568091 who suggests using
    `/[^\S\r\n]/` with double negative (`[^]` plus `\S`) to match linear whitespace only
* **[–]** export `GUY.*.walk_lines()` to promote easy use of line-wise lexing
* **[–]** should we walk over entire file content when `lexer.cfg.linewise` is `false`? Needed to keep
  parity with walking over texts
* **[–]** implement `reset()` method that is equivalent to instantiating a new lexer with the same settings
* **[–]** already possible to use `:` within mode names to indicate multi-level hierarchy (modes and
  submodes); possible / necessary / useful to formalize this?
* **[–]** allow lexeme declarations to declare errors with a `code`
* **[–]** optionally (but less importantly), could demand implicit catchall and reserved lexemes for all
  modes, then allow overrides per mode
* **[–]** add public API `new_token()` (can be used as `new_token t` to produce copy of `t`, or `new_token {
  t..., value: 'xxx', }` to derive from `t`, so don't need explicit arguments for that)
* **[–]** review role of Datom, `$key` element
* **[–]** introduce new value for `cfg.split` which is like `lines` but foregoes the implicit application of
  `GUY.str.walk_lines()` and trimming, assuming this has been properly done by the consumer; this mainly as
  a minor optimization
* **[–]** how to mark borders when two inclusive jumps appear with no separation as in `<tag1><tag2>`?
* **[–]** implement method to add standard lexemes:
  * **[–]** for escaped characters, like `{ mode, lxid: 'escchr', pattern:
  /\\(?<chr>.)/u, reserved: '\\', }`
  * **[–]** for line ends / newlines, like `{ mode, lxid: 'nl', jump: null, pattern: /$/u, value: '\n', }`
* **[–]** add tests to ensure positive, negative lookbehinds, lookaheads are not recognized as capturing
  groups
* **[–]** might want to have tokens that cause one or two border tokens to be emitted, notation:
  * `jump: '].['`: emit one token `{ lxid: '$border, data: { prv: 'plain', nxt: 'plain', }, }`
  * `jump: ']..['`: emit two tokens `{ lxid: '$border, data: { prv: 'plain', nxt: 'plain', }, }`
  * `jump: ']xyz['`: emit two tokens `{ lxid: '$border, data: { prv: 'plain', nxt: 'xyz', }, }` and `{ lxid:
    '$border, data: { prv: 'xyz', nxt: 'plain', }, }`; the mode `xyz` introduced here need not be declared
* **[–]** implement positioning API to ensure correct positioning of tokens obtained from a lexer that
  consumes output of a `Start_stop_preprocessor`:
  * **[–]** `lexer.set_position()`
  * **[–]** ❓`lexer.get_position()`
  * **[–]** ❓`lexer.get_position_1()`
  * **[–]** ❓`lexer.set_position_1()`
  * **[–]** ❓`lexer.get_position_2()`
  * **[–]** ❓`lexer.set_position_2()`
  * **[–]** <del>`lexer.get_offset()`</del>
  * **[+]** <del>`lexer.set_offset()`</del>
* **[–]** allow parsing of 'minimal token' with mandatory attribute, `value`, optional attributes `lnr1`,
  `x1`; this will implicitly call `lexer.set_offset { lnr: t.lnr1, x: t.x1, }`. Useful for consuming tokens
  from `Start_stop_preprocessor`
  * should offset be reset or carried on when intermittently lexing w/out positions?
* **[–]** consider to rename `token.source -> token.input`, `token.value -> token.source`
  * **[–]** FTTB, allow minimal token to have either `value` and / or `source` attributes, prefer `value`
    where present
  * **[–]** importantly, **input shape should match output shape** (with the exception that input may also
    come from strings or a file instead of a token-like object)
* **[–]** implement declarative chaining of preprocessors and lexers, lexers and lexers
* **[–]** implement using regexes in `reserved` when possible
* **[–]** disallow lexing with an 'empty' lexer (that has no lexemes); must explicitly declare a
  'match-nothing' lexeme if that's what you want (unlikely)
* **[–]** remove `set_offset()`, implement `set_position()`
* **[–]** in test `start_stop_preprocessor/start_stop_preprocessor_basic()` some tests show active, inactive
  tokens out of order; try to fix in preprocessor `$assemble_lines()`?
* **[–]** just as `denchg` tokens are emitted at the very start and end of each document, so should
  `$border` tokens be emitted
* **[–]** use `$meta` (or similar), `$outline` as mode names in preprocessors to avoid name clashes with
  userland modes
* **[–]** allow for longest-first matches that, starting from the left end, always return the longest
  matching sequence, such that `list of integers` is split into `list of`, `integers` when matchers are
  `/list\b/`, `list\s+of\b`, `integers?\b` (and, indeed, `/of\s+integers?\b/`)
  * alternatively, and simpler, require that all lexemes are bounded by a separator to the left and right as
    motivated by [Regular-Expressions.info: *Alternation with The Vertical Bar or Pipe
    Symbol*](https://www.regular-expressions.info/alternation.html)
* **[–]** use [`slevithan/regex`](https://github.com/slevithan/regex) internally to escape strings etc.;
  export it for the benefit of the user


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
* **[+]** allow lexemes to announce 'reserved' / 'forbidden' / 'active' characters (such as `<` that signals
  start of an HTML tag) that can later be used to formulate a fallback pattern to capture otherwise
  unmatched text portions
  * **[+]** at any point, allow to construct a pattern that *only* matches reserved characters and a pattern
    that matches anything *except* reserved characters
* **[+]** <del>**(?)** consider to reset `lexer.cfg.linewise` to `true` when `lexer.walk()` gets called with
  `path` or else throw error (because results will likely be not as expected).</del> <ins>**Contra**:
  legitimate to parse with local positions, no line numbers</ins>
* **[+]** implement lexeme property `create`
* **[+]** disallow lexemes to be accidentally overwritten
* **[+]** allow lexeme declarations to override `value` by setting either `value` or `empty_value` to
* **[+]** modify behavior of catchall and reserved:
  * **[+]** catchall and reserved are 'declared', not 'added', meaning they will be created implicitly when
    `_finalize()` is called
  * **[+]** catchall and reserved alway come last (in this order)
  * **[+]** prevent re-ordering of catchall and reserved when doing topological sorting
  * **[+]** <del>the instantiation settings `catchall_concat` and `reserved_concat` can be overriden when
    either is declared</del>
  constant or function
* **[+]** <del>implement `line`, `col` coordinates for tokens</del>
* **[+]** change indexing shape from `lnr`, `start`, `stop` to `l1`, `x1`, `l2`, `x2`, since in the general
  case, a token may start one one line and end on another. `x1`, `x2` are zero-based, exclusive, code unit
  indexes (JS string indices), while `l1`, `l2` are one-based, inclusive line numbers. Observe that it can
  be quite difficult to give correct column numbers when complex scripts are used; for Latin script sources
  that do not use combining characters but may be intermingled e.g. with symbols and CJK characters from
  SMP, SIP and TIP , `( Array.from 'string'[ ... x1 ] ).length` converts correctly from 0-based code units
  to human-readable column counts (but throw in combining characters, RTL scripts or complex emoji and they
  will be incorrect)
* **[+]** <del>consider to introduce 'pre-jumps' (?) such that the occurrence of a match (say, `<` in `plain`
  mode) means that the match is already in the jump-target mode (say, `tag`). This should make some things
  cleaner / more logical when both the left and the right delimiters of a mode are within that mode</del>
  <ins>Implement syntax, semantics for inclusive, exclusive jumps:</ins>
  * <del>fast, slow jump;</del> inclusive, exclusive jump; <del>early, late jump</del>
  * syntax (assuming mode `plain`):
    * entry jumps:
      * `{ jump: '[tag', }` (inclusive entry jump; boundary 'post' belongs to *new* mode `tag`),
      * `{ jump: 'tag[', }` (exclusive entry jump; boundary 'post' belongs to *old* mode `plain`),
    * exit jumps; the location of the `.` (dot) symbolizes the location of the mode the 'post' will belong
      to:
      * `{ jump: '.]',   }` (inclusive exit jump; boundary 'post' belongs to *old* mode `tag`),
      * `{ jump: '].',   }` (exclusive exit jump; boundary 'post' belongs to *new* mode `plain`)
  * documentation
* **[+]** rename `x` -> `atrs`
* **[+]** rename `atrs` -> `data`
* **[+]** implement 'singleton' / 'virtual' jumps:
  * `jump: '[str]'` will return a token in mode `str` without jumping into that mode (or, by 'virtually'
    jumping to that mode and then immediately back); the `value` of the token will be the matched substring
    (as usual)
  * optionally: `jump: 'str[]'`, same as above, but value will always be the empty string (can also be done
    as `jump: '[str]', value: ''` so not essential)
* **[+]** add MVP version of `tools/start-stop-preprocessor` to implement start/stop roughly as detailed
  below

  <del>implement a preprocessing mode and a binary property `lexer.state.active`, the rule being
  that</del>
  * <del>until the preprocessing mode has brought the lexer from `active == false` to `active == true`, all
    material is rendered, as-is, as `value` property of special `$raw` tokens, without being scanned by the
    regular mode patterns</del>
  * <del>as soon as the preprocessing mode can bring `lexer.state.active` from `true` to `false` and vice
    versa any number of times, which means that we can use the lexer to determine regions for lexing</del>
  * <del>the reason the above is not feasable with regular modes is that</del>
    * <del>once we jump from preprocessing to regular, the lexer will stay in that regular mode (when
      `state: 'keep'` is set)</del>
    * <del>when preprocessing has found a `start` meta-token, one does know that only material after that
      token will have to be lexed by an regular mode—but one does *not* yet know whether another meta-token
      can be matched within that remaining region of the source; therefore, one has to first exhaust the
      preprocessor (for the current chunk or line at least) before regular lexing can start</del>
    * <del>this is essentially the behavior of `Interlex` itself, so one could implement preprocessing by
      instantiating a separate `Interlex` instance</del>
* **[+]** tokens should never have the jump function as value for the `jump` property


