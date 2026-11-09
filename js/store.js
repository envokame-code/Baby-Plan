/* التخزين المحلي: كل البيانات تبقى على جهازك فقط (localStorage). لا يُرسل شيء إلى أي خادم.
 * Local-only storage. Nothing leaves the device. */
(function (root) {
  'use strict';
  var KEY = 'babyplan.v1';

  function empty() {
    return { v: 1, mother: { conditions: [] }, children: [], activeId: null, logs: [], growth: [], milestones: {}, vaccines: {} };
  }
  function load() {
    try {
      var raw = root.localStorage.getItem(KEY);
      if (!raw) return empty();
      var s = JSON.parse(raw);
      var e = empty();
      for (var k in e) if (s[k] === undefined) s[k] = e[k];
      return s;
    } catch (err) { return empty(); }
  }
  function save(s) {
    try { root.localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (err) { return false; }
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  root.Store = { load: load, save: save, empty: empty, uid: uid, KEY: KEY };
})(window);
