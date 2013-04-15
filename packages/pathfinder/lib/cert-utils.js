
const { Cu } = require('sdk/chrome');
Cu.import("resource://gre/modules/CertUtils.jsm");
[ "BadCertHandler", "checkCert", "readCertPrefs", "validateCert" ].forEach(function(key) {
  exports[key] = this[key];
}.bind(this));
