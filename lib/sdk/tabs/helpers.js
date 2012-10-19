/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

const { getTabForContentWindow } = require('./utils');
const { Tab } = require('./tab');
const { tabNS } = require('../tabs/namespace');
const tabs = require('sdk/tabs');

function getTabForWindow(win) {
  let tab = getTabForContentWindow(win);
  // We were unable to find the related tab!
  if (!tab)
    return null;

  let rtnTab = getTabForRawTab(tab);
  if (rtnTab)
    return rtnTab;
  return Tab({ tab: tab });
}
exports.getTabForWindow = getTabForWindow;


function getTabForRawTab(rawTab) {
  // fennec
  for each (let tab in tabs) {
    if (tabNS(tab).tab === rawTab)
      return tab;
  }
  return null;
}
exports.getTabForRawTab = getTabForRawTab;
