function startApp(jQuery, window) {
  var $ = jQuery;
  var document = window.document;
  var packages = null;
  var currentHash = "";
  var pkgFileUrlAry = ["packages/",, "/",];
  var viewSource = document.getElementById('view-source');

  const DEFAULT_HASH = "guide/getting-started";
  const IDLE_PING_DELAY = 500;
  const CHECK_HASH_DELAY = 100;
  const JS_FILE_REGEXP = /.*\.js$/;

  const TEMPLATE_MOD_PARSE_ERR = $("#templates .module-parse-error");
  const TEMPLATE_MOD_DETAIL = $("#templates .module-detail");
  const TEMPLATE_PKG_DETAIL = $("#templates .package-detail");
  const TEMPLATE_PKG_ENTRY = $("#templates .package-entry");
  const TEMPLATE_GUIDE_SEC = $("#templates .guide-section");

  function checkHash() {
    var hash = window.location.hash;
    if (hash.length <= 1)
      hash = "#" + DEFAULT_HASH;
    if (hash != currentHash) {
      currentHash = hash;
      onHash(currentHash.slice(1));
    }
  }

  function onHash(hash) {
    var parts = hash.split("/");
    switch (parts[0]) {
    case "package":
      showPackageDetail(parts[1]);
      break;
    case "module":
      var pkgName = parts[1];
      var moduleName = parts.slice(2).join("/");
      showModuleDetail(pkgName, moduleName);
      break;
    case "guide":
      showGuideDetail(parts[1]);
      break;
    }
  }

  function getModules(fileStruct) {
    var modules = [];
    for (var name in fileStruct) {
      if (name.match(JS_FILE_REGEXP))
        modules.push(name.slice(0, -3));
      else if (!('size' in fileStruct[name])) {
        var subModules = getModules(fileStruct[name]);
        subModules.forEach(
          function(subModule) {
            modules.push(name + "/" + subModule);
          });
      }
    }
    return modules;
  }

  function pkgFileUrl(pkg, filename) {
    pkgFileUrlAry[1] = pkg.name;
    pkgFileUrlAry[3] = filename;
    return pkgFileUrlAry.join("");
  }

  function pkgHasFile(pkg, filename) {
    var parts = filename.split("/");
    var dirNames = parts.slice(0, -1);
    var filePart = parts[parts.length - 1];
    var dir = pkg.files;
    for (var i = 0; i < dirNames.length; i++) {
      if (dirNames[i] in dir && !('size' in dir[dirNames[i]]))
        dir = dir[dirNames[i]];
      else
        return false;
    }
    return (filePart in dir);
  }

  function fixInternalLinkTargets(query) {
    query.find("a").each(
      function() {
        var href = $(this).attr("href");
        if (href && href.length && href[0] == "#")
          $(this).attr("target", "_self");
      });
  }

  function renderInterleavedAPIDocs(where, hunks) {
    $(where).empty();
    function render_hunk (hunk) {
      if (hunk[0] == "markdown") {
        $("<span>" + markdownToHtml(hunk[1]) + "</span>").appendTo(where);
      } else if (hunk[0] == "api-json") {
        renderDocumentationJSON(
          hunk[1], $("<div class='api'/>").appendTo(where));
      }
    }
    hunks.forEach(render_hunk);
  }

  function getPkgFile(pkg, filename, filter, cb) {
    if (pkgHasFile(pkg, filename)) {
      jQuery.ajax({
        url: pkgFileUrl(pkg, filename),
        dataType: "text",
        success: function(text) {
          if (filter)
            try {
              text = filter(text);
            } catch (e) {
              text = null;
            }
          cb(text);
        },
        error: function() {
          cb(null);
        }
      });
    } else
      cb(null);
  }

  function onPkgAPIError(req, where, source_filename) {
    var errorDisplay = TEMPLATE_MOD_PARSE_ERR.clone();
    errorDisplay.find(".filename").text(source_filename);
    errorDisplay.find(".technical-error").text(req.responseText);
    where.empty().append(errorDisplay);
    errorDisplay.hide();
    errorDisplay.fadeIn();
  }

  function renderPkgAPI(pkg, source_filename, json_filename, where, donecb) {
    if (pkgHasFile(pkg, source_filename)) {
      jQuery.ajax({
        url: pkgFileUrl(pkg, json_filename),
        dataType: "json",
        success: function(json) {
          try {
            renderInterleavedAPIDocs(where, json);
          } catch (e) {
            $(where).text("Oops, API docs renderer failed: " + e);
          }
          donecb("success");
        },
        error: function (req) {
          onPkgAPIError(req, where, source_filename);
          donecb("show_error");
        }
      });
    } else {
      donecb(null);
    }
  }

  function showSidenotes(query) {
    var sidenotes = $("#sidenotes");
    var width = sidenotes.innerWidth();
    var asides = query.find(".aside");
    var newAsides = $("<div></div>");
    sidenotes.empty();
    asides.each(
      function() {
        var aside = $(this);
        var pos = aside.position();
        aside.remove();
        newAsides.append(this);
        $(this).css({top: pos.top});
      });
    sidenotes.append(newAsides);
    newAsides.children().each(
      function() {
        $(this).width(width);
        $(this).width(2*width - $(this).outerWidth());
      });
  }

  var queuedContent = null;

  function queueMainContent(query, onDone) {
    queuedContent = query;
    scrollToTop(function () {
      $("#main-content").fadeOut(100, function () {
        $("#sidenotes").empty();
        $("#right-column").empty().append(query);
        onDone();
      });
    });
  }

  function scrollToTop(onDone) {
    var interval = window.setInterval(function () {
      if (window.scrollY == 0) {
        window.clearInterval(interval);
        onDone();
      }
      else
        window.scrollBy(0, -25);
    }, 10);
  }

  function showMainContent(query, url) {
    if (queuedContent != query)
      return;
    // TODO: !url actually just results in a 404.
    viewSource.setAttribute("href", url || "");
    $("#main-content").fadeIn(400);
    fixInternalLinkTargets(query);
    showSidenotes(query);
    queuedContent = null;
  }

  function showModuleDetail(pkgName, moduleName) {
    var pkg = packages[pkgName];
    var entry = TEMPLATE_MOD_DETAIL.clone();
    var source_filename = "docs/" + moduleName + ".md";
    var json_filename = source_filename + ".json";

    entry.find(".name").text(moduleName);
    queueMainContent(entry, function () {
      renderPkgAPI(pkg, source_filename, json_filename, entry.find(".docs"),
                   function(please_display) {
                     showMainContent(entry, pkgFileUrl(pkg, source_filename));
                   });
    });
  }

  function listModules(pkg, entry) {
    var libs = [];
    if (pkg.lib) {
      pkg.lib.forEach(
        function(libDir) {
          var modules = getModules(pkg.files[libDir]);
          libs = libs.concat(modules);
        });
    }
    var modules = entry.find(".modules");
    if (libs.length > 0) {
      modules.text("");
    }
    libs.sort();
    libs.forEach(
      function(moduleName) {
        var module = $('<li class="module"></li>');
        var hash = "#module/" + pkg.name + "/" + moduleName;
        $('<a target="_self"></a>')
          .attr("href", hash)
          .text(moduleName)
          .appendTo(module);
        modules.append(module);
        modules.append(document.createTextNode(' '));
      });
  }

  function showPackageDetail(name) {
    var pkg = packages[name];
    var entry = TEMPLATE_PKG_DETAIL.clone();
    var filename = "README.md";

    var authors = [];
    if (pkg.author)
      authors.push(pkg.author);
    if (pkg.contributors)
      authors = authors.concat(pkg.contributors);

    var dependencies = pkg.dependencies;

    entry.find(".name").text(pkg.name);
    if (authors.length)
      entry.find(".authors").text(authors.join("\n"));
    if (pkg.license)
      entry.find(".license").text(pkg.license);
    if (pkg.version)
      entry.find(".version").text(pkg.version);
    if (dependencies && dependencies.length)
      entry.find(".dependencies").text(dependencies.join("\n"));
    else
      entry.find(".dependencies").parent().parent().remove();

    listModules(pkg, entry);

    queueMainContent(entry, function () {
      getPkgFile(pkg, filename, markdownToHtml,
                 function(html) {
                   if (html)
                     entry.find(".docs").html(html);
                   showMainContent(entry, pkgFileUrl(pkg, filename));
                 });
    });
  }

  function onPackageError(req) {
    if (req.status == 500) {
      var errorDisplay = $('<div class="technical-error"></div>');
      errorDisplay.text(req.responseText);
      $("#left-column").append(errorDisplay);
      errorDisplay.hide();
      errorDisplay.fadeIn();
    }
    finalizeSetup();
  }

  function processPackages(packagesJSON) {
    packages = packagesJSON;

    var sortedPackages = [];
    for (name in packages)
      sortedPackages.push(name);
    sortedPackages.sort();
    var entries = $("<div></div>");
    var lowLevelEntries = $("<div></div>");
    $("#package-reference").after(entries);
    $("#more-packages").after(lowLevelEntries);
    entries.hide();
    lowLevelEntries.hide();
    sortedPackages.forEach(
      function(name) {
        var pkg = packages[name];
        var entry = TEMPLATE_PKG_ENTRY.clone();
        var hash = "#package/" + pkg.name;
        entry.find(".name").text(pkg.name).attr("href", hash);
        entry.find(".description").text(pkg.description);

        listModules(pkg, entry);

        if ('keywords' in pkg && pkg.keywords.indexOf &&
            pkg.keywords.indexOf('jetpack-low-level') != -1)
          lowLevelEntries.append(entry);
        else
          entries.append(entry);
      });
    entries.fadeIn();
    $("#more-packages").one('click', function() {
      $(this).hide();
      lowLevelEntries.slideDown();
    });
    finalizeSetup();
  }

  function finalizeSetup() {
    checkHash();
    if ("onhashchange" in window) {
      window.addEventListener("hashchange", checkHash, false);
    } else {
      window.setInterval(checkHash, CHECK_HASH_DELAY);
    }
  }

  function showGuideDetail(name) {
    var entry = TEMPLATE_GUIDE_SEC.clone();
    var url = "md/dev-guide/" + name + ".md";

    entry.find(".name").text($("#dev-guide-toc #" + name).text());
    queueMainContent(entry, function () {
      jQuery.ajax({
        url: url,
        dataType: "text",
        success: function(text) {
          entry.find(".docs").html(markdownToHtml(text));
          showMainContent(entry, url);
        },
        error: function(text) {
          showMainContent(entry);
        }
      });
    });
  }

  function linkDeveloperGuide() {
    $("#dev-guide-toc li").each(
      function() {
        if ($(this).children().length == 0) {
          var hash = "#guide/" + $(this).attr("id");
          var hyperlink = $('<a target="_self"></a>');
          hyperlink.attr("href", hash).text($(this).text());
          $(this).text("");
          $(this).append(hyperlink);
        }
      });
  }

  var isPingWorking = true;

  function sendIdlePing() {
    jQuery.ajax({url:"api/idle",
                 // This success function won't actually get called
                 // for a really long time because it's a long poll.
                 success: scheduleNextIdlePing,
                 error: function(req) {
                   if (req.status == 501 || req.status == 404)
                     // The server either isn't implementing idle, or
                     // we're being served from static files; just bail
                     // and stop pinging this API endpoint.
                     return;
                   if (id) {
                     window.clearTimeout(id);
                     id = null;
                     if (isPingWorking) {
                       isPingWorking = false;
                       $("#cannot-ping").slideDown();
                     }
                   }
                   scheduleNextIdlePing();
                 }});
    var id = window.setTimeout(
      function() {
        // This is our "real" success function: basically, if we
        // haven't received an error in IDLE_PING_DELAY ms, then
        // we should assume success and hide the #cannot-ping
        // element.
        if (id) {
          id = null;
          if (!isPingWorking) {
            isPingWorking = true;
            $("#cannot-ping").slideUp();
          }
        }
      }, IDLE_PING_DELAY);
  }

  function scheduleNextIdlePing() {
    window.setTimeout(sendIdlePing, IDLE_PING_DELAY);
  }

  if (window.location.protocol != "file:")
    scheduleNextIdlePing();
  linkDeveloperGuide();
  jQuery.ajax({url: "packages/index.json",
               dataType: "json",
               success: processPackages,
               error: onPackageError});
}

$(window).ready(function() { startApp(jQuery, window); });
