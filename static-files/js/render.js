
const markdownToHtml = (function () {
  const BUGZILLA_REPLACE_PATTERN =
    "[bug $1](https://bugzilla.mozilla.org/show_bug.cgi?id=$1)";
  const BUGZILLA_REGEXP = /bug\s+([0-9]+)/g;
  const DOCTEST_REGEXP = /(<BLANKLINE>|>>>.+)/g;
  const converter = new Showdown.converter();

  function insertBugzillaLinks(text) {
    return text.replace(BUGZILLA_REGEXP, BUGZILLA_REPLACE_PATTERN);
  }

  function removePyDoctestCode(text) {
    return text.replace(DOCTEST_REGEXP, "");
  }

  return function markdownToHtml(text) {
    return converter.makeHtml(removePyDoctestCode(insertBugzillaLinks(text)));
  }
})();
