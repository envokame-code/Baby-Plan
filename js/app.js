/* واجهة تطبيق "خطة طفلي". App UI (vanilla JS, no build step). */
(function () {
  'use strict';
  var E = window.Engine;
  var W = window;
  var S = W.Store.load();
  var view = 'home';
  var sub = {};
  var undoId = null;

  var MOTHER_CONDS = [
    ['gdm', 'سكر الحمل'], ['htn', 'ارتفاع الضغط / تسمم الحمل'], ['anemia', 'فقر الدم'],
    ['thyroid', 'اضطراب الغدة الدرقية'], ['depression', 'اكتئاب أو قلق (سابق أو حالي)'],
    ['obesity', 'زيادة الوزن'], ['smoking', 'تدخين في المنزل']
  ];
  var CHILD_CONDS = [['nicu', 'دخل العناية المركزة لحديثي الولادة'], ['jaundice', 'أصيب باليرقان'], ['circumcised', 'تم الختان (للذكور)'], ['eczema', 'إكزيما شديدة أو حساسية بيض']];
  var DELIVERY = [['vaginal', 'طبيعية'], ['assisted', 'طبيعية بمساعدة (شفط / ملقط)'], ['cs_planned', 'قيصرية مخطط لها'], ['cs_emergency', 'قيصرية طارئة']];
  var FEEDING = [['breast', 'رضاعة طبيعية'], ['formula', 'حليب صناعي'], ['mixed', 'مختلطة']];
  var SIDE = { l: 'الأيسر', r: 'الأيمن', b: 'كلاهما' };
  var T = {
    breast: { ico: 'breast', name: 'رضاعة طبيعية', timer: true },
    bottle: { ico: 'bottle', name: 'رضّاعة' },
    sleep: { ico: 'moon', name: 'نوم', timer: true },
    vitd: { ico: 'sun', name: 'فيتامين د' },
    temp: { ico: 'thermo', name: 'حرارة' },
    med: { ico: 'pill', name: 'دواء' },
    mom_bp: { ico: 'heart', name: 'ضغط الأم', mom: true }
  };
  var APP_VERSION = '2026.11.6';
  var WHATS_NEW = ['4 أقسام بدل 5: السجل صار داخل الصفحة الرئيسية', 'الصفحة الرئيسية أقصر: أزرار التسجيل، سجل اليوم، وأهم تنبيهين فقط', 'زر "تسجيل آخر" يفتح كل أنواع التسجيل دون مغادرة الصفحة', 'مساراتك المخصصة صارت أول تبويب في الدليل', 'الحمى والطوارئ في صفحة واحدة، والسلامة ضمن المواضيع'];
  function hasHtn() { return (S.mother.conditions || []).indexOf('htn') >= 0; }
  function isDad() { return S.settings.caregiver === 'dad'; }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ic(name, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoDate(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function isoLocal(d) { d = d || new Date(); return isoDate(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fmtTime(ts) { var d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fmtDate(d) {
    if (typeof d === 'string') d = new Date(d.length === 10 ? d + 'T00:00:00' : d);
    return d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  function fmtHijri(d) {
    if (typeof d === 'string') d = new Date(d.length === 10 ? d + 'T12:00:00' : d);
    try { return d.toLocaleDateString('ar-SA-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { return ''; }
  }
  /* التاريخ الميلادي مع الهجري (إذا فُعّل في الإعدادات) */
  function fmtDateH(d) { var g = fmtDate(d); return S.settings.hijri === false ? g : g + ' · ' + fmtHijri(d); }
  function fmtShort(d) { return new Date(d).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { weekday: 'short', day: 'numeric' }); }
  function num(v, dp) { var p = Math.pow(10, dp || 0); return (Math.round(v * p) / p).toString(); }
  function ago(ts) {
    var m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return 'الآن';
    if (m < 60) return 'منذ ' + m + ' د';
    var h = Math.floor(m / 60), r = m % 60;
    if (h < 24) return 'منذ ' + h + ' س' + (r ? ' ' + r + ' د' : '');
    return 'منذ ' + Math.floor(h / 24) + ' يوم';
  }
  function dur(min) { min = Math.round(min); if (min < 60) return min + ' د'; return Math.floor(min / 60) + ' س' + (min % 60 ? ' ' + (min % 60) + ' د' : ''); }
  function clock(ms) { var s = Math.max(0, Math.floor(ms / 1000)); var h = Math.floor(s / 3600); return (h ? h + ':' : '') + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60); }
  function save() { W.Store.save(S); }
  function child() {
    for (var i = 0; i < S.children.length; i++) if (S.children[i].id === S.activeId) return S.children[i];
    return S.children[0] || null;
  }
  function today() { return isoDate(); }
  function srcHtml(ids) {
    if (!ids || !ids.length) return '';
    var list = ids.map(function (id) { return W.SOURCES[id]; }).filter(Boolean);
    if (!list.length) return '';
    return '<details class="src"><summary>' + ic('book') + 'المصدر' + (list.length > 1 ? ' (' + list.length + ')' : '') + '</summary><ul>' + list.map(function (s) {
      return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.org) + ' — ' + esc(s.title) + '</a></li>';
    }).join('') + '</ul></details>';
  }
  function tipsHtml(tips) {
    return '<ul class="tips">' + tips.map(function (t) { return '<li>' + esc(t.t) + srcHtml(t.src) + '</li>'; }).join('') + '</ul>';
  }
  function plainList(items, prefix) {
    return '<ul class="tips">' + items.map(function (i) { return '<li>' + (prefix || '') + esc(i) + '</li>'; }).join('') + '</ul>';
  }
  function seg(key, options, current) {
    return '<div class="seg" role="tablist">' + options.map(function (o) {
      return '<button role="tab" aria-selected="' + (o[0] === current) + '" class="' + (o[0] === current ? 'on' : '') +
        '" data-action="sub" data-key="' + key + '" data-val="' + o[0] + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function opts(list, val) {
    return list.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');
  }
  function choice(name, list, val) {
    return '<div class="choice" role="radiogroup">' + list.map(function (o, i) {
      var id = name + '_' + i;
      return '<input type="radio" id="' + id + '" name="' + name + '" value="' + o[0] + '"' + (String(o[0]) === String(val) ? ' checked' : '') + '><label for="' + id + '">' + esc(o[1]) + '</label>';
    }).join('') + '</div>';
  }
  function checks(name, list, vals) {
    vals = vals || [];
    return '<div class="checks">' + list.map(function (o) {
      return '<label class="check"><input type="checkbox" name="' + name + '" value="' + o[0] + '"' + (vals.indexOf(o[0]) >= 0 ? ' checked' : '') + '>' + esc(o[1]) + '</label>';
    }).join('') + '</div>';
  }
  function field(id, label, input, hint) {
    return '<div class="field"><label for="' + id + '">' + esc(label) + '</label>' + input + (hint ? '<div class="hint">' + esc(hint) + '</div>' : '') + '</div>';
  }
  function disclaimer() {
    return '<p class="disclaimer">هذا التطبيق للتثقيف والمتابعة ولا يغني عن الطبيب. الطوارئ: 997 · الاستشارة الصحية: 937</p>';
  }
  function toast(msg, undo) {
    var t = document.getElementById('toast');
    t.hidden = false;
    t.innerHTML = esc(msg) + (undo ? ' <button class="btn sm ghost" style="color:inherit;min-height:32px" data-action="undo">تراجع</button>' : '');
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; undoId = null; }, 5000);
  }
  function childLogs(c, type) { return S.logs.filter(function (l) { return l.childId === c.id && (!type || l.type === type); }); }
  function lastLog(c, types) {
    var best = null;
    S.logs.forEach(function (l) { if (l.childId === c.id && types.indexOf(l.type) >= 0 && (!best || l.ts > best.ts)) best = l; });
    return best;
  }
  function endTs(l) { return l.ts + (l.minutes || 0) * 60000; }

  /* ---------- صور اللحظات الأولى (IndexedDB على الجهاز فقط) ---------- */
  var Photos = (function () {
    var dbp = null;
    function db() {
      if (dbp) return dbp;
      dbp = new Promise(function (res, rej) {
        try {
          var r = indexedDB.open('babyplan-photos', 1);
          r.onupgradeneeded = function () { r.result.createObjectStore('p'); };
          r.onsuccess = function () { res(r.result); };
          r.onerror = function () { rej(r.error); };
        } catch (e) { rej(e); }
      });
      return dbp;
    }
    function tx(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction('p', mode); var q = fn(t.objectStore('p')); t.oncomplete = function () { res(q && q.result); }; t.onerror = function () { rej(t.error); }; }); }); }
    return {
      put: function (id, blob) { return tx('readwrite', function (st) { return st.put(blob, id); }); },
      get: function (id) { return tx('readonly', function (st) { return st.get(id); }); },
      del: function (id) { return tx('readwrite', function (st) { return st.delete(id); }); }
    };
  })();
  function loadPhotos() {
    [].forEach.call(document.querySelectorAll('img[data-photo]'), function (im) {
      Photos.get(im.getAttribute('data-photo')).then(function (b) { if (b) { im.src = URL.createObjectURL(b); im.hidden = false; var ph = im.nextElementSibling; if (ph) ph.hidden = true; } }).catch(function () { /* ignore */ });
    });
  }
  /* ---------- البحث في الدليل ---------- */
  var searchIndex = null;
  function buildIndex() {
    var out = [];
    function add(where, tips, go) { (tips || []).forEach(function (t) { out.push({ t: t.t || t, src: t.src || [], where: where, go: go }); }); }
    W.STAGES.forEach(function (st) { ['feed', 'move', 'sleep', 'care'].forEach(function (k) { add('دليل الطفل — ' + st.name, st[k], ['guide', 'baby', st.id]); }); });
    add('دليل الأم', W.MOTHER_GENERAL.move.concat(W.MOTHER_GENERAL.feed, W.MOTHER_GENERAL.care), ['guide', 'mother']);
    add('الرضاعة في رمضان', W.RAMADAN, ['guide', 'mother']);
    add('الطعام والحساسية', W.ALLERGY_TIPS, ['guide', 'food']);
    add('السلامة', W.SAFETY, ['guide', 'safety']);
    add('الحمى', W.FEVER.rules.map(function (r) { return { t: r.t, src: W.FEVER.src }; }).concat(W.FEVER.red.map(function (r) { return { t: r, src: W.FEVER.src }; })), ['care', 'fever']);
    add('هل يرضع كفاية؟', W.FEED_CHECK.days.map(function (d) { return { t: d.t, src: W.FEED_CHECK.src }; }).concat(W.FEED_CHECK.warn.map(function (d) { return { t: d, src: W.FEED_CHECK.src }; })), ['guide', 'baby', 's0']);
    add('التطعيمات', W.VACCINE_NOTES, ['care', 'vax']);
    add('علامات الخطر لدى الطفل', W.DANGER_BABY.items.map(function (d) { return { t: d, src: W.DANGER_BABY.src }; }), ['care', 'danger']);
    add('علامات الخطر لدى الأم', W.DANGER_MOTHER.items.map(function (d) { return { t: d, src: W.DANGER_MOTHER.src }; }), ['care', 'danger']);
    (W.TOPICS || []).forEach(function (tp) { add(tp.title, tp.tips, ['guide', 'topics', tp.id]); });
    return out;
  }
  function norm(x) { return String(x).replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase(); }
  function searchHtml(q) {
    q = q.trim(); if (q.length < 2) return '';
    if (!searchIndex) searchIndex = buildIndex();
    var words = norm(q).split(/\s+/).filter(Boolean);
    var hits = searchIndex.filter(function (it) { var n = norm(it.t + ' ' + it.where); return words.every(function (w) { return n.indexOf(w) >= 0; }); }).slice(0, 30);
    if (!hits.length) return '<p class="muted small" style="text-align:center">لا توجد نتائج. جرّبي كلمة أخرى مثل "حرارة" أو "نوم".</p>';
    return '<p class="small muted">' + hits.length + ' نتيجة</p><ul class="tips">' + hits.map(function (h) {
      return '<li><span class="chip">' + esc(h.where) + '</span><div>' + esc(h.t) + '</div>' + srcHtml(h.src) + '</li>';
    }).join('') + '</ul>';
  }

  /* ---------- profile forms ---------- */
  function motherFields(m) {
    m = m || {};
    return '<div class="form"><h2>معلومات الأم</h2>' +
      '<div class="grid2">' +
      field('m_age', 'عمرك (سنوات)', '<input id="m_age" name="m_age" type="number" inputmode="numeric" min="12" max="60" value="' + esc(m.age || '') + '" required>') +
      field('m_parity', 'رقم هذه الولادة', '<input id="m_parity" name="m_parity" type="number" inputmode="numeric" min="1" max="20" value="' + esc(m.parity || 1) + '" required>', '1 = الطفل الأول') +
      '</div>' +
      field('m_int', 'الفاصل عن الولادة السابقة (بالأشهر)', '<input id="m_int" name="m_int" type="number" inputmode="numeric" min="0" max="300" value="' + esc(m.prevIntervalMonths == null ? '' : m.prevIntervalMonths) + '">', 'اتركيه فارغًا إذا كان الطفل الأول') +
      '<div class="field"><label>حالتك الصحية (اختاري ما ينطبق)</label>' + checks('m_cond', MOTHER_CONDS, m.conditions) + '</div></div>';
  }
  function childFields(c, isNew) {
    c = c || {};
    return '<div class="form"><h2>معلومات الطفل</h2>' +
      field('c_name', 'اسم الطفل', '<input id="c_name" name="c_name" value="' + esc(c.name || '') + '" required maxlength="40" autocomplete="off">') +
      '<div class="field"><label>الجنس</label>' + choice('c_sex', [['m', 'ذكر'], ['f', 'أنثى']], c.sex || '') + '</div>' +
      '<div class="grid2">' +
      field('c_dob', 'تاريخ الولادة', '<input id="c_dob" name="c_dob" type="date" max="' + today() + '" value="' + esc(c.dob || '') + '" required>') +
      field('c_ga', 'أسبوع الولادة', '<input id="c_ga" name="c_ga" type="number" inputmode="numeric" min="22" max="44" value="' + esc(c.gaWeeks || 40) + '" required>', 'أقل من 37 = خديج') +
      '</div>' +
      field('c_bw', 'وزن الولادة (غرام)', '<input id="c_bw" name="c_bw" type="number" inputmode="numeric" min="300" max="7000" value="' + esc(c.birthWeight || '') + '">') +
      field('c_del', 'نوع الولادة', '<select id="c_del" name="c_del" required>' + opts([['', 'اختاري']].concat(DELIVERY), c.delivery || '') + '</select>') +
      '<div class="field"><label>نوع الرضاعة الحالية</label>' + choice('c_feed', FEEDING, c.feeding || 'breast') + '</div>' +
      '<label class="check"><input type="checkbox" name="c_multi"' + (c.multiple ? ' checked' : '') + '>ولادة توائم</label>' +
      '<div class="field"><label>حالة الطفل الصحية</label>' + checks('c_cond', CHILD_CONDS, c.conditions) + '</div>' +
      (isNew ? '<label class="check"><input type="checkbox" name="c_vaxdone" checked>أخذ طفلي كل التطعيمات المستحقة حتى اليوم</label>' : '') +
      '</div>';
  }
  function readMother(f) {
    var iv = f.m_int.value.trim();
    return {
      age: +f.m_age.value, parity: +f.m_parity.value || 1,
      prevIntervalMonths: iv === '' ? null : +iv,
      conditions: [].slice.call(f.querySelectorAll('input[name=m_cond]:checked')).map(function (i) { return i.value; })
    };
  }
  function radio(f, name) { var r = f.querySelector('input[name=' + name + ']:checked'); return r ? r.value : ''; }
  function readChild(f, base) {
    var c = base || { id: W.Store.uid() };
    c.name = f.c_name.value.trim(); c.sex = radio(f, 'c_sex'); c.dob = f.c_dob.value;
    c.gaWeeks = +f.c_ga.value || 40; c.birthWeight = f.c_bw.value ? +f.c_bw.value : null;
    c.delivery = f.c_del.value; c.feeding = radio(f, 'c_feed') || 'breast'; c.multiple = f.c_multi.checked;
    c.conditions = [].slice.call(f.querySelectorAll('input[name=c_cond]:checked')).map(function (i) { return i.value; });
    return c;
  }
  function markPastVaccines(c) {
    var months = E.ageInfo(c, today()).months;
    S.vaccines[c.id] = S.vaccines[c.id] || {};
    W.VACCINES.forEach(function (v) { if (v.m <= months) S.vaccines[c.id][v.m] = c.dob; });
  }

  /* ---------- timers ---------- */
  function timerOf(c) { return S.timers[c.id] || null; }
  function nextSide(c) {
    var l = lastLog(c, ['breast']);
    if (!l) return 'l';
    var last = l.lastSide || l.side;
    return last === 'l' ? 'r' : last === 'r' ? 'l' : 'l';
  }
  function startTimer(type, side) {
    var c = child(); var now = Date.now();
    if (S.timers[c.id]) return;
    S.timers[c.id] = { type: type, start: now, segs: type === 'breast' ? [{ side: side, start: now }] : [] };
    save();
  }
  function stopTimer(c, cancel) {
    var t = S.timers[c.id]; if (!t) return;
    delete S.timers[c.id];
    if (!cancel) {
      var now = Date.now();
      var minutes = Math.max(1, Math.round((now - t.start) / 60000));
      var entry = { type: t.type, ts: t.start, minutes: minutes };
      if (t.type === 'breast') {
        var per = { l: 0, r: 0 };
        t.segs.forEach(function (s, i) { var e = i < t.segs.length - 1 ? t.segs[i + 1].start : now; per[s.side] += (e - s.start) / 60000; });
        entry.left = Math.round(per.l); entry.right = Math.round(per.r);
        entry.side = per.l && per.r ? 'b' : (per.l ? 'l' : 'r');
        entry.lastSide = t.segs[t.segs.length - 1].side;
      }
      addLog(entry);
      toast('تم حفظ ' + T[t.type].name + ' (' + dur(minutes) + ')', true);
    } else save();
  }
  function timerBanner(c) {
    var t = timerOf(c); if (!t) return '';
    var side = t.type === 'breast' ? t.segs[t.segs.length - 1].side : null;
    return '<section class="timer" aria-label="مؤقت يعمل">' +
      '<div class="head"><b>' + ic(T[t.type].ico) + ' ' + esc(T[t.type].name) + (side ? ' — الثدي ' + SIDE[side] : '') + '</b><span class="small">بدأ ' + fmtTime(t.start) + '</span></div>' +
      '<div class="clock" data-clock="' + t.start + '">' + clock(Date.now() - t.start) + '</div>' +
      '<div class="grid' + (side ? '3' : '2') + '">' +
      (side ? '<button class="btn" data-action="tswitch">' + ic('swap') + 'بدّلي الجهة</button>' : '') +
      '<button class="btn" data-action="tcancel">إلغاء</button>' +
      '<button class="btn stop" data-action="tstop">' + ic('check') + 'إنهاء وحفظ</button></div></section>';
  }

  /* ---------- summaries ---------- */
  function last24(c, type) { var since = Date.now() - 86400000; return childLogs(c, type).filter(function (l) { return l.ts >= since; }); }
  function sumMin(list) { return list.reduce(function (a, l) { return a + (+l.minutes || 0); }, 0); }
  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }
  function summary(c) {
    var t0 = startOfDay(Date.now());
    var week = Date.now() - 7 * 86400000;
    return {
      feeds: last24(c, 'breast').length + last24(c, 'bottle').length,
      sleepMin: sumMin(last24(c, 'sleep')),
      vitd: childLogs(c, 'vitd').some(function (l) { return l.ts >= t0; }),
      _: 0
    };
  }
  function sleepRange(m) { return m < 4 ? [14, 17] : m < 12 ? [12, 16] : m < 36 ? [11, 14] : [10, 13]; }
  function meter(val, goal, cls) { var p = Math.min(100, Math.round(val / goal * 100)); return '<div class="meter ' + (cls || '') + '" role="img" aria-label="' + p + '%"><i style="width:' + p + '%"></i></div>'; }

  function feedAlerts(c, a, sm) {
    var out = [];
    if (a.days <= 42 && c.feeding !== 'formula') {
      var day = a.days + 1;
      var rule = null;
      W.FEED_CHECK.days.forEach(function (r) { if (day >= r.from && day <= r.to) rule = r; });
      var any = last24(c).length > 0;
      if (rule && any) {
        if (sm.feeds < W.FEED_CHECK.feeds && last24(c, 'breast').length + last24(c, 'bottle').length > 0 && a.days >= 1) out.push('عدد الرضعات (' + sm.feeds + ') أقل من 8 في 24 ساعة.');
      }
    }
    if (c.birthWeight && a.days <= 21) {
      var ws = S.growth.filter(function (g) { return g.childId === c.id && g.w; }).sort(function (p, q) { return p.date < q.date ? 1 : -1; });
      if (ws.length) {
        var g = ws[0]; var d = E.daysBetween(c.dob, g.date);
        var loss = (c.birthWeight - g.w * 1000) / c.birthWeight * 100;
        if (loss >= 10) out.push('فقد ' + num(loss, 1) + '% من وزن الولادة — يحتاج تقييم الرضاعة عند الطبيب.');
        else if (d >= 14 && loss > 0) out.push('لم يستعد وزن الولادة بعد عمر أسبوعين — راجعي الطبيب.');
      }
    }
    return out;
  }

  /* ---------- مواعيد الأم والطفل الشخصية ---------- */
  function datesList(c, onlySoon) {
    var t = today(), soon = E.addDays(t, 14);
    return E.motherDates(S.mother, c).filter(function (d) { return d.to >= t && (!onlySoon || d.from <= soon); });
  }
  function datesHtml(list) {
    var t = today();
    return '<ul class="list">' + list.map(function (d) {
      var now = d.from <= t;
      return '<li><span class="ico' + (d.id.indexOf('mchat') === 0 ? '' : ' mom') + '">' + ic('calendar') + '</span><div class="grow"><b>' + esc(d.title) + '</b><div class="small muted">' +
        (d.from === d.to ? esc(fmtDate(d.from)) : 'من ' + esc(fmtDate(d.from)) + ' إلى ' + esc(fmtDate(d.to))) + '</div>' + srcHtml(d.src) + '</div>' + (now ? '<span class="chip warn">الآن</span>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  /* ملف تقويم واحد بكل التذكيرات: التطعيمات، مواعيد الأم والطفل، وفيتامين د اليومي */
  function datesIcs(c) {
    var stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BabyPlan//AR', 'CALSCALE:GREGORIAN'];
    var done = S.vaccines[c.id] || {};
    W.VACCINES.forEach(function (v) {
      var due = E.vaccineDue(c.dob, v.m);
      if (done[v.m] || due < today()) return;
      lines.push('BEGIN:VEVENT', 'UID:' + c.id + '-vax' + v.m + '@babyplan', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + due.replace(/-/g, ''),
        'SUMMARY:تطعيم ' + c.name + ' — ' + v.label, 'DESCRIPTION:' + v.list.join('، ').replace(/[,;]/g, ' '),
        'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:موعد تطعيم غدًا', 'END:VALARM', 'END:VEVENT');
    });
    if (E.ageInfo(c, today()).months < 12 && c.feeding !== 'formula') {
      lines.push('BEGIN:VEVENT', 'UID:vitd-' + c.id + '@babyplan', 'DTSTAMP:' + stamp, 'DTSTART:' + today().replace(/-/g, '') + 'T090000', 'DURATION:PT5M',
        'RRULE:FREQ=DAILY;UNTIL=' + E.addDays(c.dob, 365).replace(/-/g, '') + 'T235959', 'SUMMARY:فيتامين د لـ ' + c.name,
        'DESCRIPTION:400 وحدة دولية يوميًا حتى عمر سنة', 'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:فيتامين د', 'END:VALARM', 'END:VEVENT');
    }
    datesList(c, false).forEach(function (d) {
      lines.push('BEGIN:VEVENT', 'UID:' + c.id + '-' + d.id + '@babyplan', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
        'DTSTART;VALUE=DATE:' + d.from.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + E.addDays(d.to, 1).replace(/-/g, ''), 'SUMMARY:' + d.title,
        'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + d.title, 'END:VALARM', 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /* ---------- onboarding ---------- */
  function vOnboard() {
    return '<section class="card tint"><div class="hero"><div class="art">' + stageArt(0) + '</div><div class="who"><h1>أهلًا بك في "خطة طفلي"</h1>' +
      '<p class="small">تابعي رضاعة طفلك ونومه ونموه وتطعيماته حتى عمر 4 سنوات، بنصائح من جهات معتمدة. بياناتك تبقى على جهازك فقط.</p></div></div></section>' +
      '<form class="card form" data-form="onboard"><div class="head"><h2>الخطوة 1 من 2: طفلك</h2><span class="chip">دقيقة واحدة</span></div>' +
      field('c_name', 'اسم الطفل', '<input id="c_name" name="c_name" required maxlength="40" autocomplete="off">') +
      '<div class="field"><label>الجنس</label>' + choice('c_sex', [['m', 'ذكر'], ['f', 'أنثى']], '') + '</div>' +
      field('c_dob', 'تاريخ الولادة', '<input id="c_dob" name="c_dob" type="date" max="' + today() + '" required>') +
      '<div class="field"><label>الرضاعة الحالية</label>' + choice('c_feed', FEEDING, 'breast') + '</div>' +
      '<button class="btn primary block" type="submit">التالي</button>' +
      '<label class="btn ghost block" style="margin:0">لديك نسخة احتياطية؟ استعيديها<input type="file" accept="application/json,.json" data-action="import" class="sr"></label></form>' + disclaimer();
  }
  function vOnboard2() {
    var c = child();
    return '<section class="card tint"><h1>الخطوة 2 من 2: لنخصص النصائح لك</h1><p class="small">هذه المعلومات تبني مساراتك المخصصة (نوع الولادة، عمرك، عدد الولادات، صحتك وصحة طفلك). يمكنك إكمالها لاحقًا من الإعدادات.</p></section>' +
      '<form class="card form" data-form="onboard2">' + birthFields(c) + '<hr style="border:0;border-top:1px solid var(--line);margin:6px 0">' + motherFields(S.mother) +
      '<label class="check"><input type="checkbox" name="c_vaxdone" checked>أخذ طفلي كل التطعيمات المستحقة حتى اليوم</label>' +
      '<button class="btn primary block" type="submit">حفظ وابدئي</button><button class="btn ghost block" type="button" data-action="skip2">لاحقًا</button></form>';
  }
  function birthFields(c) {
    c = c || {};
    return '<div class="form"><h2>عن الولادة</h2><div class="grid2">' +
      field('c_ga', 'أسبوع الولادة', '<input id="c_ga" name="c_ga" type="number" inputmode="numeric" min="22" max="44" value="' + esc(c.gaWeeks || 40) + '">', 'أقل من 37 = خديج') +
      field('c_bw', 'وزن الولادة (غرام)', '<input id="c_bw" name="c_bw" type="number" inputmode="numeric" min="300" max="7000" value="' + esc(c.birthWeight || '') + '">') + '</div>' +
      field('c_del', 'نوع الولادة', '<select id="c_del" name="c_del">' + opts([['', 'اختاري']].concat(DELIVERY), c.delivery || '') + '</select>') +
      '<label class="check"><input type="checkbox" name="c_multi"' + (c.multiple ? ' checked' : '') + '>ولادة توائم</label>' +
      '<div class="field"><label>حالة الطفل الصحية</label>' + checks('c_cond', CHILD_CONDS, c.conditions) + '</div></div>';
  }
  function profileIncomplete(c) { return !c.delivery || !S.mother.age; }

  /* رسومات بسيطة لوضعية الطفل في كل مرحلة */
  function stageArt(m) {
    /* [رأس x, رأس y, مسار الجسم, مستوى الأرض] */
    var P = m < 3 ? [14, 39, 'M22 41h22M30 41l2-10M38 41l-1-10M44 41l6-9M44 41l10-5', 48] :
      m < 6 ? [44, 30, 'M38 37 16 42M16 42H6M38 37l3 11M33 39l1 9', 49] :
      m < 9 ? [30, 15, 'M30 23v18M30 41l14 3h8M30 28l-8 9M30 28l9 7', 47] :
      m < 12 ? [48, 24, 'M42 30H20M42 30l2 18M20 30l-3 18H8M35 30l2 18', 50] :
      m < 24 ? [32, 11, 'M32 19v20M32 39l-6 17M32 39l6 17M32 25l-9 8M32 25l9 7', 58] :
      [36, 11, 'M34 19l-4 18M30 37l-11 9-3 10M30 37l10 9-1 10M33 25l-10 2M33 25l11 7', 58];
    return '<svg class="pose" viewBox="0 0 64 64" aria-hidden="true"><path class="ground" d="M4 ' + P[3] + 'h56"/><circle cx="' + P[0] + '" cy="' + P[1] + '" r="7"/><path d="' + P[2] + '"/></svg>';
  }

  /* ---------- home ---------- */
  function ageLine(c) {
    var a = E.ageInfo(c, today());
    var s = '<span class="age">' + esc(E.formatAge(a.days)) + '</span>';
    if (a.useCorrected) s += '<span class="chip warn">العمر المصحح: ' + esc(E.formatAge(Math.max(0, a.correctedDays))) + '</span>';
    return s;
  }
  function quickBtn(type, sub2, label) {
    var t = T[type];
    return '<button class="qa' + (t.mom ? ' mom' : '') + '" data-action="addlog" data-type="' + type + '">' + ic(t.ico) + '<span>' + esc(label || t.name) + '</span>' + (sub2 ? '<span class="sub">' + esc(sub2) + '</span>' : '') + '</button>';
  }
  function vHome() {
    var c = child(); var a = E.ageInfo(c, today());
    var stage = E.stageFor(a.devMonths, W.STAGES);
    var sm = summary(c);
    var h = '';
    if (S.children.length > 1) {
      h += '<div class="seg">' + S.children.map(function (k) {
        return '<button class="' + (k.id === c.id ? 'on' : '') + '" data-action="switch" data-id="' + k.id + '">' + esc(k.name) + '</button>';
      }).join('') + '</div>';
    }
    h += timerBanner(c);
    h += '<section class="card tint"><div class="hero"><div class="art">' + stageArt(a.devMonths) + '</div><div class="who"><h2>' + esc(c.name) + '</h2><div class="row">' + ageLine(c) + '</div>' +
      '<div class="row"><span class="chip baby">' + esc(stage.name) + '</span>' + (a.days < 84 ? '<span class="chip mom">الأسبوع ' + (a.weeksPostpartum + 1) + ' بعد الولادة</span>' : '') + '</div></div></div></section>';

    /* quick actions */
    var ns = nextSide(c);
    var feedBtn = c.feeding === 'formula' ? quickBtn('bottle') : quickBtn('breast', 'التالي: ' + SIDE[ns]);
    var vitdNeeded = a.months < 12 && c.feeding !== 'formula';
    var formula = c.feeding === 'formula';
    var want = ['sleep', formula ? null : 'bottle', vitdNeeded ? 'vitd' : null, !isDad() && hasHtn() && a.days < 84 ? 'mom_bp' : null, 'temp', 'med'];
    var used = {}; used[formula ? 'bottle' : 'breast'] = 1;
    var cells = [feedBtn];
    want.forEach(function (k) {
      if (!k || used[k] || cells.length >= 5) return; used[k] = 1;
      cells.push(k === 'vitd' ? quickBtn('vitd', sm.vitd ? 'تم اليوم ✓' : 'لم يُعطَ اليوم') : quickBtn(k));
    });
    cells.push('<button class="qa" data-action="moretypes">' + ic('plus') + '<span>تسجيل آخر</span></button>');
    h += '<section class="card" aria-label="تسجيل سريع"><div class="quick">' + cells.join('') + '</div>';

    /* since last */
    var lf = lastLog(c, ['breast', 'bottle']), ls = lastLog(c, ['sleep']);
    h += '<div class="grid2 since">' +
      '<div class="stat"><span>آخر رضعة</span><b class="small">' + (lf ? ago(lf.ts) : '—') + '</b>' + (lf && lf.type === 'breast' ? '<span>' + SIDE[lf.lastSide || lf.side] + '</span>' : '') + '</div>' +
      '<div class="stat"><span>استيقظ</span><b class="small">' + (timerOf(c) && timerOf(c).type === 'sleep' ? 'نائم الآن' : ls ? ago(endTs(ls)) : '—') + '</b></div>' +
      '</div></section>';

    /* اليوم: سجلات اليوم باختصار */
    var t0 = startOfDay(Date.now());
    var todays = S.logs.filter(function (l) { return (l.childId === c.id || (T[l.type] && T[l.type].mom)) && T[l.type] && l.ts >= t0; }).sort(function (x, y) { return y.ts - x.ts; });
    h += '<section class="card"><div class="head"><h2>اليوم</h2><span class="small muted">' + sm.feeds + ' رضعات · ' + num(sm.sleepMin / 60, 1) + ' س نوم (24 ساعة)</span></div>';
    if (!todays.length) h += '<p class="small muted">لا تسجيل اليوم بعد. اضغطي أي زر أعلاه.</p>';
    else h += '<ul class="list">' + todays.slice(0, 4).map(function (l) {
      var t = T[l.type];
      return '<li><span class="ico' + (t.mom ? ' mom' : '') + '">' + ic(t.ico) + '</span><div class="grow"><b>' + esc(t.name) + '</b> <span class="muted small num">' + fmtTime(l.ts) + '</span><div class="small">' + esc(logDetail(l)) + '</div></div>' +
        '<button class="x" aria-label="تعديل" data-action="editlog" data-id="' + l.id + '">' + ic('edit') + '</button></li>';
    }).join('') + '</ul>';
    h += '<button class="btn sm ghost block" data-action="go" data-view="log">السجل الكامل والرسوم البيانية' + (todays.length > 4 ? ' (+' + (todays.length - 4) + ' اليوم)' : '') + '</button></section>';

    /* الأهم الآن: بطاقة أو اثنتان فقط حسب الأولوية */
    var cards = [];
    feedAlerts(c, a, sm).forEach(function (t) { cards.push('<section class="card warn"><h2>' + ic('alert') + ' انتبهي</h2><p class="small">' + esc(t) + '</p>' + srcHtml(W.FEED_CHECK.src.concat(['weight_loss'])) + '</section>'); });
    if (E.growthTrend(c, S.growth, W.WHO_LMS).alert) cards.push('<section class="card warn"><h2>' + ic('alert') + ' نزل الوزن على المنحنى</h2><p class="small">ناقشي ذلك مع طبيب الطفل.</p><button class="btn sm" data-action="go" data-view="growth" data-sub="measure">التفاصيل</button></section>');
    var nv = E.nextVaccine(c, W.VACCINES, S.vaccines[c.id], today());
    if (nv && (nv.overdue || nv.due <= E.addDays(today(), 7))) cards.push('<section class="card ' + (nv.overdue ? 'warn' : 'tint') + '"><div class="head"><h2>' + ic('calendar') + ' تطعيم ' + esc(nv.v.label) + '</h2>' + (nv.overdue ? '<span class="chip danger">متأخر</span>' : '') + '</div><p class="small">' + esc(fmtDateH(nv.due)) + '</p><button class="btn sm" data-action="go" data-view="care" data-sub="vax">التفاصيل</button></section>');
    datesList(c, true).filter(function (d) { return d.from <= today(); }).forEach(function (d) {
      cards.push('<section class="card mom"><h2>' + ic('calendar') + ' ' + esc(d.title) + '</h2><p class="small">حتى ' + esc(fmtDate(d.to)) + '</p>' + srcHtml(d.src) + '</section>');
    });
    if (a.days <= 42 && c.feeding !== 'formula') {
      var fr = null; W.FEED_CHECK.days.forEach(function (r) { if (a.days + 1 >= r.from && a.days + 1 <= r.to) fr = r; });
      if (fr) cards.push('<section class="card"><h2>' + ic('breast') + ' هل يرضع كفاية اليوم؟</h2><p class="small">' + esc(fr.t) + ' مع 8 رضعات أو أكثر في 24 ساعة.</p>' + srcHtml(W.FEED_CHECK.src) + '</section>');
    }
    var nowTopic = a.days < 14 ? 'screening' : (a.days < 120 ? 'crying' : null);
    var tpObj = nowTopic && (W.TOPICS || []).filter(function (t) { return t.id === nowTopic; })[0];
    if (tpObj) cards.push('<section class="card"><h2>' + ic(tpObj.icon) + ' ' + esc(tpObj.title) + '</h2><p class="small">' + esc(tpObj.intro || '') + '</p><button class="btn sm" data-action="topic" data-id="' + tpObj.id + '">اقرئي النصائح</button></section>');
    var lastCheck = S.checkins.length ? S.checkins[S.checkins.length - 1].date : null;
    if (!isDad() && a.days < 365 && a.days >= 10 && (!lastCheck || E.daysBetween(lastCheck, today()) >= 28)) cards.push('<section class="card mom"><h2>' + ic('heart') + ' كيف حالك أنتِ؟</h2><p class="small">سؤالان قصيران للاطمئنان على صحتك النفسية.</p><button class="btn momb sm" data-action="checkin">ابدئي</button></section>');
    if (profileIncomplete(c)) cards.push('<section class="card mom"><h2>أكملي ملفك</h2><p class="small">أضيفي نوع الولادة وعمرك وحالتك الصحية لتظهر لك نصائح مخصصة.</p><button class="btn momb sm" data-action="complete">إكمال الآن</button></section>');
    if (S.logs.length > 20 && (!S.settings.lastBackup || E.daysBetween(S.settings.lastBackup, today()) > 14)) cards.push('<section class="card warn"><h2>احفظي نسخة احتياطية</h2><p class="small">بياناتك على هذا الجهاز فقط.</p><button class="btn sm" data-action="export">' + ic('download') + 'حفظ نسخة الآن</button></section>');
    h += cards.slice(0, 2).join('');
    if (cards.length > 2) h += '<details class="card fold"><summary class="head"><h2>تنبيهات أخرى (' + (cards.length - 2) + ')</h2></summary><div class="stack">' + cards.slice(2).join('') + '</div></details>';
    if (nv && !(nv.overdue || nv.due <= E.addDays(today(), 7))) h += '<p class="small muted" style="text-align:center">التطعيم القادم: ' + esc(nv.v.label) + ' — ' + esc(fmtDate(nv.due)) + '</p>';
    return h + disclaimer();
  }

  /* ---------- log ---------- */
  function logDetail(l) {
    switch (l.type) {
      case 'breast':
        if (l.left != null || l.right != null) return [l.left ? 'أيسر ' + l.left + ' د' : '', l.right ? 'أيمن ' + l.right + ' د' : ''].filter(Boolean).join(' · ') || dur(l.minutes || 0);
        return (SIDE[l.side] || '') + (l.minutes ? ' — ' + dur(l.minutes) : '');
      case 'bottle': return (l.ml ? l.ml + ' مل' : '') + (l.what ? ' — ' + ({ em: 'حليب أم', fm: 'حليب صناعي', an: 'حليب حيواني' }[l.what] || '') : '');
      case 'sleep': return l.minutes ? dur(l.minutes) + ' (حتى ' + fmtTime(endTs(l)) + ')' : '';
      case 'vitd': return 'تم إعطاء الجرعة';
      case 'temp': return l.c ? l.c + '°' : '';
      case 'med': return (l.name || '') + (l.dose ? ' — ' + l.dose : '');
      case 'mom_bp': return (l.sys || '?') + '/' + (l.dia || '?') + ' ملم زئبق';
    }
    return '';
  }
  /* رسم أعمدة لآخر 7 أيام: الأقدم يمينًا والأحدث يسارًا (اتجاه القراءة العربية)، والرقم فوق كل عمود */
  function barChart(days, series, unit, band, dp) {
    var W2 = 330, H = 150, R = 8, L = 8, B = 30, T2 = 18;
    var max = 1; series.forEach(function (v) { max = Math.max(max, v); }); if (band) max = Math.max(max, band[1]);
    max *= 1.1;
    var n = days.length, bw = (W2 - L - R) / n;
    function X(i) { return W2 - R - (i + 1) * bw; }
    function Y(v) { return T2 + (H - T2 - B) * (1 - v / max); }
    var s = '<svg class="chart" viewBox="0 0 ' + W2 + ' ' + H + '" role="img" aria-label="' + esc(unit) + ' لآخر 7 أيام">';
    if (band) s += '<rect class="okband" x="' + L + '" width="' + (W2 - L - R) + '" y="' + Y(band[1]).toFixed(1) + '" height="' + (Y(band[0]) - Y(band[1])).toFixed(1) + '"/>';
    s += '<line class="axis" x1="' + L + '" x2="' + (W2 - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '"/>';
    days.forEach(function (d, i) {
      var v = series[i], x = X(i) + bw * 0.18, w = bw * 0.64, y = Y(v);
      s += '<rect class="bar' + (i === n - 1 ? ' today' : '') + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(0, H - B - y).toFixed(1) + '" rx="4"/>';
      s += '<text class="val" x="' + (x + w / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle">' + num(v, dp || 0) + '</text>';
      var dt = new Date(d);
      s += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 16) + '" text-anchor="middle">' + (i === n - 1 ? 'اليوم' : dt.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { weekday: 'short' })) + '</text>' +
        '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 3) + '" text-anchor="middle">' + dt.getDate() + '</text>';
    });
    return s + '</svg>' + (band ? '<div class="legend"><span><i style="background:var(--ok-soft)"></i>المدى الموصى به</span></div>' : '');
  }
  /* خط زمني لـ 24 ساعة لكل يوم: النوم كأشرطة والرضعات كنقاط */
  function dayTimeline(c, days) {
    var Wd = 330, rowH = 26, L = 46, R = 6, T0 = 18, H = T0 + days.length * rowH + 6;
    function X(h) { return L + (Wd - L - R) * h / 24; }
    var s = '<svg class="chart" viewBox="0 0 ' + Wd + ' ' + H + '" role="img" aria-label="نمط النوم والرضاعة خلال اليوم">';
    [0, 6, 12, 18, 24].forEach(function (h) { s += '<line class="grid" x1="' + X(h) + '" x2="' + X(h) + '" y1="' + (T0 - 4) + '" y2="' + (H - 4) + '"/><text x="' + X(h) + '" y="11" text-anchor="middle">' + (h === 24 ? '' : pad(h) + ':00') + '</text>'; });
    var sleeps = childLogs(c, 'sleep'), feeds = childLogs(c).filter(function (l) { return l.type === 'breast' || l.type === 'bottle'; });
    days.slice().reverse().forEach(function (d0, r) {
      var y = T0 + r * rowH, d1 = d0 + 86400000;
      s += '<rect class="trow" x="' + L + '" y="' + y + '" width="' + (Wd - L - R) + '" height="' + (rowH - 6) + '" rx="4"/>';
      var dt = new Date(d0);
      s += '<text x="' + (L - 6) + '" y="' + (y + 14) + '" text-anchor="end">' + (r === 0 ? 'اليوم' : dt.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { weekday: 'short' })) + '</text>';
      sleeps.forEach(function (l) {
        var a = Math.max(l.ts, d0), b = Math.min(endTs(l), d1); if (b <= a) return;
        s += '<rect class="tsleep" x="' + X((a - d0) / 3600000).toFixed(1) + '" y="' + (y + 2) + '" width="' + Math.max(1.5, X((b - d0) / 3600000) - X((a - d0) / 3600000)).toFixed(1) + '" height="' + (rowH - 10) + '" rx="3"/>';
      });
      feeds.forEach(function (l) { if (l.ts >= d0 && l.ts < d1) s += '<circle class="tfeed" cx="' + X((l.ts - d0) / 3600000).toFixed(1) + '" cy="' + (y + (rowH - 6) / 2) + '" r="3.2"/>'; });
    });
    return s + '</svg><div class="legend"><span><i style="background:var(--primary)"></i>نوم</span><span><i style="background:var(--mom);border-radius:99px"></i>رضعة</span></div>';
  }
  var LOG_FILTERS = [['all', 'الكل', null], ['feed', 'الرضاعة', ['breast', 'bottle']], ['sleep', 'النوم', ['sleep']], ['health', 'الصحة', ['temp', 'med', 'vitd', 'mom_bp']]];
  function vLog() {
    var c = child();
    var tab = sub.log || 'list';
    var h = timerBanner(c);
    h += '<section class="card"><h2>تسجيل جديد لـ ' + esc(c.name) + '</h2><div class="quick">' +
      Object.keys(T).filter(function (k) { return k !== 'mom_bp' || hasHtn(); }).filter(function (k) { return !T[k].mom || S.settings.caregiver !== 'dad' ; }).map(function (k) { return quickBtn(k); }).join('') + '</div></section>';
    h += seg('log', [['list', 'السجلات'], ['week', 'الأسبوع']], tab);
    if (tab === 'week') {
      var a = E.ageInfo(c, today());
      var days = []; for (var i = 6; i >= 0; i--) days.push(startOfDay(Date.now() - i * 86400000));
      function per(types, fn) { return days.map(function (d) { return fn(childLogs(c).filter(function (l) { return types.indexOf(l.type) >= 0 && l.ts >= d && l.ts < d + 86400000; })); }); }
      var feeds = per(['breast', 'bottle'], function (x) { return x.length; });
      var sleep = per(['sleep'], function (x) { return sumMin(x) / 60; });
      var sr = sleepRange(a.devMonths);
      h += '<section class="card"><h2>نمط اليوم</h2><p class="small muted">كل سطر يوم كامل من منتصف الليل إلى منتصف الليل.</p>' + dayTimeline(c, days) + '</section>' +
        '<section class="card"><h2>الرضعات يوميًا</h2>' + barChart(days, feeds, 'عدد الرضعات', a.days <= 42 ? [8, 12] : null) + '</section>' +
        '<section class="card"><h2>ساعات النوم يوميًا</h2>' + barChart(days, sleep, 'ساعات النوم', sr, 1) + srcHtml(['who_pa_u5']) + '</section>';
      return h;
    }
    var fk = sub.logFilter || 'all';
    var ft = LOG_FILTERS.filter(function (f) { return f[0] === fk; })[0][2];
    h += '<div class="chips" role="group" aria-label="تصفية السجلات">' + LOG_FILTERS.map(function (f) {
      return '<button class="chip' + (f[0] === fk ? ' on' : '') + '" aria-pressed="' + (f[0] === fk) + '" data-action="logfilter" data-val="' + f[0] + '">' + esc(f[1]) + '</button>';
    }).join('') + '</div>';
    var items = S.logs.filter(function (l) { return (l.childId === c.id || (T[l.type] && T[l.type].mom)) && T[l.type] && (!ft || ft.indexOf(l.type) >= 0); })
      .sort(function (x, y) { return y.ts - x.ts; });
    if (!items.length) return h + '<section class="card"><div class="empty">' + ic('log') + '<p>لا توجد سجلات هنا بعد. اضغطي أي زر أعلاه للتسجيل.</p></div></section>';
    var byDay = {}, order = [];
    items.forEach(function (l) { var d = isoDate(new Date(l.ts)); if (!byDay[d]) { byDay[d] = []; order.push(d); } byDay[d].push(l); });
    var showDays = sub.logDays || 3;
    order.slice(0, showDays).forEach(function (d, di) {
      var list = byDay[d];
      var fe = list.filter(function (l) { return l.type === 'breast' || l.type === 'bottle'; }).length;
      var sl = sumMin(list.filter(function (l) { return l.type === 'sleep'; })) / 60;
      var sumBits = [];
      if (fe) sumBits.push(fe + ' رضعات'); if (sl) sumBits.push(num(sl, 1) + ' س نوم');
      if (!sumBits.length) sumBits.push(list.length + ' سجل');
      h += '<details class="card fold"' + (di === 0 ? ' open' : '') + '><summary class="head"><h2>' + (d === today() ? 'اليوم' : esc(fmtDate(d))) + '</h2><span class="small muted">' + esc(sumBits.join(' · ')) + '</span></summary><ul class="list">';
      list.forEach(function (l) {
        var t = T[l.type];
        h += '<li><span class="ico' + (t.mom ? ' mom' : '') + '">' + ic(t.ico) + '</span><div class="grow"><b>' + esc(t.name) + '</b> <span class="muted small num">' + fmtTime(l.ts) + '</span><div class="small">' + esc(logDetail(l)) + '</div></div>' +
          '<button class="x" aria-label="تعديل" data-action="editlog" data-id="' + l.id + '">' + ic('edit') + '</button>' +
          '<button class="x" aria-label="حذف" data-action="dellog" data-id="' + l.id + '">' + ic('trash') + '</button></li>';
      });
      h += '</ul></details>';
    });
    if (order.length > showDays) h += '<button class="btn block" data-action="moredays">عرض أيام أقدم (' + (order.length - showDays) + ')</button>';
    return h;
  }

  function logForm(type, entry) {
    var t = T[type]; var e = entry || {};
    if (type === 'breast' && e.id && e.left == null && e.right == null && e.minutes) {
      e = Object.assign({}, e); if (e.side === 'r') e.right = e.minutes; else if (e.side === 'b') { e.left = Math.round(e.minutes / 2); e.right = e.minutes - e.left; } else e.left = e.minutes;
    }
    var c = child();
    var head = '<div class="head"><h2>' + ic(t.ico) + ' ' + esc(t.name) + '</h2><button type="button" class="x" data-action="close" aria-label="إغلاق">' + ic('x') + '</button></div>';
    var h = '<form class="form" data-form="log" data-type="' + type + '"' + (e.id ? ' data-id="' + e.id + '"' : '') + '>' + head;
    if (t.timer && !e.id && !timerOf(c)) {
      if (type === 'breast') {
        var ns = nextSide(c);
        h += '<p class="small muted">ابدئي المؤقت من الجهة التالية: <b>' + SIDE[ns] + '</b></p><div class="grid2">' +
          '<button type="button" class="btn ' + (ns === 'r' ? 'primary' : '') + '" data-action="tstart" data-type="breast" data-side="r">ابدئي بالأيمن</button>' +
          '<button type="button" class="btn ' + (ns === 'l' ? 'primary' : '') + '" data-action="tstart" data-type="breast" data-side="l">ابدئي بالأيسر</button></div>';
      } else {
        h += '<button type="button" class="btn primary block" data-action="tstart" data-type="' + type + '">' + ic('clock') + 'ابدئي المؤقت الآن</button>';
      }
      h += '<p class="small muted" style="text-align:center">أو سجّلي يدويًا:</p>';
    }
    h += field('l_ts', type === 'sleep' ? 'بداية النوم' : 'الوقت', '<input id="l_ts" name="l_ts" type="datetime-local" value="' + isoLocal(e.ts ? new Date(e.ts) : new Date()) + '" required>');
    switch (type) {
      case 'breast':
        h += '<div class="grid2">' + field('l_left', 'الأيسر (دقائق)', '<input id="l_left" name="l_left" type="number" inputmode="numeric" min="0" max="180" value="' + esc(e.left != null ? e.left : '') + '">') +
          field('l_right', 'الأيمن (دقائق)', '<input id="l_right" name="l_right" type="number" inputmode="numeric" min="0" max="180" value="' + esc(e.right != null ? e.right : '') + '">') + '</div>';
        break;
      case 'bottle':
        h += field('l_ml', 'الكمية (مل)', '<input id="l_ml" name="l_ml" type="number" inputmode="numeric" min="0" max="500" value="' + esc(e.ml || '') + '">') +
          '<div class="field"><label>النوع</label>' + choice('l_what', [['em', 'حليب أم'], ['fm', 'صناعي'], ['an', 'حيواني (بعد سنة)']], e.what || (c.feeding === 'formula' ? 'fm' : 'em')) + '</div>';
        break;
      case 'sleep':
        h += field('l_min', 'المدة (دقائق)', '<input id="l_min" name="l_min" type="number" inputmode="numeric" min="1" max="900" value="' + esc(e.minutes || '') + '" required>');
        h += '<p class="hint">النوم الآمن: على الظهر، سطح صلب، دون وسائد أو بطانيات.</p>';
        break;
      case 'temp':
        h += field('l_c', 'الحرارة (°م)', '<input id="l_c" name="l_c" type="number" inputmode="decimal" step="0.1" min="34" max="43" value="' + esc(e.c || '') + '" required>', W.FEVER.how);
        break;
      case 'med':
        var recentMed = childLogs(c, 'med').filter(function (l) { return l.id !== e.id; }).sort(function (x, y) { return y.ts - x.ts; }).slice(0, 3);
        if (recentMed.length) h += '<div class="card tint"><b class="small">آخر الجرعات</b>' + plainList(recentMed.map(function (l) { return (l.name || 'دواء') + ' — ' + ago(l.ts) + ' (' + fmtTime(l.ts) + ')'; })) + '<p class="hint">لا تعطي جرعة قبل الموعد الذي حدده الطبيب أو النشرة.</p></div>';
        h += field('l_name', 'اسم الدواء', '<input id="l_name" name="l_name" maxlength="60" value="' + esc(e.name || '') + '" required>') +
          field('l_dose', 'الجرعة', '<input id="l_dose" name="l_dose" maxlength="40" value="' + esc(e.dose || '') + '" placeholder="كما وصفها الطبيب أو كما في النشرة">');
        break;
      case 'mom_bp':
        h += '<div class="grid2">' + field('l_sys', 'الانقباضي (العلوي)', '<input id="l_sys" name="l_sys" type="number" inputmode="numeric" min="60" max="260" value="' + esc(e.sys || '') + '" required>') +
          field('l_dia', 'الانبساطي (السفلي)', '<input id="l_dia" name="l_dia" type="number" inputmode="numeric" min="30" max="180" value="' + esc(e.dia || '') + '" required>') + '</div>' +
          '<p class="hint">قيسي وأنتِ جالسة مرتاحة 5 دقائق. 160/110 أو أعلى ← الطوارئ فورًا.</p>';
        break;
    }
    return h + '<button class="btn primary block" type="submit">' + (e.id ? 'حفظ التعديل' : 'حفظ') + '</button></form>';
  }

  /* ---------- growth & development ---------- */
  var IND = { wfa: ['الوزن', 'كغ', 'w'], lhfa: ['الطول', 'سم', 'l'], hcfa: ['محيط الرأس', 'سم', 'hc'] };
  var PCTS = [[-1.8808, '3'], [-1.0364, '15'], [0, '50'], [1.0364, '85'], [1.8808, '97']];
  function devMonthsAt(c, date) { return E.ageInfo(c, date).devMonths; }
  function beforeTerm(c, date) { var a = E.ageInfo(c, date); return a.preterm && a.correctedDays < 0; }

  function chartSvg(c, ind) {
    var a = E.ageInfo(c, today());
    var maxM = a.devMonths < 12 ? 12 : a.devMonths < 24 ? 24 : a.devMonths < 48 ? 48 : 60;
    var table = W.WHO_LMS[ind][c.sex === 'f' ? 'f' : 'm'];
    var key = IND[ind][2];
    var pts = S.growth.filter(function (g) { return g.childId === c.id && g[key] && !beforeTerm(c, g.date); })
      .map(function (g) { return { x: devMonthsAt(c, g.date), y: +g[key] }; })
      .filter(function (p) { return p.x <= maxM + 0.5; }).sort(function (p, q) { return p.x - q.x; });
    var lo = E.valueAtZ(-2.5, table[0]), hi = E.valueAtZ(2.5, table[maxM]);
    pts.forEach(function (p) { lo = Math.min(lo, p.y); hi = Math.max(hi, p.y); });
    var Wd = 340, H = 230, L = 34, R = 18, Tp = 10, B = 26;
    function X(m) { return L + (m / maxM) * (Wd - L - R); }
    function Y(v) { return Tp + (1 - (v - lo) / (hi - lo)) * (H - Tp - B); }
    function curve(z) {
      var d = '';
      for (var m = 0; m <= maxM; m += 0.5) d += (m ? 'L' : 'M') + X(m).toFixed(1) + ' ' + Y(E.valueAtZ(z, E.lmsAt(table, m))).toFixed(1);
      return d;
    }
    var band = curve(-1.8808);
    for (var m = maxM; m >= 0; m -= 0.5) band += 'L' + X(m).toFixed(1) + ' ' + Y(E.valueAtZ(1.8808, E.lmsAt(table, m))).toFixed(1);
    var s = '<svg class="chart" viewBox="0 0 ' + Wd + ' ' + H + '" role="img" aria-label="منحنى ' + IND[ind][0] + '">';
    var ys = 4; for (var i = 0; i <= ys; i++) { var v = lo + (hi - lo) * i / ys; s += '<line class="grid" x1="' + L + '" x2="' + (Wd - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/><text x="' + (L - 4) + '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end">' + num(v, v < 20 ? 1 : 0) + '</text>'; }
    s += '<path class="band" d="' + band + 'Z"/>';
    PCTS.forEach(function (p) { s += '<path class="' + (p[0] === 0 ? 'p50' : 'pline') + '" d="' + curve(p[0]) + '"/><text x="' + (Wd - 2) + '" y="' + (Y(E.valueAtZ(p[0], table[maxM])) + 3).toFixed(1) + '" text-anchor="end">' + p[1] + '</text>'; });
    s += '<line class="axis" x1="' + L + '" y1="' + (H - B) + '" x2="' + (Wd - R) + '" y2="' + (H - B) + '"/>';
    var step = maxM <= 12 ? 2 : maxM <= 24 ? 4 : 6;
    for (var t = 0; t <= maxM; t += step) s += '<text x="' + X(t).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + t + '</text>';
    if (pts.length > 1) s += '<path class="ptline" d="' + pts.map(function (p, j) { return (j ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1); }).join('') + '"/>';
    pts.forEach(function (p) { s += '<circle class="pt" r="4.5" cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '"/>'; });
    s += '</svg><div class="legend"><span><i style="background:var(--primary-soft)"></i>المدى الطبيعي (المئين 3–97)</span><span><i style="background:var(--primary)"></i>المتوسط (50)</span><span><i style="background:var(--mom)"></i>طفلك</span></div>' +
      '<p class="small muted">المحور الأفقي: العمر بالأشهر' + (a.useCorrected ? ' (المصحح)' : '') + '. معايير منظمة الصحة العالمية (' + (c.sex === 'f' ? 'إناث' : 'ذكور') + ').</p>';
    return s;
  }

  function vGrowth() {
    var c = child();
    var tab = sub.growth || 'measure';
    if (tab === 'firsts' || tab === 'teeth') tab = 'measure';
    var h = seg('growth', [['measure', 'القياسات'], ['dev', 'مراحل النمو'], ['play', 'أفكار لعب']], tab);
    if (tab === 'measure') {
      var ind = sub.ind || 'wfa';
      h += '<section class="card"><div class="head"><h2>منحنى النمو</h2><button class="btn primary sm" data-action="addgrowth">' + ic('plus') + 'قياس جديد</button></div>' +
        seg('ind', [['wfa', 'الوزن'], ['lhfa', 'الطول'], ['hcfa', 'محيط الرأس']], ind) + chartSvg(c, ind) + srcHtml(['who_growth']) + '</section>';
      var rows = S.growth.filter(function (g) { return g.childId === c.id; }).sort(function (p, q) { return q.date < p.date ? -1 : 1; });
      var tr = E.growthTrend(c, S.growth, W.WHO_LMS);
      if (tr.alert) h += '<section class="card warn"><h2>' + ic('alert') + ' نزل الوزن على المنحنى</h2><p class="small">نزل وزن ' + esc(c.name) + ' نحو ' + num(tr.spaces, 1) + ' من المسافات بين خطوط المنحنى منذ الولادة. حسب إرشادات NICE، النزول ' + (tr.threshold === 1 ? 'خطًّا واحدًا (لأن الوزن الأساسي منخفض)' : 'خطّين أو أكثر') + ' يستدعي مراجعة الطبيب لتقييم الرضاعة والنمو. هذا ليس تشخيصًا.</p>' + srcHtml(['nice_faltering']) + '</section>';
      if (tr.velocity) h += '<section class="card"><h2>معدل زيادة الوزن</h2><p><b class="num">' + (tr.velocity.gPerDay >= 0 ? '+' : '') + tr.velocity.gPerDay + ' غ يوميًا</b> <span class="small muted">(نحو ' + Math.round(tr.velocity.gPerDay * 7) + ' غ أسبوعيًا، آخر ' + tr.velocity.days + ' يومًا)</span></p><p class="small muted">الزيادة تقل طبيعيًا مع تقدم العمر. الأهم أن يسير الوزن موازيًا لخطوط المنحنى.</p></section>';
      h += '<section class="card"><h2>سجل القياسات</h2>';
      if (!rows.length) h += '<div class="empty">' + ic('growth') + '<p>أضيفي أول قياس من بطاقة المراجعة أو ميزان المنزل.</p></div>';
      else {
        h += '<ul class="list">';
        rows.forEach(function (g) {
          var m = devMonthsAt(c, g.date);
          var pre = beforeTerm(c, g.date);
          function cell(indk, v, unit, label) {
            if (!v) return '';
            var chip = '';
            if (!(m > 60 || pre)) {
              var r = E.growthAssess(indk, c.sex, m, +v, W.WHO_LMS);
              chip = '<span class="chip ' + (r.level === 'ok' ? 'ok' : r.level === 'check' ? 'warn' : 'danger') + '">مئين ' + num(r.percentile, 0) + '</span>';
            }
            return '<div class="gm"><span class="muted">' + label + '</span><b class="num">' + esc(v) + ' ' + unit + '</b>' + chip + '</div>';
          }
          h += '<li><div class="grow"><div class="row"><b>' + esc(new Date(g.date + 'T12:00:00').toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' })) + '</b><span class="small muted">' + (pre ? 'قبل موعد الولادة المتوقع' : 'عمر ' + esc(E.formatAge(Math.round(m * E.DAYS_PER_MONTH)))) + '</span></div>' +
            '<div class="gms">' + cell('wfa', g.w, 'كغ', 'الوزن') + cell('lhfa', g.l, 'سم', 'الطول') + cell('hcfa', g.hc, 'سم', 'الرأس') + '</div></div>' +
            '<button class="x" aria-label="حذف القياس" data-action="delgrowth" data-id="' + g.id + '">' + ic('trash') + '</button></li>';
        });
        h += '</ul>';
      }
      h += '<p class="small muted">المئين 50 = المتوسط. بين 3 و97 غالبًا ضمن الطبيعي. البرتقالي أو الأحمر: ناقشي القياس مع طبيب الطفل. المهم هو اتجاه النمو عبر الزمن.' +
        (E.ageInfo(c, today()).preterm ? ' القياسات قبل موعد الولادة المتوقع (40 أسبوعًا) يقيّمها الطبيب بمنحنيات خاصة بالخدج.' : '') + '</p>' +
        '<p class="small">' + esc(W.FEED_CHECK.weight.t) + '</p>' + srcHtml(W.FEED_CHECK.weight.src) + '</section>';
    } else if (tab === 'dev') {
      h += vMilestones(c);
    } else if (tab === 'play') {
      var a = E.ageInfo(c, today());
      W.PLAY.forEach(function (b) {
        var cur = a.devMonths >= b.from && a.devMonths < b.to;
        h += '<details class="card"' + (cur ? ' open' : '') + '><summary class="head" style="cursor:pointer;list-style:none"><h2>' + esc(bandLabel(b)) + '</h2>' + (cur ? '<span class="chip baby">المرحلة الحالية</span>' : '') + '</summary>' +
          '<ul class="tips">' + b.items.map(function (i) { return '<li><span class="chip">' + esc(W.MILESTONE_AREAS[i.a]) + '</span> ' + esc(i.t) + '</li>'; }).join('') + '</ul>' + srcHtml(b.src) + '</details>';
      });
    }
    return h;
  }
  function bandLabel(b) {
    function f(m) { return m < 12 ? m + ' أشهر' : m === 12 ? 'سنة' : m === 24 ? 'سنتين' : (m / 12) + ' سنوات'; }
    return b.from === 0 ? 'حتى ' + f(b.to) : 'من ' + f(b.from) + ' إلى ' + (b.to >= 60 ? '4 سنوات' : f(b.to));
  }

  function vMilestones(c) {
    var a = E.ageInfo(c, today());
    var done = S.milestones[c.id] || {};
    var h = '<section class="card tint"><h2>مراحل النمو</h2><p class="small">مهارات يبلغها معظم الأطفال (75% أو أكثر) في هذا العمر. ' +
      (a.useCorrected ? 'نستخدم العمر المصحح لأن طفلك وُلد مبكرًا. ' : '') +
      'إذا لم يبلغ طفلك بعضها، أو فقد مهارة كان يتقنها، فتحدثي مع طبيب الطفل مبكرًا ولا تنتظري.</p>' + srcHtml(['cdc_milestones', 'aap_preemie']) + '</section>' +
      '<section class="card warn"><h2>متى أتحدث مع الطبيب فورًا؟</h2>' + plainList(['فقد مهارة كان يتقنها (كلمات، مشي، تواصل) في أي عمر', 'لا يتفاعل مع الأصوات العالية أو لا يلتفت لصوتك', 'لا ينظر في عينيك أو لا يتابع وجهك بعينيه', 'لم يبلغ عدة مهارات من المرحلة السابقة', 'قلقك أنتِ سبب كافٍ؛ أنتِ أعرف الناس بطفلك']) + srcHtml(['cdc_milestones']) + '</section>' +
      (a.devMonths >= 16 && a.devMonths < 31 ? '<section class="card tint"><h2>فحص التوحد المبكر (M-CHAT-R/F)</h2><p class="small">استبيان من 20 سؤالًا تجيبين عنه في نحو 5 دقائق، يُنصح به عند 18 و24 شهرًا. النتيجة لا تشخّص، لكنها تحدد إن كان طفلك يحتاج تقييمًا. خذي النتيجة لطبيب الطفل.</p><a class="btn primary" href="' + esc(W.SOURCES.mchat.url) + '" target="_blank" rel="noopener">افتحي النسخة العربية الرسمية</a>' + srcHtml(['mchat']) + '</section>' : '');
    var cur = null;
    W.MILESTONES.forEach(function (b) { if (b.m <= a.devMonths + 0.01) cur = b.m; });
    W.MILESTONES.forEach(function (b) {
      var isCur = b.m === cur;
      var isNext = cur === null ? b.m === W.MILESTONES[0].m : false;
      var total = 0, got = 0;
      Object.keys(b.items).forEach(function (area) { b.items[area].forEach(function (_, i) { total++; if (done[b.m + '-' + area + '-' + i]) got++; }); });
      var past = b.m < (cur || 0);
      var label = b.m < 12 ? b.m + ' أشهر' : b.m === 12 ? 'سنة' : b.m === 24 ? 'سنتان' : b.m % 12 ? b.m + ' شهرًا' : (b.m / 12) + ' سنوات';
      h += '<details class="card age"' + (isCur || isNext ? ' open' : '') + '><summary><h2>عمر ' + esc(label) + '</h2>' +
        '<span class="chip ' + (got === total ? 'ok' : '') + '">' + got + ' من ' + total + '</span>' + (isCur ? '<span class="chip baby">المرحلة الحالية</span>' : '') + '</summary>';
      ['move', 'social', 'lang', 'cog'].forEach(function (area) {
        h += '<h3>' + esc(W.MILESTONE_AREAS[area]) + '</h3>';
        b.items[area].forEach(function (txt, i) {
          var k = b.m + '-' + area + '-' + i;
          h += '<label class="ms"><input type="checkbox" data-action="ms" data-k="' + k + '"' + (done[k] ? ' checked' : '') + '>' + esc(txt) + '</label>';
        });
      });
      h += '</details>';
    });
    return h;
  }

  /* ---------- guide ---------- */
  function vGuide() {
    var c = child(); var a = E.ageInfo(c, today());
    var who = sub.guide || 'tracks';
    if (who === 'food') who = 'baby';
    if (who === 'safety') who = 'topics';
    var h = '<div class="searchbox">' + ic('book') + '<label for="gsearch" class="sr">ابحثي في الدليل</label><input id="gsearch" type="search" data-action="search" placeholder="ابحثي في الدليل: حرارة، نوم، أسنان…" value="' + esc(sub.q || '') + '" autocomplete="off"></div>' +
      '<section class="card" id="searchResults"' + (sub.q && sub.q.trim().length > 1 ? '' : ' hidden') + '>' + searchHtml(sub.q || '') + '</section>';
    h += seg('guide', [['tracks', 'مساراتك'], ['baby', 'الطفل'], ['mother', 'الأم'], ['topics', 'مواضيع']], who);
    if (who === 'tracks') {
      var tracks = E.buildTracks(S.mother, c, today());
      h += '<section class="card tint"><p class="small">نصائح مختارة لك ولطفلك حسب نوع الولادة وجنس الطفل وعمرك وعدد الولادات وحالتكما الصحية.' + (profileIncomplete(c) ? ' <button class="btn sm momb" data-action="complete">أكملي ملفك لنتائج أدق</button>' : '') + '</p></section>';
      tracks.forEach(function (t, i) {
        h += '<details class="card fold"' + (i === 0 ? ' open' : '') + '><summary class="head"><h2>' + esc(t.title) + '</h2><span class="chip ' + (t.who === 'mother' ? 'mom' : 'baby') + '">' + (t.who === 'mother' ? 'للأم' : 'للطفل') + '</span></summary>' +
          '<p class="small muted">' + esc(t.reason) + '</p>' + tipsHtml(t.tips) + '</details>';
      });
      return h + disclaimer();
    }
    if (who === 'topics') {
      var am = a.devMonths;
      (W.TOPICS || []).forEach(function (tp) {
        var rel = am >= tp.from && am < tp.to;
        h += '<details class="card" id="t-' + tp.id + '"' + (sub.topic === tp.id ? ' open' : '') + '><summary class="head" style="cursor:pointer;list-style:none"><h2>' + ic(tp.icon || 'book') + ' ' + esc(tp.title) + '</h2>' + (rel ? '<span class="chip baby">يناسب عمر طفلك</span>' : '') + '</summary>' +
          (tp.intro ? '<p class="small muted">' + esc(tp.intro) + '</p>' : '') + tipsHtml(tp.tips) + '</details>';
      });
      return h + disclaimer();
    }
    if (who === 'baby') {
      var stageId = sub.stage || E.stageFor(a.devMonths, W.STAGES).id;
      var st = W.STAGES.filter(function (s) { return s.id === stageId; })[0];
      h += '<section class="card">' + field('stagePick', 'المرحلة العمرية', '<select id="stagePick" data-action="stage">' +
        W.STAGES.map(function (s) { return '<option value="' + s.id + '"' + (s.id === stageId ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select>') + '</section>';
      h += '<section class="card"><h2>' + ic('bottle') + ' التغذية</h2>' + tipsHtml(st.feed) + '</section>' +
        '<section class="card"><h2>' + ic('play') + ' الحركة والنشاط</h2>' + tipsHtml(st.move) + '</section>' +
        '<section class="card"><h2>' + ic('moon') + ' النوم</h2>' + tipsHtml(st.sleep) + '</section>' +
        '<section class="card"><h2>' + ic('shield') + ' الرعاية</h2>' + tipsHtml(st.care) + '</section>';
      if (a.devMonths >= 4 && a.devMonths < 36) {
      var al = S.allergens[c.id] || {};
      h += '<section class="card"><h2>إدخال الأطعمة المسببة للحساسية</h2>' + tipsHtml(W.ALLERGY_TIPS) + '</section>';
      h += '<section class="card"><h2>متتبع الأطعمة المسببة للحساسية</h2><p class="small muted">علّمي كل طعام بعد تقديمه أول مرة دون مشاكل.' + ((c.conditions || []).indexOf('eczema') >= 0 ? ' <b>لدى طفلك إكزيما شديدة أو حساسية بيض: استشيري الطبيب قبل الفول السوداني.</b>' : '') + '</p><ul class="list">' +
        W.ALLERGENS.map(function (n, i) {
          var r = al[i];
          return '<li><div class="grow"><b>' + esc(n) + '</b>' + (r ? '<div class="small muted">' + esc(fmtDate(r.date)) + (r.reaction ? ' — <span style="color:var(--danger)">ردة فعل: ' + esc(r.reaction) + '</span>' : ' — دون مشاكل') + '</div>' : '') + '</div>' +
            '<button class="btn sm' + (r ? (r.reaction ? '' : ' primary') : '') + '" data-action="allergen" data-i="' + i + '">' + (r ? 'تعديل' : 'قُدّم') + '</button></li>';
        }).join('') + '</ul></section>';
      }
      if (stageId === 's0' || stageId === 's1') h += '<section class="card"><h2>هل يرضع كفاية؟</h2>' + plainList(W.FEED_CHECK.days.map(function (d) { return d.t; })) + '<h3>راجعي الطبيب إذا:</h3>' + plainList(W.FEED_CHECK.warn) + srcHtml(W.FEED_CHECK.src) + '</section>';
    } else if (who === 'mother') {
      h += '<section class="card"><h2>' + ic('walk') + ' حركتك ونشاطك</h2>' + tipsHtml(W.MOTHER_GENERAL.move) + '</section>' +
        '<section class="card"><h2>' + ic('food') + ' تغذيتك</h2>' + tipsHtml(W.MOTHER_GENERAL.feed) + '</section>' +
        '<section class="card"><h2>' + ic('heart') + ' رعايتك وصحتك النفسية</h2>' + tipsHtml(W.MOTHER_GENERAL.care) + '<button class="btn momb" data-action="checkin">اطمئني على حالتك النفسية</button></section>' +
        '<section class="card"><h2>' + ic('moon') + ' الرضاعة والصيام في رمضان</h2>' + tipsHtml(W.RAMADAN) + '</section>';
      var allDates = datesList(c, false);
      if (allDates.length) h += '<section class="card"><div class="head"><h2>' + ic('calendar') + ' مواعيدك ومواعيد طفلك</h2><button class="btn sm" data-action="icsdates">كل التذكيرات للتقويم</button></div>' + datesHtml(allDates) + '</section>';
    }
    return h + disclaimer();
  }

  /* ---------- care ---------- */
  function vCare() {
    var c = child();
    var tab = sub.care || 'vax';
    if (tab === 'fever') tab = 'danger';
    var h = seg('care', [['vax', 'التطعيمات'], ['danger', 'الطوارئ والحمى'], ['doctor', 'زيارة الطبيب']], tab);
    if (tab === 'vax') {
      var done = S.vaccines[c.id] || {};
      var a = E.ageInfo(c, today());
      h += '<section class="card"><div class="head"><h2>جدول تطعيمات ' + esc(c.name) + '</h2><button class="btn sm" data-action="icsdates">' + ic('calendar') + 'كل التذكيرات للتقويم</button></div><ul class="list">';
      W.VACCINES.forEach(function (v) {
        var due = E.vaccineDue(c.dob, v.m);
        var st = done[v.m] ? ['ok', done[v.m] === c.dob && v.m > 0 ? 'تم' : 'تم ' + fmtDate(done[v.m])] : a.months > v.m + 1 ? ['danger', 'متأخر'] : a.months >= v.m - 0.25 ? ['warn', 'مستحق الآن'] : ['', 'قادم'];
        h += '<li><input type="checkbox" style="width:26px;height:26px;min-height:0;flex:none;accent-color:var(--ok)" aria-label="تم تطعيم ' + esc(v.label) + '" data-action="vax" data-m="' + v.m + '"' + (done[v.m] ? ' checked' : '') + '>' +
          '<div class="grow"><div class="row"><b>' + esc(v.label) + '</b><span class="chip ' + st[0] + '">' + esc(st[1]) + '</span></div><div class="small muted">الموعد: ' + esc(fmtDateH(due)) + '</div><div class="small">' + esc(v.list.join('، ')) + '</div></div></li>';
      });
      h += '</ul></section>';
      h += '<section class="card warn"><h2>ملاحظات مهمة</h2>' + tipsHtml(W.VACCINE_NOTES) + '</section>';
    } else if (tab === 'danger') {
      h += '<section class="card danger"><h2>' + ic('phone') + ' أرقام الطوارئ</h2><div class="grid2"><a class="btn dangerb" href="tel:997">الإسعاف 997</a><a class="btn" href="tel:937">الاستشارة 937</a></div>' +
        '<p class="small">997: الإسعاف (الهلال الأحمر). 937: مركز اتصال وزارة الصحة، مجاني 24 ساعة. والاستشارة الافتراضية عبر تطبيق "صحتي".</p></section>';
      var ageM = E.ageInfo(c, today()).months;
      var temps = childLogs(c, 'temp').sort(function (p, q) { return q.ts - p.ts; }).slice(0, 5);
      h += '<section class="card"><div class="head"><h2>' + ic('thermo') + ' تسجيل الحرارة</h2><button class="btn primary sm" data-action="addlog" data-type="temp">' + ic('plus') + 'قياس</button></div><p class="small">' + esc(W.FEVER.how) + '</p>';
      if (temps.length) h += '<ul class="list">' + temps.map(function (l) { var adv = feverAdvice(ageM, l.c); return '<li><div class="grow"><b class="num">' + esc(l.c) + '°</b> <span class="small muted">' + esc(fmtDate(new Date(l.ts))) + ' ' + fmtTime(l.ts) + '</span>' + (adv ? '<div class="small" style="color:var(--' + (adv.level === 'urgent' ? 'danger' : 'warn') + ')">' + esc(adv.t) + '</div>' : '') + '</div></li>'; }).join('') + '</ul>';
      h += '</section><section class="card"><h2>متى أقلق؟</h2>' + plainList(W.FEVER.rules.map(function (r) { return r.t; })) + '</section>' +
        '<section class="card danger"><h2>علامات خطر مع الحمى — الطوارئ فورًا</h2>' + plainList(W.FEVER.red) + '<p class="small">' + esc(W.FEVER.note) + '</p>' + srcHtml(W.FEVER.src) + '</section>';
      h += '<section class="card"><h2>علامات الخطر لدى الطفل</h2><p class="small"><b>عند أي علامة منها اذهبي للطوارئ أو اتصلي بـ 997.</b></p>' + plainList(W.DANGER_BABY.items) + srcHtml(W.DANGER_BABY.src) + '</section>';
      h += '<section class="card"><h2>علامات الخطر لدى الأم بعد الولادة</h2><p class="small"><b>عند أي علامة منها اذهبي للطوارئ أو اتصلي بـ 997.</b></p>' + plainList(W.DANGER_MOTHER.items) + srcHtml(W.DANGER_MOTHER.src) + '</section>';
      h += '<section class="card"><h2>علامات الحساسية الشديدة</h2>' + tipsHtml(W.ALLERGY_TIPS.slice(3)) + '</section>';
    } else {
      var notes = S.notes.filter(function (n) { return n.childId === c.id; });
      h += '<section class="card"><h2>' + ic('note') + ' أسئلة للطبيب</h2><p class="small muted">اكتبي أي سؤال يخطر لك لتتذكريه في الزيارة القادمة.</p>' +
        '<form class="row" data-form="note"><input name="n_text" id="n_text" maxlength="160" placeholder="مثال: هل الطفح على خده طبيعي؟" aria-label="سؤال جديد" style="flex:1" required><button class="btn primary" type="submit">إضافة</button></form>' +
        (notes.length ? '<ul class="list">' + notes.map(function (n) { return '<li><input type="checkbox" style="width:24px;height:24px;min-height:0;flex:none" aria-label="تمت الإجابة" data-action="notedone" data-id="' + n.id + '"' + (n.done ? ' checked' : '') + '><div class="grow' + (n.done ? ' muted' : '') + '">' + esc(n.text) + '</div><button class="x" aria-label="حذف" data-action="delnote" data-id="' + n.id + '">' + ic('trash') + '</button></li>'; }).join('') + '</ul>' : '') + '</section>';
      h += '<section class="card tint"><h2>' + ic('print') + ' ملخص لزيارة الطبيب</h2><p class="small">صفحة واحدة فيها: العمر، آخر القياسات ونسبها، متوسط الرضاعة والنوم، المهارات غير المحققة، التطعيمات، وأسئلتك.</p><button class="btn primary" data-action="report">عرض الملخص</button></section>';
    }
    return h + disclaimer();
  }
  function feverAdvice(ageM, c) {
    for (var i = 0; i < W.FEVER.rules.length; i++) { var r = W.FEVER.rules[i]; if (ageM < r.maxM && c >= r.temp) return r; }
    return null;
  }

  function reportHtml() {
    var c = child(); var a = E.ageInfo(c, today());
    var days7 = Date.now() - 7 * 86400000;
    var l7 = childLogs(c).filter(function (l) { return l.ts >= days7; });
    var feeds = l7.filter(function (l) { return l.type === 'breast' || l.type === 'bottle'; }).length / 7;
    var sleep = sumMin(l7.filter(function (l) { return l.type === 'sleep'; })) / 60 / 7;
    var g = S.growth.filter(function (x) { return x.childId === c.id; }).sort(function (p, q) { return p.date < q.date ? 1 : -1; })[0];
    var done = S.milestones[c.id] || {};
    var cur = null; W.MILESTONES.forEach(function (b) { if (b.m <= a.devMonths + 0.01) cur = b; });
    var missing = [];
    if (cur) Object.keys(cur.items).forEach(function (ar) { cur.items[ar].forEach(function (t, i) { if (!done[cur.m + '-' + ar + '-' + i]) missing.push(t); }); });
    var vd = S.vaccines[c.id] || {};
    var vax = W.VACCINES.filter(function (v) { return v.m <= a.months; }).map(function (v) { return v.label + ': ' + (vd[v.m] ? 'تم' : 'غير مسجل'); });
    var temps = childLogs(c, 'temp').filter(function (l) { return l.ts >= days7; });
    function gcell(ind, v, u) { if (!v) return '—'; var r = E.growthAssess(ind, c.sex, devMonthsAt(c, g.date), +v, W.WHO_LMS); return esc(v) + ' ' + u + ' (مئين ' + num(r.percentile, 0) + ')'; }
    return '<div class="head noprint"><h2>ملخص لزيارة الطبيب</h2><button type="button" class="x" data-action="close" aria-label="إغلاق">' + ic('x') + '</button></div>' +
      '<div class="card"><h2>' + esc(c.name) + ' — ' + (c.sex === 'f' ? 'أنثى' : 'ذكر') + '</h2><p>تاريخ الولادة: ' + esc(fmtDateH(c.dob)) + ' · العمر: ' + esc(E.formatAge(a.days)) + (a.useCorrected ? ' (المصحح: ' + esc(E.formatAge(Math.max(0, a.correctedDays))) + ')' : '') + '</p>' +
      '<p class="small">أسبوع الولادة: ' + esc(c.gaWeeks) + ' · وزن الولادة: ' + (c.birthWeight ? esc(c.birthWeight) + ' غ' : '—') + ' · الولادة: ' + esc((DELIVERY.filter(function (d) { return d[0] === c.delivery; })[0] || ['', '—'])[1]) + ' · الرضاعة: ' + esc((FEEDING.filter(function (d) { return d[0] === c.feeding; })[0] || ['', '—'])[1]) + '</p></div>' +
      '<div class="card"><h2>آخر قياس' + (g ? ' (' + esc(fmtDate(g.date)) + ')' : '') + '</h2>' + (g && beforeTerm(c, g.date) ? '<p>آخر قياس قبل موعد الولادة المتوقع؛ يقيّمه الطبيب بمنحنيات الخدج.</p>' : g ? '<p>الوزن: ' + gcell('wfa', g.w, 'كغ') + '<br>الطول: ' + gcell('lhfa', g.l, 'سم') + '<br>محيط الرأس: ' + gcell('hcfa', g.hc, 'سم') + '</p>' : '<p class="muted">لا يوجد.</p>') + '</div>' +
      '<div class="card"><h2>متوسط آخر 7 أيام</h2><p>رضعات: ' + num(feeds, 1) + ' يوميًا · نوم: ' + num(sleep, 1) + ' ساعة</p>' + (temps.length ? '<p>قياسات حرارة: ' + temps.map(function (t) { return esc(t.c) + '°'; }).join('، ') + '</p>' : '') + '</div>' +
      '<div class="card"><h2>مهارات لم تُعلَّم بعد في المرحلة الحالية' + (cur ? ' (عمر ' + cur.m + ' شهرًا)' : '') + '</h2>' + (missing.length ? plainList(missing) : '<p class="muted">لا شيء.</p>') + '</div>' +
      '<div class="card"><h2>التطعيمات المستحقة حتى الآن</h2>' + plainList(vax) + '</div>' +
      '<div class="card"><h2>أسئلتي</h2>' + plainList(S.notes.filter(function (n) { return n.childId === c.id && !n.done; }).map(function (n) { return n.text; })) + '</div>' +
      '<button class="btn primary block noprint" data-action="print">' + ic('print') + 'طباعة / حفظ PDF</button>';
  }

  /* ---------- settings ---------- */
  function vSettings() {
    var c = child();
    var tab = sub.settings || 'profile';
    var h = seg('settings', [['profile', 'الملف'], ['children', 'الأطفال'], ['display', 'العرض'], ['data', 'البيانات'], ['sources', 'المصادر']], tab);
    if (tab === 'profile') {
      h += '<form class="card" data-form="mother">' + motherFields(S.mother) + '<button class="btn primary block" type="submit">حفظ معلوماتي</button></form>';
      h += '<form class="card" data-form="child" data-id="' + c.id + '">' + childFields(c) + '<button class="btn primary block" type="submit">حفظ معلومات ' + esc(c.name) + '</button></form>';
    } else if (tab === 'children') {
      h += '<section class="card"><h2>أطفالك</h2><ul class="list">' + S.children.map(function (k) {
        return '<li><span class="ico">' + ic('child') + '</span><div class="grow"><b>' + esc(k.name) + '</b><div class="small muted">' + esc(E.formatAge(E.ageInfo(k, today()).days)) + '</div></div>' +
          (k.id === S.activeId ? '<span class="chip baby">الحالي</span>' : '<button class="btn sm" data-action="switch" data-id="' + k.id + '">اختيار</button>') +
          (S.children.length > 1 ? '<button class="x" aria-label="حذف ' + esc(k.name) + '" data-action="delchild" data-id="' + k.id + '">' + ic('trash') + '</button>' : '') + '</li>';
      }).join('') + '</ul></section>';
      h += '<form class="card" data-form="newchild"><h2>إضافة طفل</h2>' + childFields(null, true) + '<button class="btn primary block" type="submit">إضافة</button></form>';
    } else if (tab === 'display') {
      var st = S.settings;
      h += '<section class="card"><h2>المظهر</h2>' + choice('theme', [['', 'تلقائي'], ['light', 'فاتح'], ['dark', 'داكن'], ['night', 'ليلي دافئ']], st.theme || '') +
        '<label class="check"><input type="checkbox" data-action="autonight"' + (st.autoNight ? ' checked' : '') + '>الوضع الليلي الدافئ تلقائيًا من 10 مساءً إلى 6 صباحًا</label>' +
        '<p class="hint">الوضع الليلي إضاءة خافتة دافئة تريح العين وقت الرضعات الليلية.</p></section>' +
        '<section class="card"><h2>حجم الخط</h2>' + choice('size', [['', 'عادي'], ['l', 'كبير'], ['xl', 'كبير جدًا']], st.size || '') + '</section>' +
        '<section class="card"><h2>من يستخدم التطبيق على هذا الجهاز؟</h2>' + choice('caregiver', [['mom', 'الأم'], ['dad', 'الأب']], st.caregiver || 'mom') + '<p class="hint">في وضع الأب تختفي بطاقات صحة الأم من الصفحة الرئيسية، وتبقى كل نصائح الطفل.</p></section>' +
        '<section class="card"><h2>التاريخ</h2><label class="check"><input type="checkbox" data-action="hijri"' + (st.hijri !== false ? ' checked' : '') + '>إظهار التاريخ الهجري بجانب الميلادي</label></section>';
    } else if (tab === 'data') {
      h += '<section class="card"><h2>خصوصيتك</h2><p>كل بياناتك محفوظة على هذا الجهاز فقط ولا تُرسل إلى أي خادم. إذا مُسحت بيانات المتصفح ستُحذف، لذا احفظي نسخة احتياطية بانتظام.</p>' +
        (S.settings.lastBackup ? '<p class="small muted">آخر نسخة: ' + esc(fmtDate(S.settings.lastBackup)) + '</p>' : '') +
        '<div class="grid2"><button class="btn" data-action="export">' + ic('download') + 'حفظ نسخة</button><label class="btn" style="margin:0">استعادة نسخة<input type="file" accept="application/json,.json" data-action="import" class="sr"></label></div>' +
        '<p class="hint">لمشاركة السجل مع زوجك أو جهاز آخر: احفظي نسخة وأرسليها له، ثم يستعيدها من هنا.</p></section>' +
        ((S.firsts || []).some(function (f) { return f.photo; }) ? '<section class="card"><h2>صور اللحظات الأولى المحفوظة</h2><p class="small">أزلنا دفتر اللحظات الأولى لتبسيط التطبيق. صورك ما زالت على هذا الجهاز؛ نزّليها لتحفظيها في جوالك.</p><button class="btn" data-action="savephotos">' + ic('download') + 'تنزيل الصور</button></section>' : '') +
        '<section class="card danger"><h2>حذف كل البيانات</h2><p class="small">لا يمكن التراجع عن هذا.</p><button class="btn dangerb" data-action="wipe">حذف كل البيانات</button></section>';
    } else {
      h += '<section class="card"><h2>المصادر المعتمدة</h2><p class="small muted">يعتمد التطبيق على جهات رسمية وعلمية فقط. تاريخ المراجعة بجانب كل مصدر.</p><ul class="list">' +
        Object.keys(W.SOURCES).map(function (k) {
          var s = W.SOURCES[k];
          return '<li><div class="grow"><b>' + esc(s.org) + '</b><div><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a></div><div class="small muted">رُوجع: ' + esc(s.checked) + '</div></div></li>';
        }).join('') + '</ul></section>';
    }
    return h + disclaimer();
  }

  /* ---------- render ---------- */
  var TITLES = { home: 'خطة طفلي', log: 'السجل', growth: 'النمو والتطور', guide: 'الدليل', care: 'الرعاية', settings: 'الإعدادات' };
  function applyDisplay() {
    var st = S.settings || {};
    var th = st.theme || '';
    if (st.autoNight) { var hr = new Date().getHours(); if (hr >= 22 || hr < 6) th = 'night'; }
    if (th) document.documentElement.setAttribute('data-theme', th); else document.documentElement.removeAttribute('data-theme');
    if (st.size) document.documentElement.setAttribute('data-size', st.size); else document.documentElement.removeAttribute('data-size');
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#ffffff');
  }
  var formDirty = false;
  document.addEventListener('input', function (e) {
    if (e.target.getAttribute('data-action') === 'search') {
      sub.q = e.target.value; var box = document.getElementById('searchResults');
      box.innerHTML = searchHtml(sub.q); box.hidden = sub.q.trim().length < 2; return;
    }
    if (e.target.closest('#app form')) formDirty = true;
  });
  function canAutoRender() {
    var a = document.activeElement;
    return !formDirty && !(sub.q && view === 'guide') && !document.getElementById('modal').innerHTML && !(a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName));
  }
  function render(keepScroll) {
    var app = document.getElementById('app');
    var tabs = document.getElementById('tabs');
    var y = window.scrollY;
    var openState = keepScroll ? [].map.call(app.querySelectorAll('details'), function (d) { return d.open; }) : null;
    formDirty = false;
    if (!S.children.length || S.settings.needsProfile) {
      if (S.children.length && !child()) S.activeId = S.children[0].id;
      app.innerHTML = S.children.length ? vOnboard2() : vOnboard();
      tabs.hidden = true;
      return;
    }
    tabs.hidden = false;
    if (!child() || !S.activeId) S.activeId = S.children[0].id;
    var fn = { home: vHome, log: vLog, growth: vGrowth, guide: vGuide, care: vCare, settings: vSettings }[view] || vHome;
    app.innerHTML = fn();
    document.getElementById('topTitle').textContent = TITLES[view] || 'خطة طفلي';
    document.title = (view === 'home' ? '' : TITLES[view] + ' — ') + 'خطة طفلي';
    [].forEach.call(tabs.querySelectorAll('button'), function (b) {
      var on = b.getAttribute('data-view') === (view === 'log' ? 'home' : view);
      b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    loadPhotos();
    if (openState) {
      var ds = app.querySelectorAll('details');
      if (ds.length === openState.length) [].forEach.call(ds, function (d, i) { d.open = openState[i]; });
      window.scrollTo(0, y);
    }
  }
  var returnFocus = null;
  function openModal(html) {
    if (!document.getElementById('modal').innerHTML) returnFocus = document.activeElement;
    document.getElementById('modal').innerHTML = '<div class="modal-bg" data-action="bg"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mtitle">' + html + '</div></div>';
    var hd = document.querySelector('#modal h2');
    if (hd) { hd.id = 'mtitle'; hd.setAttribute('tabindex', '-1'); hd.focus({ preventScroll: true }); }
  }
  function closeModal() {
    var had = !!document.getElementById('modal').innerHTML;
    document.getElementById('modal').innerHTML = '';
    if (had && returnFocus && document.body.contains(returnFocus)) { try { returnFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    returnFocus = null;
  }

  function addLog(entry) {
    entry.id = W.Store.uid();
    entry.childId = child().id;
    S.logs.push(entry); save(); W.Store.persist();
    try { if (navigator.vibrate) navigator.vibrate(18); } catch (e) { /* ignore */ }
    undoId = entry.id;
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------- events ---------- */
  var pendingConfirm = null;
  var pendingImport = null;
  function confirmSheet(msg, okLabel, fn) {
    pendingConfirm = fn;
    openModal('<h2>' + esc(msg) + '</h2><div class="grid2"><button class="btn" data-action="close">إلغاء</button><button class="btn dangerb" data-action="confirmok">' + esc(okLabel) + '</button></div>');
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var act = el.getAttribute('data-action');
    if (act === 'bg' && e.target !== el) return;
    var c = child();
    switch (act) {
      case 'go':
        e.preventDefault();
        if (!S.children.length) return;
        view = el.getAttribute('data-view');
        if (el.getAttribute('data-sub')) sub[view] = el.getAttribute('data-sub');
        closeModal(); render(); window.scrollTo(0, 0); break;
      case 'sub': sub[el.getAttribute('data-key')] = el.getAttribute('data-val'); render(true); break;
      case 'switch': S.activeId = el.getAttribute('data-id'); sub.stage = null; save(); render(); break;
      case 'addlog': {
        var type = el.getAttribute('data-type');
        if (type === 'vitd') { addLog({ type: 'vitd', ts: Date.now() }); toast('تم تسجيل فيتامين د', true); render(true); break; }
        if (T[type].timer && timerOf(c) && timerOf(c).type === type) { window.scrollTo(0, 0); break; }
        openModal(logForm(type)); break;
      }
      case 'editlog': {
        var en = S.logs.filter(function (l) { return l.id === el.getAttribute('data-id'); })[0];
        if (en) openModal(logForm(en.type, en)); break;
      }
      case 'dellog': {
        var id = el.getAttribute('data-id');
        confirmSheet('حذف هذا السجل؟', 'حذف', function () { S.logs = S.logs.filter(function (l) { return l.id !== id; }); save(); render(true); });
        break;
      }
      case 'undo':
        if (undoId) { S.logs = S.logs.filter(function (l) { return l.id !== undoId; }); undoId = null; save(); render(true); document.getElementById('toast').hidden = true; }
        break;
      case 'tstart': startTimer(el.getAttribute('data-type'), el.getAttribute('data-side')); closeModal(); render(); window.scrollTo(0, 0); break;
      case 'tswitch': {
        var t = timerOf(c); if (!t) break;
        var now = Date.now(); var lastS = t.segs[t.segs.length - 1].side;
        t.segs.push({ side: lastS === 'l' ? 'r' : 'l', start: now }); save(); render(true); break;
      }
      case 'tstop': stopTimer(c, false); render(true); break;
      case 'tcancel': confirmSheet('إلغاء المؤقت دون حفظ؟', 'إلغاء المؤقت', function () { stopTimer(c, true); render(true); }); break;
      case 'addgrowth':
        openModal('<form class="form" data-form="growth"><div class="head"><h2>قياس جديد</h2><button type="button" class="x" data-action="close" aria-label="إغلاق">' + ic('x') + '</button></div>' +
          field('g_date', 'التاريخ', '<input id="g_date" name="g_date" type="date" max="' + today() + '" min="' + esc(c.dob) + '" value="' + today() + '" required>') +
          '<div class="grid3">' + field('g_w', 'الوزن (كغ)', '<input id="g_w" name="g_w" type="number" inputmode="decimal" step="0.01" min="0.3" max="40">') +
          field('g_l', 'الطول (سم)', '<input id="g_l" name="g_l" type="number" inputmode="decimal" step="0.1" min="25" max="130">') +
          field('g_hc', 'الرأس (سم)', '<input id="g_hc" name="g_hc" type="number" inputmode="decimal" step="0.1" min="20" max="60">') + '</div>' +
          '<button class="btn primary block" type="submit">حفظ</button></form>');
        break;
      case 'delgrowth': {
        var gid = el.getAttribute('data-id');
        confirmSheet('حذف هذا القياس؟', 'حذف', function () { S.growth = S.growth.filter(function (g) { return g.id !== gid; }); save(); render(true); });
        break;
      }
      case 'close': case 'bg': closeModal(); break;
      case 'confirmok': { var fn = pendingConfirm; pendingConfirm = null; closeModal(); if (fn) fn(); break; }
      case 'delchild': {
        var cid = el.getAttribute('data-id');
        confirmSheet('حذف هذا الطفل وكل سجلاته؟', 'حذف', function () {
          S.children = S.children.filter(function (k) { return k.id !== cid; });
          S.logs = S.logs.filter(function (l) { return l.childId !== cid || (T[l.type] && T[l.type].mom); });
          S.growth = S.growth.filter(function (g) { return g.childId !== cid; });
          ['milestones', 'vaccines', 'timers', 'allergens', 'teeth', 'play'].forEach(function (k) { delete S[k][cid]; });
          S.notes = S.notes.filter(function (n) { return n.childId !== cid; });
          if (S.activeId === cid) S.activeId = S.children[0] && S.children[0].id;
          save(); render();
        });
        break;
      }
      case 'export':
        download('baby-plan-backup-' + today() + '.json', JSON.stringify(S, null, 2), 'application/json');
        S.settings.lastBackup = today(); save(); toast('تم حفظ النسخة الاحتياطية'); render(true);
        break;
      case 'wipe': confirmSheet('حذف كل البيانات من هذا الجهاز؟', 'حذف الكل', function () { S = W.Store.empty(); save(); view = 'home'; render(); }); break;
      case 'allergen': {
        var ai = +el.getAttribute('data-i'); var r = (S.allergens[c.id] || {})[ai] || {};
        openModal('<form class="form" data-form="allergen" data-i="' + ai + '"><div class="head"><h2>' + esc(W.ALLERGENS[ai]) + '</h2><button type="button" class="x" data-action="close" aria-label="إغلاق">' + ic('x') + '</button></div>' +
          field('a_date', 'تاريخ أول تقديم', '<input id="a_date" name="a_date" type="date" max="' + today() + '" value="' + esc(r.date || today()) + '" required>') +
          field('a_reaction', 'ردة فعل (اتركيه فارغًا إن لم تظهر)', '<input id="a_reaction" name="a_reaction" maxlength="100" value="' + esc(r.reaction || '') + '">') +
          '<div class="grid2">' + (r.date ? '<button type="button" class="btn" data-action="allergenclear" data-i="' + ai + '">مسح</button>' : '<span></span>') + '<button class="btn primary" type="submit">حفظ</button></div></form>');
        break;
      }
      case 'allergenclear': { delete (S.allergens[c.id] || {})[el.getAttribute('data-i')]; save(); closeModal(); render(true); break; }
      case 'checkin':
        openModal('<form class="form" data-form="checkin"><div class="head"><h2>كيف حالك؟</h2><button type="button" class="x" data-action="close" aria-label="إغلاق">' + ic('x') + '</button></div>' +
          W.WHOOLEY.q.map(function (q, i) { return '<div class="field"><label>' + esc(q) + '</label>' + choice('w' + i, [['1', 'نعم'], ['0', 'لا']], '') + '</div>'; }).join('') +
          '<div class="field"><label>' + esc(W.WHOOLEY.help) + '</label>' + choice('wh', [['1', 'نعم'], ['0', 'لا']], '') + '</div>' +
          '<p class="hint">إجاباتك تبقى على جهازك فقط.</p>' + srcHtml(W.WHOOLEY.src) + '<button class="btn momb block" type="submit">عرض النتيجة</button></form>');
        break;
      case 'notedone': break;
      case 'delnote': { var nid = el.getAttribute('data-id'); S.notes = S.notes.filter(function (n) { return n.id !== nid; }); save(); render(true); break; }
      case 'report': openModal(reportHtml()); break;
      case 'importmerge': {
        if (!pendingImport) break;
        var res = W.Store.merge(S, pendingImport); S = res.state; pendingImport = null; save(); closeModal(); applyDisplay(); render();
        toast('تم الدمج: ' + res.added.logs + ' سجل، ' + res.added.growth + ' قياس، ' + res.added.children + ' طفل جديد');
        break;
      }
      case 'importreplace': {
        var d = pendingImport; pendingImport = null; closeModal();
        if (d) confirmSheet('سيتم حذف بياناتك الحالية واستبدالها. متأكدة؟', 'استبدال', function () { S = W.Store.migrate(d); save(); view = 'home'; applyDisplay(); render(); toast('تمت استعادة النسخة'); });
        break;
      }
      case 'topic': view = 'guide'; sub.guide = 'topics'; sub.topic = el.getAttribute('data-id'); render(); var te = document.getElementById('t-' + sub.topic); if (te) te.scrollIntoView(); break;
      case 'logfilter': sub.logFilter = el.getAttribute('data-val'); sub.logDays = 3; render(true); break;
      case 'moredays': sub.logDays = (sub.logDays || 3) + 7; render(true); break;
      case 'icsdates': download('tadhkeerat-' + c.name + '.ics', datesIcs(c), 'text/calendar'); toast('افتحي الملف لإضافة كل التذكيرات إلى تقويمك'); break;
      case 'savephotos':
        (S.firsts || []).filter(function (f) { return f.photo; }).forEach(function (f, i) {
          Photos.get(f.id).then(function (b) { if (!b) return; setTimeout(function () { var u = URL.createObjectURL(b); var ln = document.createElement('a'); ln.href = u; ln.download = (f.title || 'photo') + '-' + f.date + '.jpg'; document.body.appendChild(ln); ln.click(); setTimeout(function () { URL.revokeObjectURL(u); ln.remove(); }, 1500); }, i * 400); });
        });
        break;
      case 'moretypes':
        openModal('<div class="head"><h2>ماذا تريدين تسجيله؟</h2><button type="button" class="x" data-action="close" aria-label="إغلاق">' + ic('x') + '</button></div><div class="quick">' +
          Object.keys(T).filter(function (k) { return k !== 'mom_bp' || hasHtn(); }).map(function (k) { return quickBtn(k); }).join('') + '</div>');
        break;
      case 'reloadapp': location.reload(); break;
      case 'skip2': S.settings.needsProfile = false; save(); view = 'home'; render(); break;
      case 'complete': view = 'settings'; sub.settings = 'profile'; render(); window.scrollTo(0, 0); break;
      case 'homecard': { var k2 = el.getAttribute('data-k'); S.settings.homeCards = S.settings.homeCards || {}; S.settings.homeCards[k2] = S.settings.homeCards[k2] === false; save(); render(true); break; }
      case 'hijri': S.settings.hijri = S.settings.hijri === false; save(); render(true); break;
      case 'print': window.print(); break;
    }
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    var act = el.getAttribute('data-action');
    var c = child();
    if (el.name === 'theme' && view === 'settings') { S.settings.theme = el.value; save(); applyDisplay(); return; }
    if (el.name === 'caregiver' && view === 'settings') { S.settings.caregiver = el.value; save(); toast('تم الحفظ'); return; }
    if (el.name === 'size' && view === 'settings') { S.settings.size = el.value; save(); applyDisplay(); return; }
    if (act === 'autonight') { S.settings.autoNight = el.checked; save(); applyDisplay(); return; }
    if (act === 'ms') {
      S.milestones[c.id] = S.milestones[c.id] || {};
      if (el.checked) S.milestones[c.id][el.getAttribute('data-k')] = today(); else delete S.milestones[c.id][el.getAttribute('data-k')];
      var msTxt = el.closest('label') ? el.closest('label').textContent.trim() : '';
      save(); render(true);
      if (el.checked) toast('رائع! ' + c.name + ': ' + msTxt);
    } else if (act === 'vax') {
      S.vaccines[c.id] = S.vaccines[c.id] || {};
      if (el.checked) S.vaccines[c.id][el.getAttribute('data-m')] = today(); else delete S.vaccines[c.id][el.getAttribute('data-m')];
      save(); render(true);
    } else if (act === 'notedone') {
      S.notes.forEach(function (n) { if (n.id === el.getAttribute('data-id')) n.done = el.checked; }); save(); render(true);
    } else if (act === 'stage') {
      sub.stage = el.value; render(true);
    } else if (act === 'import' && el.files && el.files[0]) {
      var r = new FileReader();
      r.onload = function () {
        try {
          var data = JSON.parse(r.result);
          if (!data || !Array.isArray(data.children) || !Array.isArray(data.logs)) throw new Error('bad');
          pendingImport = data;
          if (!S.children.length) { S = W.Store.migrate(data); S.settings.needsProfile = false; save(); view = 'home'; applyDisplay(); render(); toast('تمت استعادة النسخة'); return; }
          openModal('<h2>ماذا تريدين أن تفعلي بهذه النسخة؟</h2><p class="small">الدمج يضيف السجلات الجديدة من الجهاز الآخر (مثل جوال زوجك) دون حذف أي شيء. الاستبدال يمسح بياناتك الحالية.</p>' +
            '<button class="btn primary block" data-action="importmerge">دمج مع بياناتي (موصى به)</button><button class="btn block" data-action="importreplace">استبدال بياناتي</button><button class="btn ghost block" data-action="close">إلغاء</button>');
        } catch (err) { toast('الملف غير صالح. اختاري ملف نسخة احتياطية من هذا التطبيق.'); }
      };
      r.readAsText(el.files[0]);
      el.value = '';
    }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target; var kind = f.getAttribute('data-form');
    if (!kind) return;
    e.preventDefault();
    var c = child();
    if ((kind === 'onboard' || kind === 'newchild' || kind === 'child') && !radio(f, 'c_sex')) { toast('اختاري جنس الطفل'); return; }
    if (kind === 'onboard') {
      var nc = { id: W.Store.uid(), name: f.c_name.value.trim(), sex: radio(f, 'c_sex'), dob: f.c_dob.value, gaWeeks: 40, birthWeight: null, delivery: '', feeding: radio(f, 'c_feed') || 'breast', multiple: false, conditions: [] };
      S.children.push(nc); S.activeId = nc.id; S.settings.needsProfile = true; save(); W.Store.persist(); view = 'home'; render(); window.scrollTo(0, 0);
    } else if (kind === 'onboard2') {
      var c2 = child();
      c2.gaWeeks = +f.c_ga.value || 40; c2.birthWeight = f.c_bw.value ? +f.c_bw.value : null; c2.delivery = f.c_del.value; c2.multiple = f.c_multi.checked;
      c2.conditions = [].slice.call(f.querySelectorAll('input[name=c_cond]:checked')).map(function (i) { return i.value; });
      if (f.m_age.value) S.mother = readMother(f);
      if (f.c_vaxdone.checked) markPastVaccines(c2);
      S.settings.needsProfile = false; save(); view = 'home'; render(); window.scrollTo(0, 0);
    } else if (kind === 'mother') {
      S.mother = readMother(f); save(); toast('تم الحفظ'); render(true);
    } else if (kind === 'child') {
      var id = f.getAttribute('data-id');
      S.children = S.children.map(function (k) { return k.id === id ? readChild(f, k) : k; }); save(); toast('تم الحفظ'); render(true);
    } else if (kind === 'newchild') {
      var n = readChild(f); S.children.push(n); S.activeId = n.id; if (f.c_vaxdone && f.c_vaxdone.checked) markPastVaccines(n); save(); view = 'home'; render();
    } else if (kind === 'log') {
      var type = f.getAttribute('data-type'); var editId = f.getAttribute('data-id');
      var entry = { type: type, ts: new Date(f.l_ts.value).getTime() || Date.now() };
      if (f.l_left || f.l_right) {
        var lv = f.l_left.value === '' ? null : +f.l_left.value, rv = f.l_right.value === '' ? null : +f.l_right.value;
        entry.left = lv; entry.right = rv; entry.minutes = (lv || 0) + (rv || 0);
        entry.side = lv && rv ? 'b' : rv ? 'r' : 'l'; entry.lastSide = rv && !lv ? 'r' : lv && !rv ? 'l' : (editId ? (S.logs.filter(function (l) { return l.id === editId; })[0] || {}).lastSide || 'r' : 'r');
      }
      if (f.l_min && f.l_min.value) entry.minutes = +f.l_min.value;
      if (f.l_ml && f.l_ml.value) entry.ml = +f.l_ml.value;
      if (f.querySelector('[name=l_what]')) entry.what = radio(f, 'l_what');
      if (f.querySelector('[name=l_side]')) entry.side = radio(f, 'l_side');
      if (f.l_food) entry.food = f.l_food.value.trim();
      if (f.l_reaction && f.l_reaction.value.trim()) entry.reaction = f.l_reaction.value.trim();
      if (f.l_note && f.l_note.value) entry.note = f.l_note.value.trim();
      if (f.l_c) entry.c = +f.l_c.value;
      if (f.l_sys) { entry.sys = +f.l_sys.value; entry.dia = +f.l_dia.value; }
      if (f.l_name) { entry.name = f.l_name.value.trim(); entry.dose = f.l_dose.value.trim(); }
      closeModal();
      if (editId) {
        S.logs = S.logs.map(function (l) { if (l.id !== editId) return l; entry.id = l.id; entry.childId = l.childId; return entry; });
        save(); toast('تم حفظ التعديل');
      } else {
        addLog(entry);
        var adv = type === 'temp' ? feverAdvice(E.ageInfo(c, today()).months, entry.c) : null;
        if (type === 'mom_bp') adv = entry.sys >= 160 || entry.dia >= 110 ? { level: 'urgent', t: 'ضغطك ' + entry.sys + '/' + entry.dia + ': اذهبي للطوارئ فورًا أو اتصلي بـ 997.' } : entry.sys >= 140 || entry.dia >= 90 ? { level: 'watch', t: 'ضغطك مرتفع (' + entry.sys + '/' + entry.dia + '). تواصلي مع طبيبتك اليوم.' } : null;
        if (adv && adv.level === 'urgent') {
          openModal('<div class="card danger"><h2>' + ic('alert') + ' ' + esc(adv.t) + '</h2><div class="grid2"><a class="btn dangerb" href="tel:997">الإسعاف 997</a><button class="btn" data-action="close">حسنًا</button></div><p class="small">رقم الإسعاف: 997</p>' + srcHtml(type === 'mom_bp' ? ['acog_postpartum'] : W.FEVER.src) + '</div>');
        } else toast(adv ? adv.t : 'تم الحفظ', !adv);
      }
      render(true);
    } else if (kind === 'growth') {
      var g = { id: W.Store.uid(), childId: c.id, date: f.g_date.value, w: f.g_w.value ? +f.g_w.value : null, l: f.g_l.value ? +f.g_l.value : null, hc: f.g_hc.value ? +f.g_hc.value : null };
      if (!g.w && !g.l && !g.hc) { toast('أدخلي قياسًا واحدًا على الأقل'); return; }
      S.growth.push(g); save(); closeModal(); toast('تم حفظ القياس'); render(true);
    } else if (kind === 'note') {
      S.notes.push({ id: W.Store.uid(), childId: c.id, text: f.n_text.value.trim(), done: false, ts: Date.now() }); save(); render(true);
    } else if (kind === 'allergen') {
      S.allergens[c.id] = S.allergens[c.id] || {};
      S.allergens[c.id][f.getAttribute('data-i')] = { date: f.a_date.value, reaction: f.a_reaction.value.trim() };
      save(); closeModal(); render(true);
    } else if (kind === 'checkin') {
      var a1 = radio(f, 'w0'), a2 = radio(f, 'w1'), hp = radio(f, 'wh');
      if (a1 === '' || a2 === '') { toast('أجيبي عن السؤالين'); return; }
      S.checkins.push({ date: today(), a1: +a1, a2: +a2, help: hp === '1' }); save();
      var pos = a1 === '1' || a2 === '1';
      openModal('<div class="head"><h2>شكرًا لكِ</h2><button type="button" class="x" data-action="close" aria-label="إغلاق">' + ic('x') + '</button></div>' +
        (pos ? '<div class="card mom"><p><b>إجاباتك تشير إلى أنك قد تمرّين بفترة صعبة.</b> هذا شائع بعد الولادة وله علاج فعّال.</p><p>تحدثي مع طبيبتك أو في المراجعة القادمة، واطلبي تقييمًا للاكتئاب بعد الولادة. للاستشارة الآن: 937 (مجاني 24 ساعة).</p><p class="small">إذا راودتك أفكار بإيذاء نفسك أو طفلك فاتصلي بـ 997 فورًا.</p></div>'
          : '<div class="card ok"><p>إجاباتك لا تشير إلى اكتئاب الآن. اعتني بنومك وتغذيتك واطلبي الدعم عند الحاجة. سنذكّرك بالاطمئنان بعد 4 أسابيع.</p></div>') +
        srcHtml(W.WHOOLEY.src));
      render(true);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab' && document.getElementById('modal').innerHTML) {
      var f = document.querySelectorAll('#modal button, #modal input, #modal select, #modal a[href], #modal [tabindex="-1"]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* تحديث ساعات المؤقت كل ثانية دون إعادة الرسم */
  setInterval(function () {
    [].forEach.call(document.querySelectorAll('[data-clock]'), function (el) { el.textContent = clock(Date.now() - +el.getAttribute('data-clock')); });
  }, 1000);
  /* أعد الرسم كل دقيقة لتحديث "منذ آخر مرة" والوضع الليلي التلقائي */
  setInterval(function () { if (S.children.length && canAutoRender()) { applyDisplay(); render(true); } }, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && canAutoRender()) { S = W.Store.load(); applyDisplay(); render(true); } });

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline support optional */ });
    /* نسخة جديدة نُزّلت في الخلفية: ستعمل عند الفتح القادم، أو فورًا بالضغط على "تحديث" */
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController) return;
      var t = document.getElementById('toast');
      t.hidden = false;
      t.innerHTML = 'يتوفر تحديث جديد للتطبيق <button class="btn sm ghost" style="color:inherit;min-height:32px" data-action="reloadapp">تحديث الآن</button>';
    });
  }
  applyDisplay();
  render();
  /* اختصارات أيقونة التطبيق: ?do=breast مثلًا */
  (function () {
    var m = /[?&]do=([a-z_]+)/.exec(location.search);
    if (!m || !S.children.length || S.settings.needsProfile || !T[m[1]]) return;
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ }
    var c0 = child();
    if (m[1] === 'breast' && !timerOf(c0)) { var sd = nextSide(c0); startTimer('breast', sd); render(); toast('بدأ مؤقت الرضاعة — الثدي ' + SIDE[sd]); }
    else if (m[1] === 'sleep' && !timerOf(c0)) { startTimer('sleep'); render(); toast('بدأ مؤقت النوم'); }
    else openModal(logForm(m[1]));
  })();
  /* ما الجديد بعد التحديث (لا يظهر في أول استخدام) */
  if (S.children.length && S.settings.seenVersion !== APP_VERSION) {
    var firstRun = !S.settings.seenVersion && S.logs.length === 0;
    S.settings.seenVersion = APP_VERSION; save();
    if (!firstRun && !document.getElementById('modal').innerHTML) openModal('<div class="head"><h2>ما الجديد في هذا التحديث</h2><button type="button" class="x" data-action="close" aria-label="إغلاق">' + ic('x') + '</button></div>' + plainList(WHATS_NEW) + '<button class="btn primary block" data-action="close">حسنًا</button>');
  }
})();
