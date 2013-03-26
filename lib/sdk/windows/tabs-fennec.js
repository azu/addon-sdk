/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

const { Class } = require('../core/heritage');
const { Tab } = require('../tabs/tab');
const { browserWindows } = require('./fennec');
const { windowNS } = require('../window/namespace');
const { tabsNS, tabNS } = require('../tabs/namespace');
const { openTab, getTabs, getSelectedTab, getTabForBrowser: getRawTabForBrowser,
        getTabContentWindow } = require('../tabs/utils');
const { Options } = require('../tabs/common');
const { getTabForBrowser, getTabForRawTab } = require('../tabs/helpers');
const { on, once, off, emit } = require('../event/core');
const { method } = require('../lang/functional');
const { EVENTS } = require('../tabs/events');
const { EventTarget } = require('../event/target');
const { when: unload } = require('../system/unload');
const { windowIterator } = require('../deprecated/window-utils');
const { List, addListItem, removeListItem, hasListItem } = require('../util/list');
const { isPrivateBrowsingSupported } = require('../self');
const { isTabPBSupported, ignoreWindow } = require('../private-browsing/utils');

const mainWindow = windowNS(browserWindows.activeWindow).window;

const ERR_FENNEC_MSG = 'This method is not yet supported by Fennec';

const supportPrivateTabs = isPrivateBrowsingSupported && isTabPBSupported;

const Tabs = Class({
  implements: [ List ],
  extends: EventTarget,
  initialize: function initialize(options) {
    let tabsInternals = tabsNS(this);
    let window = tabsNS(this).window = options.window || mainWindow;

    EventTarget.prototype.initialize.call(this, options);

    // add open tabs to list
    let openTabs = getTabs(window).map(Tab);
    console.log('openTabs: '+openTabs.length);
    List.prototype.initialize.apply(this, openTabs);
    openTabs.forEach(addTab.bind(null, this));

    // TabOpen event
    window.BrowserApp.deck.addEventListener(EVENTS.open.dom, onTabOpen, false);
  },
  get activeTab() {
    return getTabForRawTab(getSelectedTab(tabsNS(this).window));
  },
  open: function(options) {console.log('open tab');
    options = Options(options);
    let activeWin = browserWindows.activeWindow;

    if (options.isPinned) {
      console.error(ERR_FENNEC_MSG); // TODO
    }

    let rawTab = openTab(windowNS(activeWin).window, options.url, {
      inBackground: options.inBackground,
      isPrivate: supportPrivateTabs && options.isPrivate
    });

    // by now the tab has been created
    let tab = getTabForRawTab(rawTab);

    if (options.onClose)
      tab.on('close', options.onClose);

    if (options.onOpen) {
      // NOTE: on Fennec this will be true
      if (tabNS(tab).opened)
        options.onOpen(tab);

      tab.on('open', options.onOpen);
    }

    if (options.onReady)
      tab.on('ready', options.onReady);

    if (options.onActivate)
      tab.on('activate', options.onActivate);

    return tab;
  }
});
let gTabs = exports.tabs = Tabs(mainWindow);

function tabsUnloader(event, window) {
  window = window || (event && event.target);
  if (!(window && window.BrowserApp))
    return;
  window.BrowserApp.deck.removeEventListener(EVENTS.open.dom, onTabOpen, false);
}

// unload handler
unload(function() {
  for (let window in windowIterator()) {
    tabsUnloader(null, window);
  }
});

function addTab(tabs, tab) {console.log('addTab'+tab.url);
  if (hasListItem(tabs, tab))
    return tab;

  addListItem(tabs, tab);

  tab.on('ready', function() emit(tabs, 'ready', tab));
  tab.on('activate', function() {
    emit(tabs, 'activate', tab);

    for each (let t in tabs) {
      if (t === tab)
        continue;

      emit(t, 'deactivate', t);
      emit(tabs, 'deactivate', t);
    }
  });
  tab.once('close', onTabClose);

  emit(tabs, 'open', tab);

  return tab;
}

function removeTab(tab) {
  removeListItem(gTabs, tab);
  return tab;
}

// TabOpen
function onTabOpen(event) {console.log('onTabOpen');
  let browser = event.target;

  // Eventually ignore private tabs
  if (ignoreWindow(browser.contentWindow))
    return;

  let tab = getTabForBrowser(browser);
  addTab(gTabs, tab ? tab : Tab(getRawTabForBrowser(browser)));
};

// TabClose
function onTabClose(tab) {
  removeTab(tab);
  emit(gTabs, EVENTS.close.name, tab);
};
