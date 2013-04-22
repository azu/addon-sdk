/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

const { Ci, Cc } = require('chrome');
const { ChromeMod } = require('chrome-mod');
const { windowIterator } = require('sdk/deprecated/window-utils');

exports.testChromeMod = function(assert, done) {
  let chromeMod = new ChromeMod({
    type: "navigator:browser",

    contentScript: 'new ' + function WorkerScope() {
      document.documentElement.setAttribute("chrome-mod-ok", "true");
      self.on("message", function (data) {
        if (data=="hi")
          self.postMessage("bye");
      });
    },

    onAttach: function(worker) {
      worker.on("message", function (data) {
        assert.equal(data, "bye", "get message from content script");
        // Search for this modified window
        for(let win in windowIterator()) {
          if (win.document.documentElement.getAttribute("chrome-mod-ok") == "true") {
            done();
            return;
          }
        }
        assert.fail("Unable to found the modified window, with 'chrome-mod-ok' attribute");
      });
      worker.postMessage("hi");
    }
  });
};

require("test").run(exports);
