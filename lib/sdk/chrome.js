'use strict';

const chrome = require('chrome');

Object.keys(chrome).forEach(function(key) {
  exports[key] = chrome[key];
});
