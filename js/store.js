/* التخزين المحلي: كل البيانات تبقى على جهازك فقط (localStorage). لا يُرسل شيء إلى أي خادم.
 * Local-only storage with forward migration. Nothing leaves the device. */
(function (root) {
  'use strict';
  var KEY = 'babyplan.v1';
  var VERSION = 2;

  function empty() {
    return {
      v: VERSION, mother: { conditions: [] }, children: [], activeId: null,
      logs: [], growth: [], milestones: {}, vaccines: {},
      timers: {}, notes: [], allergens: {}, teeth: {}, play: {}, checkins: [],
      settings: { theme: '', size: '', autoNight: false, lastBackup: null }
    };
  }
  function migrate(s) {
    var e = empty();
    for (var k in e) if (s[k] === undefined || s[k] === null) s[k] = e[k];
    for (var j in e.settings) if (s.settings[j] === undefined) s.settings[j] = e.settings[j];
    if (!Array.isArray(s.children)) s.children = [];
    if (!Array.isArray(s.logs)) s.logs = [];
    if (!Array.isArray(s.growth)) s.growth = [];
    s.v = VERSION;
    return s;
  }
  function load() {
    try {
      var raw = root.localStorage.getItem(KEY);
      if (!raw) return empty();
      return migrate(JSON.parse(raw));
    } catch (err) { return empty(); }
  }
  function save(s) {
    try { root.localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (err) { return false; }
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  /* اطلب من المتصفح عدم حذف البيانات تلقائيًا عند امتلاء التخزين */
  function persist() {
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
  }

  root.Store = { load: load, save: save, empty: empty, migrate: migrate, uid: uid, persist: persist, KEY: KEY };
})(window);
