

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
* **[–]** make calls to `finalize()` implicit
* **[–]** implement `step()`


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

