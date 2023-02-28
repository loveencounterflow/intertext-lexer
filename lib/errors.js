(function() {
  'use strict';
  var rpr;

  //###########################################################################################################
  ({rpr} = (require('guy')).trm);

  //-----------------------------------------------------------------------------------------------------------
  this.Interlex_error = class Interlex_error extends Error {
    constructor(ref, message) {
      super();
      this.message = `${ref} (${this.constructor.name}) ${message}`;
      this.ref = ref;
      return void 0/* always return `undefined` from constructor */;
    }

  };

  //-----------------------------------------------------------------------------------------------------------
  this.Interlex_internal_error = class Interlex_internal_error extends this.Interlex_error {
    constructor(ref, message) {
      super(ref, message);
    }

  };

  this.Interlex_not_implemented = class Interlex_not_implemented extends this.Interlex_error {
    constructor(ref, feature) {
      super(ref, `${feature} not implemented`);
    }

  };

  this.Interlex_illegal_jump_target = class Interlex_illegal_jump_target extends this.Interlex_error {
    constructor(ref, type, value) {
      super(ref, `not a valid jump target: (${type}) ${rpr(value)}`);
    }

  };

  this.Interlex_mode_stack_exhausted = class Interlex_mode_stack_exhausted extends this.Interlex_error {
    constructor(ref, message) {
      super(ref, message);
    }

  };

  this.Interlex_mode_unknown = class Interlex_mode_unknown extends this.Interlex_error {
    constructor(ref, mode) {
      super(ref, `no such mode: ${rpr(mode)}`);
    }

  };

  this.Interlex_lexeme_exists = class Interlex_lexeme_exists extends this.Interlex_error {
    constructor(ref, mode, tid) {
      super(ref, `lexeme ${mode}:${tid} already exists`);
    }

  };

  this.Interlex_catchall_exists = class Interlex_catchall_exists extends this.Interlex_error {
    constructor(ref, mode, tid) {
      super(ref, `catchall ${mode}:${tid} already exists`);
    }

  };

  this.Interlex_reserved_exists = class Interlex_reserved_exists extends this.Interlex_error {
    constructor(ref, mode, tid) {
      super(ref, `reserved ${mode}:${tid} already exists`);
    }

  };

  this.Interlex_TBDUNCLASSIFIED = class Interlex_TBDUNCLASSIFIED extends this.Interlex_error {
    constructor(ref, message) {
      super(ref, message);
    }

  };

}).call(this);

//# sourceMappingURL=errors.js.map