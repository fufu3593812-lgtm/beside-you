// gacha-ui-patch.js - loaded after gacha-logic.js
// Override show() to sync pool selection with logic layer
var _origShow = show;
show = function(i) {
  switchPool(i);
  _origShow(i);
};
// Initial sync
switchPool(0);
