/* اختبارات بسيطة بدون مكتبات: node tests/run.js
 * Checks: WHO LMS maths against the official WHO SD tables, every source id exists,
 * and the personalised tracks react to the profile. */
'use strict';
var fs = require('fs');
var vm = require('vm');
var path = require('path');
var assert = require('assert');

var ctx = { window: {}, console: console };
ctx.globalThis = ctx;
vm.createContext(ctx);
['js/data/sources.js', 'js/data/growth.js', 'js/data/milestones.js', 'js/data/vaccines.js', 'js/data/content.js', 'js/data/extra.js', 'js/data/topics.js', 'js/engine.js']
  .forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f }); });
var W = ctx.window, E = W.Engine;
var passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok - ' + name); }

test('WHO LMS reproduces official SD values (±0.1)', function () {
  var refs = JSON.parse(fs.readFileSync(path.join(__dirname, 'who-reference.json'), 'utf8'));
  refs.forEach(function (r) {
    var lms = W.WHO_LMS[r[0]][r[1]][r[2]];
    [[-2, r[3]], [0, r[4]], [2, r[5]]].forEach(function (p) {
      var v = E.valueAtZ(p[0], lms);
      assert.ok(Math.abs(v - p[1]) <= 0.1, r.slice(0, 3).join('/') + ' z=' + p[0] + ' got ' + v.toFixed(2) + ' want ' + p[1]);
    });
  });
});

test('z-score and percentile of the median are 0 / 50%', function () {
  var r = E.growthAssess('wfa', 'm', 0, 3.3464, W.WHO_LMS);
  assert.ok(Math.abs(r.z) < 0.01);
  assert.ok(Math.abs(r.percentile - 50) < 0.5);
  assert.strictEqual(E.growthAssess('wfa', 'f', 12, 6.0, W.WHO_LMS).level, 'urgent');
});

