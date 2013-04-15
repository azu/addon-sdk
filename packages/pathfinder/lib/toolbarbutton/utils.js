'use strict';

const winUtils = require("sdk/deprecated/window-utils");
const { isBrowser } = require('sdk/window/utils');

const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

function getToolbarButtons(callback, id) {
  let buttons = [];
  for each (var window in winUtils.windowIterator()) {
    if (!isBrowser(window)) continue;
    let tbb = window.document.getElementById(id);
    if (tbb) buttons.push(tbb);
  }
  if (callback) buttons.forEach(callback);
  return buttons;
}
exports.getToolbarButtons = getToolbarButtons;

function toolbarbuttonExists(doc, id) {
  var toolbars = doc.getElementsByTagNameNS(NS_XUL, "toolbar");
  for (var i = toolbars.length - 1; ~i; i--) {
    if ((new RegExp("(?:^|,)" + id + "(?:,|$)")).test(toolbars[i].getAttribute("currentset")))
      return toolbars[i];
  }
  return false;
}
exports.toolbarbuttonExists = toolbarbuttonExists;

exports.fixIDInSet = function fixIDInSet(et, aID, aB4) {
  let set = set.split(',');
  for (let i = set.length - 1; i >= 0; i--) {
    if (aB4 == set[i]) {
      set.splice(i, 0, aID);
      return set.join(',');
    }
  }
  set.unshift(aID);
  return set.join(',');
}

function removeIDFromSet(set, aID) {
  return set.split(',').filter(function(id) {
  	return id != aID;
  }).join(',');
};
