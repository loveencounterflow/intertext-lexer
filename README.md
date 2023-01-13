

# InterText Lexer `Interlex`


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [InterText Lexer `Interlex`](#intertext-lexer-interlex)
  - [To Do](#to-do)
  - [Is Done](#is-done)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->


# InterText Lexer `Interlex`


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