test('every source id used in content and engine exists', function () {
  var ids = [];
  function grab(tips) { tips.forEach(function (t) { ids = ids.concat(t.src); }); }
  W.STAGES.forEach(function (s) { grab(s.feed); grab(s.move); grab(s.sleep); grab(s.care); });
  grab(W.MOTHER_GENERAL.move); grab(W.MOTHER_GENERAL.feed); grab(W.MOTHER_GENERAL.care);
  ids = ids.concat(['nice_faltering', 'mchat'], W.DANGER_BABY.src, W.DANGER_MOTHER.src, W.FEVER.src, W.FEED_CHECK.src, W.FEED_CHECK.weight.src, W.WHOOLEY.src);
  grab(W.TEETH); grab(W.ALLERGY_TIPS); grab(W.RAMADAN); grab(W.SAFETY); grab(W.VACCINE_NOTES);
  W.PLAY.forEach(function (b) { ids = ids.concat(b.src); });
  W.TOPICS.forEach(function (tp) { grab(tp.tips); });
  var engineSrc = fs.readFileSync(path.join(__dirname, '..', 'js/engine.js'), 'utf8');
  var re = /'([a-z0-9_]+)'/g, m;
  var known = Object.keys(W.SOURCES);
  while ((m = re.exec(engineSrc))) if (/^(who|cdc|aap|nhs|acog|moh|sfda|niaid|nice)_/.test(m[1])) ids.push(m[1]);
  ids.forEach(function (id) { assert.ok(known.indexOf(id) >= 0, 'missing source ' + id); });
  known.forEach(function (k) { assert.ok(/^https:\/\//.test(W.SOURCES[k].url), 'bad url ' + k); });
});

test('age and corrected age', function () {
  var a = E.ageInfo({ dob: '2026-01-01', gaWeeks: 32 }, '2026-04-01');
  assert.strictEqual(a.days, 90);
  assert.ok(a.preterm && a.useCorrected);
  assert.strictEqual(a.correctedDays, 34);
  var b = E.ageInfo({ dob: '2026-01-01', gaWeeks: 39 }, '2026-04-01');
  assert.ok(!b.preterm && b.devDays === 90);
});

test('stages cover 0–48 months without gaps', function () {
  for (var m = 0; m < 48; m += 0.5) assert.ok(E.stageFor(m, W.STAGES).from <= m);
  assert.strictEqual(E.stageFor(6, W.STAGES).id, 's3');
});

test('tracks follow delivery type, sex, age, parity and health', function () {
  var child = { dob: '2026-10-20', gaWeeks: 34, birthWeight: 2200, sex: 'f', delivery: 'cs_emergency', feeding: 'breast', conditions: ['jaundice'] };
  var mom = { age: 38, parity: 3, prevIntervalMonths: 14, conditions: ['gdm', 'htn', 'depression'] };
  var ids = E.buildTracks(mom, child, '2026-11-09').map(function (t) { return t.id; });
  ['cs', 'girl', 'age35', 'multi', 'spacing', 'gdm', 'htn', 'mh', 'preterm', 'lbw', 'jaundice', 'breast'].forEach(function (id) {
    assert.ok(ids.indexOf(id) >= 0, 'expected track ' + id + ' in ' + ids.join(','));
  });
  assert.ok(ids.indexOf('vag') < 0 && ids.indexOf('boy') < 0 && ids.indexOf('first') < 0);

  var ids2 = E.buildTracks({ age: 18, parity: 1, conditions: [] },
    { dob: '2026-11-01', gaWeeks: 40, sex: 'm', delivery: 'vaginal', feeding: 'formula', conditions: [] }, '2026-11-09')
    .map(function (t) { return t.id; });
  ['vag', 'boy', 'young', 'first', 'formula'].forEach(function (id) { assert.ok(ids2.indexOf(id) >= 0, 'expected ' + id); });
  assert.ok(ids2.indexOf('preterm') < 0 && ids2.indexOf('cs') < 0);
});

test('vaccine schedule ordered and next vaccine works', function () {
  for (var i = 1; i < W.VACCINES.length; i++) assert.ok(W.VACCINES[i].m > W.VACCINES[i - 1].m);
  var nv = E.nextVaccine({ dob: '2026-01-01' }, W.VACCINES, { 0: '2026-01-01' }, '2026-02-01');
  assert.strictEqual(nv.v.m, 2);
});

test('milestones exist for each CDC checklist age to 4 years', function () {
  assert.strictEqual(W.MILESTONES.map(function (b) { return b.m; }).join(','), '2,4,6,9,12,15,18,24,30,36,48');
});

test('play ideas cover 0–48 months and fever rules are ordered', function () {
  for (var m = 0; m < 48; m += 1) assert.ok(E.stageFor(m, W.PLAY).from <= m && E.stageFor(m, W.PLAY).to > m, 'play gap at ' + m);
  assert.ok(W.FEVER.rules[0].maxM === 3 && W.FEVER.rules[0].temp === 38);
});

test('eczema child gets allergy track', function () {
  var ids = E.buildTracks({ age: 30, parity: 1, conditions: [] },
    { dob: '2026-05-01', gaWeeks: 40, sex: 'm', delivery: 'vaginal', feeding: 'breast', conditions: ['eczema'] }, '2026-10-01').map(function (t) { return t.id; });
  assert.ok(ids.indexOf('allergy') >= 0);
});

test('vaccine due dates are whole days and timezone-free', function () {
  assert.strictEqual(E.vaccineDue('2026-01-01', 0), '2026-01-01');
  assert.strictEqual(E.vaccineDue('2026-01-01', 2), '2026-03-03');
  assert.strictEqual(E.nextVaccine({ dob: '2026-01-01' }, W.VACCINES, {}, '2026-01-02').due, '2026-01-01');
});

test('import migration cleans unsafe ids and non-numeric values, and upgrades v1', function () {
  var sctx = { window: { localStorage: { getItem: function () { return null; } } } };
  vm.createContext(sctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/store.js'), 'utf8'), sctx);
  var St = sctx.window.Store;
  var bad = St.migrate({ v: 1, mother: { age: '30', conditions: [] }, children: [{ id: 'a"><img src=x>', name: 'x', gaWeeks: '<img src=x onerror=alert(1)>' }],
    logs: [{ id: '1<b>', childId: 'a"><img src=x>', type: 'temp', ts: '5', c: '<script>' }], growth: [{ id: 'g', childId: 'a', w: '<img>' }] });
  assert.strictEqual(bad.children[0].id, 'aimgsrcx');
  assert.strictEqual(bad.children[0].gaWeeks, 40);
  assert.strictEqual(bad.logs[0].c, null);
  assert.strictEqual(bad.growth[0].w, null);
  assert.strictEqual(bad.v, 2);
  assert.ok(bad.settings && Array.isArray(bad.notes) && bad.timers && bad.allergens);
});

test('merge combines two devices without losing data', function () {
  var sctx = { window: { localStorage: { getItem: function () { return null; } } } };
  vm.createContext(sctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js/store.js'), 'utf8'), sctx);
  var St = sctx.window.Store;
  var mom = { mother: { age: 30, conditions: [] }, children: [{ id: 'a', name: 'ليان', dob: '2026-01-01' }], activeId: 'a',
    logs: [{ id: 'l1', childId: 'a', type: 'diaper', ts: 1 }], growth: [], milestones: { a: { '2-move-0': '2026-03-01' } } };
  var dad = { mother: {}, children: [{ id: 'x', name: 'ليان', dob: '2026-01-01' }, { id: 'y', name: 'سلمان', dob: '2024-01-01' }], activeId: 'x',
    logs: [{ id: 'l1', childId: 'x', type: 'diaper', ts: 1 }, { id: 'l2', childId: 'x', type: 'breast', ts: 2 }], growth: [{ id: 'g', childId: 'x', date: '2026-02-01', w: 4 }],
    milestones: { x: { '2-move-1': '2026-03-02' } } };
  var r = St.merge(mom, dad);
  assert.strictEqual(r.state.children.length, 2);
  assert.strictEqual(r.state.logs.length, 2);
  assert.ok(r.state.logs.every(function (l) { return l.childId === 'a'; }));
  assert.strictEqual(r.state.growth[0].childId, 'a');
  assert.ok(r.state.milestones.a['2-move-0'] && r.state.milestones.a['2-move-1']);
  assert.strictEqual(r.state.mother.age, 30);
  assert.strictEqual(r.added.logs, 1);
});

test('weight trend alerts after falling two centile spaces, not for steady growth', function () {
  var ch = { id: 'a', sex: 'm', dob: '2026-01-01', gaWeeks: 40, birthWeight: 3500 };
  var low = E.growthTrend(ch, [{ childId: 'a', date: '2026-03-01', w: 4.6 }, { childId: 'a', date: '2026-05-01', w: 5.4 }], W.WHO_LMS);
  assert.ok(low.alert && low.velocity.gPerDay === 13);
  var ok = E.growthTrend(ch, [{ childId: 'a', date: '2026-03-01', w: 5.6 }, { childId: 'a', date: '2026-05-01', w: 7.0 }], W.WHO_LMS);
  assert.ok(!ok.alert);
  var newborn = E.growthTrend(ch, [{ childId: 'a', date: '2026-01-04', w: 3.2 }], W.WHO_LMS);
  assert.ok(!newborn.alert, 'first 14 days ignored');
});

test('mother dates follow conditions and child age', function () {
  var ch = { id: 'a', dob: '2026-01-01', gaWeeks: 40 };
  var ids = E.motherDates({ conditions: ['gdm', 'htn'] }, ch).map(function (d) { return d.id; });
  ['pnc1', 'pnc2', 'pnc3', 'bp', 'gtt', 'mchat18', 'mchat24'].forEach(function (k) { assert.ok(ids.indexOf(k) >= 0, k); });
  var g = E.motherDates({ conditions: ['gdm'] }, ch).filter(function (d) { return d.id === 'gtt'; })[0];
  assert.strictEqual(g.from, '2026-01-29'); assert.strictEqual(g.to, '2026-03-26');
  assert.ok(E.motherDates({ conditions: [] }, ch).every(function (d) { return d.id !== 'gtt' && d.id !== 'bp'; }));
});

console.log('\n' + passed + ' tests passed');
