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
    /* تنظيف البيانات المستوردة: معرّفات آمنة وأرقام حقيقية */
    function sid(x) { return String(x == null ? '' : x).replace(/[^\w-]/g, '').slice(0, 40); }
    function n(x) { var v = +x; return x == null || x === '' || !isFinite(v) ? null : v; }
    s.children.forEach(function (c) { c.id = sid(c.id); c.gaWeeks = n(c.gaWeeks) || 40; c.birthWeight = n(c.birthWeight); if (!Array.isArray(c.conditions)) c.conditions = []; });
    s.activeId = sid(s.activeId);
    s.logs.forEach(function (l) {
      l.id = sid(l.id); l.childId = sid(l.childId); l.ts = n(l.ts) || 0;
      ['minutes', 'left', 'right', 'ml', 'c', 'mood'].forEach(function (k) { if (k in l) l[k] = n(l[k]); });
    });
    s.growth.forEach(function (g) { g.id = sid(g.id); g.childId = sid(g.childId); g.w = n(g.w); g.l = n(g.l); g.hc = n(g.hc); });
    if (!Array.isArray(s.notes)) s.notes = [];
    Object.keys(s.timers || {}).forEach(function (k) { var t = s.timers[k]; if (!t || !isFinite(+t.start)) delete s.timers[k]; else t.start = +t.start; });
    s.notes.forEach(function (x) { x.id = sid(x.id); x.childId = sid(x.childId); });
    if (s.mother) { s.mother.age = n(s.mother.age); s.mother.parity = n(s.mother.parity) || 1; s.mother.prevIntervalMonths = n(s.mother.prevIntervalMonths); if (!Array.isArray(s.mother.conditions)) s.mother.conditions = []; }
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
