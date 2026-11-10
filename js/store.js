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
      timers: {}, notes: [], allergens: {}, teeth: {}, play: {}, checkins: [], firsts: [],
      settings: { theme: '', size: '', autoNight: false, lastBackup: null, hijri: true, homeCards: {}, needsProfile: false }
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
    if (!Array.isArray(s.firsts)) s.firsts = [];
    s.firsts.forEach(function (x) { x.id = sid(x.id); x.childId = sid(x.childId); });
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

  /* دمج نسخة من جهاز آخر (مثل جوال الأب) دون حذف أي شيء موجود.
   * Merge another device's backup into this one: nothing existing is removed. */
  function merge(a, b) {
    a = migrate(a); b = migrate(JSON.parse(JSON.stringify(b)));
    var map = {}, added = { children: 0, logs: 0, growth: 0 };
    b.children.forEach(function (c) {
      var hit = a.children.filter(function (x) { return x.id === c.id; })[0] ||
        a.children.filter(function (x) { return x.name === c.name && x.dob === c.dob; })[0];
      if (hit) map[c.id] = hit.id;
      else { a.children.push(c); map[c.id] = c.id; added.children++; }
    });
    function cid(id) { return map[id] || id; }
    var logIds = {}; a.logs.forEach(function (l) { logIds[l.id] = 1; });
    b.logs.forEach(function (l) { if (logIds[l.id]) return; l.childId = cid(l.childId); a.logs.push(l); added.logs++; });
    var gKey = {}; a.growth.forEach(function (g) { gKey[g.id] = 1; gKey[g.childId + g.date + g.w + g.l + g.hc] = 1; });
    b.growth.forEach(function (g) { g.childId = cid(g.childId); if (gKey[g.id] || gKey[g.childId + g.date + g.w + g.l + g.hc]) return; a.growth.push(g); added.growth++; });
    ['milestones', 'vaccines', 'allergens', 'teeth', 'play'].forEach(function (k) {
      Object.keys(b[k] || {}).forEach(function (id) {
        var to = cid(id); a[k][to] = a[k][to] || {};
        Object.keys(b[k][id] || {}).forEach(function (x) { if (a[k][to][x] === undefined) a[k][to][x] = b[k][id][x]; });
      });
    });
    var nIds = {}; a.notes.forEach(function (n) { nIds[n.id] = 1; });
    b.notes.forEach(function (n) { if (!nIds[n.id]) { n.childId = cid(n.childId); a.notes.push(n); } });
    var cDates = {}; a.checkins.forEach(function (c) { cDates[c.date] = 1; });
    b.checkins.forEach(function (c) { if (!cDates[c.date]) a.checkins.push(c); });
    if (!a.firsts) a.firsts = [];
    var fIds = {}; a.firsts.forEach(function (f) { fIds[f.id] = 1; });
    (b.firsts || []).forEach(function (f) { if (!fIds[f.id]) { f.childId = cid(f.childId); f.photo = false; a.firsts.push(f); } });
    if (!a.mother || !a.mother.age) a.mother = b.mother;
    a.logs.sort(function (x, y) { return x.ts - y.ts; });
    return { state: a, added: added };
  }

  root.Store = { load: load, save: save, empty: empty, migrate: migrate, merge: merge, uid: uid, persist: persist, KEY: KEY };
})(window);
