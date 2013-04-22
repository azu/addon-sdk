'use strict';

const { Cu } = require('chrome');

Cu.import("resource://gre/modules/NetUtil.jsm");
exports.NetUtil = NetUtil;

Cu.import("resource://gre/modules/devtools/NetworkHelper.jsm");
exports.NetworkHelper = NetworkHelper;
