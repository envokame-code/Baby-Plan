/* واجهة التطبيق. App UI (vanilla JS, no build step). */
(function () {
  'use strict';
  var E = window.Engine;
  var S = window.Store.load();
  var view = 'home';
  var sub = {};

  var MOTHER_CONDS = [
    ['gdm', 'سكر الحمل'], ['htn', 'ارتفاع الضغط / تسمم الحمل'], ['anemia', 'فقر الدم'],
    ['thyroid', 'اضطراب الغدة الدرقية'], ['depression', 'اكتئاب أو قلق (سابق أو حالي)'],
    ['obesity', 'زيادة الوزن'], ['smoking', 'تدخين في المنزل']
  ];
  var CHILD_CONDS = [['nicu', 'دخل العناية المركزة لحديثي الولادة'], ['jaundice', 'أصيب باليرقان'], ['circumcised', 'تم الختان (للذكور)']];
  var DELIVERY = [['vaginal', 'طبيعية'], ['assisted', 'طبيعية بمساعدة (شفط / ملقط)'], ['cs_planned', 'قيصرية مخطط لها'], ['cs_emergency', 'قيصرية طارئة']];
  var FEEDING = [['breast', 'رضاعة طبيعية'], ['formula', 'حليب صناعي'], ['mixed', 'مختلطة']];
  var LOG_TYPES = {
    breast: { ico: '🤱', name: 'رضاعة طبيعية' },
    bottle: { ico: '🍼', name: 'رضّاعة' },
    solid: { ico: '🥣', name: 'طعام' },
    sleep: { ico: '😴', name: 'نوم' },
    diaper: { ico: '🧷', name: 'حفاض' },
    tummy: { ico: '🧸', name: 'وقت البطن / لعب نشط' },
    vitd: { ico: '☀️', name: 'فيتامين د' },
    mom_move: { ico: '🚶‍♀️', name: 'نشاط الأم' },
    mom_mood: { ico: '💗', name: 'مزاج الأم' }
  };

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoDate(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function isoLocal(d) { d = d || new Date(); return isoDate(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fmtTime(ts) { var d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fmtDate(d) {
    if (typeof d === 'string') d = new Date(d.length === 10 ? d + 'T00:00:00' : d);
    return d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  function num(v, dp) { return (Math.round(v * Math.pow(10, dp || 0)) / Math.pow(10, dp || 0)).toString(); }
  function save() { window.Store.save(S); }
  function child() {
    for (var i = 0; i < S.children.length; i++) if (S.children[i].id === S.activeId) return S.children[i];
    return S.children[0] || null;
  }
  function today() { return isoDate(); }
  function srcHtml(ids) {
    if (!ids || !ids.length) return '';
    return '<div class="src">المصدر: ' + ids.map(function (id) {
      var s = window.SOURCES[id];
      if (!s) return '';
      return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.org) + ' — ' + esc(s.title) + '</a>';
    }).join(' · ') + '</div>';
  }
  function tipsHtml(tips) {
    return '<ul class="tips">' + tips.map(function (t) {
      return '<li>' + esc(t.t) + srcHtml(t.src) + '</li>';
    }).join('') + '</ul>';
  }
  function seg(key, options, current) {
    return '<div class="seg" role="tablist">' + options.map(function (o) {
      return '<button role="tab" aria-selected="' + (o[0] === current) + '" class="' + (o[0] === current ? 'on' : '') +
        '" data-action="sub" data-key="' + key + '" data-val="' + o[0] + '">' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function opts(list, val) {
    return list.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === val ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');
  }
  function checks(name, list, vals) {
    vals = vals || [];
    return '<div class="checks">' + list.map(function (o) {
      return '<label class="check"><input type="checkbox" name="' + name + '" value="' + o[0] + '"' + (vals.indexOf(o[0]) >= 0 ? ' checked' : '') + '>' + esc(o[1]) + '</label>';
    }).join('') + '</div>';
  }
  function disclaimer() {
    return '<p class="disclaimer">هذا التطبيق للتثقيف والمتابعة فقط ولا يغني عن الطبيب. في الطوارئ اتصلي 997، وللاستشارة 937.</p>';
  }

  /* ---------- forms: profile ---------- */
  function motherFields(m) {
    m = m || {};
    return '<h2>معلومات الأم</h2>' +
      '<label for="m_age">عمرك (بالسنوات)</label><input id="m_age" name="m_age" type="number" inputmode="numeric" min="12" max="60" value="' + esc(m.age || '') + '" required>' +
      '<label for="m_parity">رقم هذه الولادة (1 = الطفل الأول)</label><input id="m_parity" name="m_parity" type="number" inputmode="numeric" min="1" max="20" value="' + esc(m.parity || 1) + '" required>' +
      '<label for="m_int">الفاصل عن الولادة السابقة بالأشهر (اتركيه فارغًا إن كان الطفل الأول)</label><input id="m_int" name="m_int" type="number" inputmode="numeric" min="0" max="300" value="' + esc(m.prevIntervalMonths == null ? '' : m.prevIntervalMonths) + '">' +
      '<label>حالتك الصحية (اختاري ما ينطبق)</label>' + checks('m_cond', MOTHER_CONDS, m.conditions);
  }
  function childFields(c) {
    c = c || {};
    return '<h2>معلومات الطفل</h2>' +
      '<label for="c_name">اسم الطفل</label><input id="c_name" name="c_name" value="' + esc(c.name || '') + '" required maxlength="40">' +
      '<label for="c_sex">الجنس</label><select id="c_sex" name="c_sex" required>' + opts([['', 'اختاري'], ['m', 'ذكر'], ['f', 'أنثى']], c.sex || '') + '</select>' +
      '<label for="c_dob">تاريخ الولادة</label><input id="c_dob" name="c_dob" type="date" max="' + today() + '" value="' + esc(c.dob || '') + '" required>' +
      '<label for="c_ga">عمر الحمل عند الولادة (بالأسابيع)</label><input id="c_ga" name="c_ga" type="number" inputmode="numeric" min="22" max="44" value="' + esc(c.gaWeeks || 40) + '" required>' +
      '<label for="c_bw">وزن الولادة (بالغرام)</label><input id="c_bw" name="c_bw" type="number" inputmode="numeric" min="300" max="7000" value="' + esc(c.birthWeight || '') + '">' +
      '<label for="c_del">نوع الولادة</label><select id="c_del" name="c_del" required>' + opts([['', 'اختاري']].concat(DELIVERY), c.delivery || '') + '</select>' +
      '<label for="c_feed">نوع الرضاعة الحالية</label><select id="c_feed" name="c_feed">' + opts(FEEDING, c.feeding || 'breast') + '</select>' +
      '<label class="check" style="margin-top:10px"><input type="checkbox" name="c_multi"' + (c.multiple ? ' checked' : '') + '>ولادة توائم</label>' +
      '<label>حالة الطفل الصحية</label>' + checks('c_cond', CHILD_CONDS, c.conditions) +
      (c.id ? '' : '<label class="check" style="margin-top:10px"><input type="checkbox" name="c_vaxdone" checked>أخذ طفلي كل التطعيمات المستحقة حتى اليوم</label>');
  }
  function markPastVaccines(c) {
    var months = E.ageInfo(c, today()).months;
    S.vaccines[c.id] = S.vaccines[c.id] || {};
    window.VACCINES.forEach(function (v) { if (v.m <= months) S.vaccines[c.id][v.m] = c.dob; });
  }
  function readMother(f) {
    var iv = f.m_int.value.trim();
    return {
      age: +f.m_age.value, parity: +f.m_parity.value || 1,
      prevIntervalMonths: iv === '' ? null : +iv,
      conditions: [].slice.call(f.querySelectorAll('input[name=m_cond]:checked')).map(function (i) { return i.value; })
    };
  }
  function readChild(f, base) {
    var c = base || { id: window.Store.uid() };
    c.name = f.c_name.value.trim(); c.sex = f.c_sex.value; c.dob = f.c_dob.value;
    c.gaWeeks = +f.c_ga.value || 40; c.birthWeight = f.c_bw.value ? +f.c_bw.value : null;
    c.delivery = f.c_del.value; c.feeding = f.c_feed.value; c.multiple = f.c_multi.checked;
    c.conditions = [].slice.call(f.querySelectorAll('input[name=c_cond]:checked')).map(function (i) { return i.value; });
    return c;
  }

  /* ---------- views ---------- */
  function vOnboard() {
    return '<div class="card soft"><h1>أهلًا بك في "خطة طفلي"</h1>' +
      '<p>تطبيق يساعدك على متابعة تغذية طفلك وحركته ونموه ورعايته من الولادة حتى 4 سنوات، مع مسارات مخصصة لك حسب نوع الولادة وجنس الطفل وعمرك وعدد الولادات وحالتك الصحية.</p>' +
      '<p class="muted">كل النصائح من مصادر معتمدة (منظمة الصحة العالمية، وزارة الصحة السعودية، CDC، AAP، NHS، ACOG) مع رابط المصدر. بياناتك تبقى على جهازك فقط.</p></div>' +
      '<form class="card" data-form="onboard">' + motherFields(S.mother) + '<hr style="border:0;border-top:1px solid var(--line);margin:18px 0">' + childFields() +
      '<button class="btn primary block" style="margin-top:16px" type="submit">ابدئي</button></form>' + disclaimer();
  }

  function last24(type, c) {
    var since = Date.now() - 86400000;
    return S.logs.filter(function (l) { return l.childId === c.id && (!type || l.type === type) && l.ts >= since; });
  }
  function summary(c) {
    var feeds = last24('breast', c).length + last24('bottle', c).length;
    var wet = last24('diaper', c).filter(function (l) { return l.kind !== 'dirty'; }).length;
    var sleepMin = last24('sleep', c).reduce(function (a, l) { return a + (+l.minutes || 0); }, 0);
    var t0 = new Date(); t0.setHours(0, 0, 0, 0);
    var tummy = S.logs.filter(function (l) { return l.childId === c.id && l.type === 'tummy' && l.ts >= t0.getTime(); })
      .reduce(function (a, l) { return a + (+l.minutes || 0); }, 0);
    var vitd = S.logs.some(function (l) { return l.childId === c.id && l.type === 'vitd' && l.ts >= t0.getTime(); });
    var week = Date.now() - 7 * 86400000;
    var momMin = S.logs.filter(function (l) { return l.type === 'mom_move' && l.ts >= week; }).reduce(function (a, l) { return a + (+l.minutes || 0); }, 0);
    return { feeds: feeds, wet: wet, sleepH: sleepMin / 60, tummy: tummy, vitd: vitd, momMin: momMin };
  }

  function ageLine(c) {
    var a = E.ageInfo(c, today());
    var s = '<b>' + esc(E.formatAge(a.days)) + '</b>';
    if (a.useCorrected) s += ' <span class="chip warn">العمر المصحح: ' + esc(E.formatAge(Math.max(0, a.correctedDays))) + '</span>';
    return s;
  }

  function vHome() {
    var c = child(); var a = E.ageInfo(c, today());
    var stage = E.stageFor(a.devMonths, window.STAGES);
    var sm = summary(c);
    var tracks = E.buildTracks(S.mother, c, today());
    var nv = E.nextVaccine(c, window.VACCINES, S.vaccines[c.id], today());
    var h = '';
    if (S.children.length > 1) {
      h += '<div class="seg">' + S.children.map(function (k) {
        return '<button class="' + (k.id === c.id ? 'on' : '') + '" data-action="switch" data-id="' + k.id + '">' + esc(k.name) + '</button>';
      }).join('') + '</div>';
    }
    h += '<div class="card soft"><div class="row between"><h1>' + (c.sex === 'f' ? '👧 ' : '👦 ') + esc(c.name) + '</h1><span class="chip brand">' + esc(stage.name) + '</span></div>' +
      '<p>العمر: ' + ageLine(c) + '</p>' +
      (a.days < 84 ? '<p class="small muted">أنتِ في الأسبوع ' + (a.weeksPostpartum + 1) + ' بعد الولادة.</p>' : '') + '</div>';

    var vitdNeeded = a.months < 12 && c.feeding !== 'formula';
    h += '<div class="card"><div class="row between"><h2>آخر 24 ساعة</h2><button class="btn" data-action="go" data-view="log">+ تسجيل</button></div>' +
      '<div class="grid3">' +
      '<div class="stat"><b>' + sm.feeds + '</b><span>رضعات</span></div>' +
      '<div class="stat"><b>' + sm.wet + '</b><span>حفاضات مبللة</span></div>' +
      '<div class="stat"><b>' + num(sm.sleepH, 1) + '</b><span>ساعات نوم</span></div>' +
      '<div class="stat"><b>' + sm.tummy + '</b><span>دقائق نشاط اليوم</span></div>' +
      '<div class="stat"><b>' + sm.momMin + '<small>/150</small></b><span>دقائق نشاطك هذا الأسبوع</span></div>' +
      (vitdNeeded ? '<div class="stat"><b>' + (sm.vitd ? '✅' : '—') + '</b><span>فيتامين د اليوم</span></div>' : '<div class="stat"><b>' + S.growth.filter(function (g) { return g.childId === c.id; }).length + '</b><span>قياسات نمو</span></div>') +
      '</div>' +
      (a.days >= 5 && a.days < 42 && sm.wet < 6 && last24('diaper', c).length > 0 ? '<p class="small" style="margin-top:8px">💡 بعد اليوم الخامس، 6 حفاضات مبللة أو أكثر يوميًا علامة على كفاية الرضاعة. إذا كانت أقل باستمرار فراجعي الطبيب.</p>' : '') +
      '</div>';

    if (nv) {
      h += '<div class="card ' + (nv.overdue ? 'warn' : 'accent') + '"><div class="row between"><h2>💉 التطعيم القادم</h2>' +
        (nv.overdue ? '<span class="chip danger">متأخر</span>' : '') + '</div>' +
        '<p><b>' + esc(nv.v.label) + '</b> — ' + esc(fmtDate(nv.due)) + '</p><p class="small">' + esc(nv.v.list.join('، ')) + '</p>' +
        '<button class="btn" data-action="go" data-view="care" data-sub="vax">عرض الجدول</button></div>';
    }

    h += '<div class="card"><h2>🧭 مساراتك المخصصة</h2><p class="small muted">مبنية على ملفك وملف طفلك. اضغطي على أي مسار لعرض النصائح.</p>';
    tracks.forEach(function (t, i) {
      h += '<details class="track"' + (i === 0 ? ' open' : '') + '><summary><span class="chip ' + (t.who === 'mother' ? 'brand' : 'accent') + '">' +
        (t.who === 'mother' ? 'للأم' : 'للطفل') + '</span>' + esc(t.title) + '</summary>' +
        '<p class="small muted">' + esc(t.reason) + '</p>' + tipsHtml(t.tips) + '</details>';
    });
    h += '</div>';

    h += '<div class="card"><h2>📘 أهم ما في هذه المرحلة</h2>' +
      tipsHtml([stage.feed[0], stage.move[0], stage.sleep[stage.sleep.length - 1]]) +
      '<button class="btn" data-action="go" data-view="guide">الدليل الكامل</button></div>';
    return h + disclaimer();
  }

  /* ---------- log ---------- */
  function vLog() {
    var c = child();
    var h = '<div class="card"><h1>تسجيل سريع</h1><p class="small muted">لـ ' + esc(c.name) + '</p><div class="quick">';
    Object.keys(LOG_TYPES).forEach(function (k) {
      h += '<button class="btn" data-action="addlog" data-type="' + k + '">' + LOG_TYPES[k].ico + ' ' + esc(LOG_TYPES[k].name) + '</button>';
    });
    h += '</div></div>';
    var items = S.logs.filter(function (l) { return l.childId === c.id || l.type.indexOf('mom_') === 0; })
      .sort(function (a, b) { return b.ts - a.ts; }).slice(0, 60);
    h += '<div class="card"><h2>آخر السجلات</h2>';
    if (!items.length) h += '<p class="muted">لا توجد سجلات بعد. ابدئي بالأزرار أعلاه.</p>';
    else {
      var lastDay = '';
      h += '<ul class="list">';
      items.forEach(function (l) {
        var d = isoDate(new Date(l.ts));
        if (d !== lastDay) { h += '<li><b class="small muted">' + esc(fmtDate(d)) + '</b></li>'; lastDay = d; }
        h += '<li><span>' + LOG_TYPES[l.type].ico + '</span><div class="grow"><b>' + esc(LOG_TYPES[l.type].name) + '</b> <span class="muted small">' + fmtTime(l.ts) + '</span><div class="small">' + esc(logDetail(l)) + '</div></div>' +
          '<button class="x" aria-label="حذف" data-action="dellog" data-id="' + l.id + '">✕</button></li>';
      });
      h += '</ul>';
    }
    return h + '</div>';
  }
  function logDetail(l) {
    switch (l.type) {
      case 'breast': return ({ r: 'الثدي الأيمن', l: 'الثدي الأيسر', b: 'كلاهما' }[l.side] || '') + (l.minutes ? ' — ' + l.minutes + ' دقيقة' : '');
      case 'bottle': return (l.ml ? l.ml + ' مل' : '') + (l.what ? ' — ' + ({ em: 'حليب أم', fm: 'حليب صناعي', an: 'حليب حيواني' }[l.what] || '') : '');
      case 'solid': return l.food || '';
      case 'sleep': return (l.minutes ? num(l.minutes / 60, 1) + ' ساعة' : '');
      case 'diaper': return { wet: 'مبلل', dirty: 'براز', both: 'مبلل وبراز' }[l.kind] || '';
      case 'tummy': case 'mom_move': return (l.minutes || 0) + ' دقيقة' + (l.note ? ' — ' + l.note : '');
      case 'vitd': return 'تم إعطاء الجرعة';
      case 'mom_mood': return ['', '😞 صعب جدًا', '🙁 صعب', '😐 متوسط', '🙂 جيد', '😊 ممتاز'][l.mood || 3] + (l.note ? ' — ' + l.note : '');
    }
    return '';
  }
  function logForm(type) {
    var t = LOG_TYPES[type];
    var h = '<form data-form="log" data-type="' + type + '"><div class="row between"><h2>' + t.ico + ' ' + esc(t.name) + '</h2><button type="button" class="x" data-action="close" aria-label="إغلاق">✕</button></div>' +
      '<label for="l_ts">الوقت</label><input id="l_ts" name="l_ts" type="datetime-local" value="' + isoLocal() + '" required>';
    switch (type) {
      case 'breast':
        h += '<label for="l_side">الثدي</label><select id="l_side" name="l_side">' + opts([['l', 'الأيسر'], ['r', 'الأيمن'], ['b', 'كلاهما']], 'l') + '</select>' +
          '<label for="l_min">المدة بالدقائق (اختياري)</label><input id="l_min" name="l_min" type="number" inputmode="numeric" min="0" max="180">';
        break;
      case 'bottle':
        h += '<label for="l_ml">الكمية (مل)</label><input id="l_ml" name="l_ml" type="number" inputmode="numeric" min="0" max="500">' +
          '<label for="l_what">النوع</label><select id="l_what" name="l_what">' + opts([['em', 'حليب أم مشفوط'], ['fm', 'حليب صناعي'], ['an', 'حليب حيواني (بعد سنة)']], 'em') + '</select>';
        break;
      case 'solid':
        h += '<label for="l_food">ماذا أكل؟</label><input id="l_food" name="l_food" maxlength="120" placeholder="مثال: هريس عدس مع جزر">' +
          '<p class="small muted">قبل عمر سنة: لا عسل، لا ملح أو سكر مضاف، لا حليب بقر كمشروب رئيسي.</p>';
        break;
      case 'sleep':
        h += '<label for="l_min">مدة النوم بالدقائق</label><input id="l_min" name="l_min" type="number" inputmode="numeric" min="1" max="900" required>' +
          '<p class="small muted">تذكير: النوم على الظهر، سطح صلب، دون وسائد أو بطانيات.</p>';
        break;
      case 'diaper':
        h += '<label for="l_kind">النوع</label><select id="l_kind" name="l_kind">' + opts([['wet', 'مبلل'], ['dirty', 'براز'], ['both', 'كلاهما']], 'wet') + '</select>';
        break;
      case 'tummy':
      case 'mom_move':
        h += '<label for="l_min">المدة بالدقائق</label><input id="l_min" name="l_min" type="number" inputmode="numeric" min="1" max="600" required>' +
          '<label for="l_note">ملاحظة (اختياري)</label><input id="l_note" name="l_note" maxlength="80" placeholder="' + (type === 'tummy' ? 'مثال: على البطن، لعب أرضي' : 'مثال: مشي، تمارين قاع الحوض') + '">';
        break;
      case 'mom_mood':
        h += '<label for="l_mood">كيف تشعرين اليوم؟</label><select id="l_mood" name="l_mood">' + opts([['5', '😊 ممتاز'], ['4', '🙂 جيد'], ['3', '😐 متوسط'], ['2', '🙁 صعب'], ['1', '😞 صعب جدًا']], '3') + '</select>' +
          '<label for="l_note">ملاحظة (اختياري)</label><input id="l_note" name="l_note" maxlength="120">' +
          '<p class="small muted">إذا استمر الحزن أو القلق أكثر من أسبوعين فاطلبي المساعدة (937). أفكار إيذاء النفس ← 997 فورًا.</p>';
        break;
    }
    return h + '<button class="btn primary block" style="margin-top:14px" type="submit">حفظ</button></form>';
  }

  /* ---------- growth & development ---------- */
  var IND = { wfa: ['الوزن', 'كغ', 'w'], lhfa: ['الطول', 'سم', 'l'], hcfa: ['محيط الرأس', 'سم', 'hc'] };
  var PCTS = [[-1.8808, '3'], [-1.0364, '15'], [0, '50'], [1.0364, '85'], [1.8808, '97']];

  function devMonthsAt(c, date) { return E.ageInfo(c, date).devMonths; }
  /* قبل موعد الولادة المتوقع (40 أسبوعًا) لا تنطبق معايير WHO؛ يقيّم الطبيب بمنحنيات الخدج. */
  function beforeTerm(c, date) { var a = E.ageInfo(c, date); return a.preterm && a.correctedDays < 0; }

  function chartSvg(c, ind) {
    var a = E.ageInfo(c, today());
    var maxM = a.devMonths < 12 ? 12 : a.devMonths < 24 ? 24 : 48;
    var table = window.WHO_LMS[ind][c.sex === 'f' ? 'f' : 'm'];
    var key = IND[ind][2];
    var pts = S.growth.filter(function (g) { return g.childId === c.id && g[key] && !beforeTerm(c, g.date); })
      .map(function (g) { return { x: devMonthsAt(c, g.date), y: +g[key] }; })
      .filter(function (p) { return p.x <= maxM + 0.5; }).sort(function (p, q) { return p.x - q.x; });
    var lo = E.valueAtZ(-2.5, table[0]), hi = E.valueAtZ(2.5, table[maxM]);
    pts.forEach(function (p) { lo = Math.min(lo, p.y); hi = Math.max(hi, p.y); });
    var W = 340, H = 220, L = 34, R = 10, T = 10, B = 26;
    function X(m) { return L + (m / maxM) * (W - L - R); }
    function Y(v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); }
    function curve(z) {
      var d = '';
      for (var m = 0; m <= maxM; m += 0.5) d += (m ? 'L' : 'M') + X(m).toFixed(1) + ' ' + Y(E.valueAtZ(z, E.lmsAt(table, m))).toFixed(1);
      return d;
    }
    var band = curve(-1.8808);
    for (var m = maxM; m >= 0; m -= 0.5) band += 'L' + X(m).toFixed(1) + ' ' + Y(E.valueAtZ(1.8808, E.lmsAt(table, m))).toFixed(1);
    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="منحنى ' + IND[ind][0] + '">';
    s += '<path class="band" d="' + band + 'Z"/>';
    PCTS.forEach(function (p) { s += '<path class="' + (p[0] === 0 ? 'p50' : 'pline') + '" d="' + curve(p[0]) + '"/>'; s += '<text x="' + (W - R - 2) + '" y="' + (Y(E.valueAtZ(p[0], table[maxM])) - 2).toFixed(1) + '" text-anchor="end">' + p[1] + '</text>'; });
    s += '<line class="axis" x1="' + L + '" y1="' + (H - B) + '" x2="' + (W - R) + '" y2="' + (H - B) + '"/>';
    var step = maxM <= 12 ? 2 : maxM <= 24 ? 4 : 6;
    for (var t = 0; t <= maxM; t += step) s += '<text x="' + X(t).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + t + '</text>';
    var ys = 4; for (var i = 0; i <= ys; i++) { var v = lo + (hi - lo) * i / ys; s += '<text x="' + (L - 4) + '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end">' + num(v, v < 20 ? 1 : 0) + '</text>'; }
    if (pts.length > 1) s += '<path class="ptline" d="' + pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1); }).join('') + '"/>';
    pts.forEach(function (p) { s += '<circle class="pt" r="4" cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '"/>'; });
    s += '</svg><p class="small muted">المحور الأفقي: العمر بالأشهر' + (a.useCorrected ? ' (المصحح)' : '') + '. الخطوط: المئين 3، 15، 50، 85، 97 حسب معايير منظمة الصحة العالمية (' + (c.sex === 'f' ? 'إناث' : 'ذكور') + ').</p>';
    return s;
  }

  function vGrowth() {
    var c = child();
    var tab = sub.growth || 'measure';
    var h = seg('growth', [['measure', 'القياسات'], ['dev', 'مراحل النمو والحركة']], tab);
    if (tab === 'measure') {
      var ind = sub.ind || 'wfa';
      h += '<div class="card"><div class="row between"><h1>منحنى النمو</h1><button class="btn primary" data-action="addgrowth">+ قياس</button></div>' +
        seg('ind', [['wfa', 'الوزن'], ['lhfa', 'الطول'], ['hcfa', 'محيط الرأس']], ind) + chartSvg(c, ind) + srcHtml(['who_growth']) + '</div>';
      var rows = S.growth.filter(function (g) { return g.childId === c.id; }).sort(function (p, q) { return q.date < p.date ? -1 : 1; });
      h += '<div class="card"><h2>سجل القياسات</h2>';
      if (!rows.length) h += '<p class="muted">أضيفي أول قياس (من بطاقة المراجعة أو ميزان المنزل).</p>';
      else {
        h += '<div class="scroll-x"><table><thead><tr><th>التاريخ</th><th>الوزن</th><th>الطول</th><th>الرأس</th><th></th></tr></thead><tbody>';
        rows.forEach(function (g) {
          var m = devMonthsAt(c, g.date);
          var pre = beforeTerm(c, g.date);
          function cell(indk, v, unit) {
            if (!v) return '<td>—</td>';
            if (m > 60 || pre) return '<td>' + v + ' ' + unit + '</td>';
            var r = E.growthAssess(indk, c.sex, m, +v, window.WHO_LMS);
            var cls = r.level === 'ok' ? '' : r.level === 'check' ? 'warn' : 'danger';
            return '<td>' + v + ' ' + unit + '<br><span class="chip ' + cls + '">مئين ' + num(r.percentile, 0) + '</span></td>';
          }
          h += '<tr><td>' + esc(fmtDate(g.date)) + '<br><span class="small muted">' + (pre ? 'قبل موعد الولادة المتوقع' : esc(E.formatAge(Math.round(m * E.DAYS_PER_MONTH)))) + '</span></td>' +
            cell('wfa', g.w, 'كغ') + cell('lhfa', g.l, 'سم') + cell('hcfa', g.hc, 'سم') +
            '<td><button class="x" aria-label="حذف" data-action="delgrowth" data-id="' + g.id + '">✕</button></td></tr>';
        });
        h += '</tbody></table></div>';
        h += '<p class="small muted" style="margin-top:8px">المئين 50 = متوسط الأطفال. القيم بين المئين 3 و97 ضمن المدى الطبيعي غالبًا. اللون البرتقالي أو الأحمر يعني: ناقشي القياس مع طبيب الطفل. الأهم هو اتجاه النمو عبر الزمن، لا قياس واحد.' + (E.ageInfo(c, today()).preterm ? ' القياسات قبل موعد الولادة المتوقع (40 أسبوعًا) لا تُقارن بمعايير WHO، ويقيّمها الطبيب بمنحنيات خاصة بالخدج.' : '') + '</p>';
      }
      h += '</div>';
    } else {
      h += vMilestones(c);
    }
    return h;
  }

  function vMilestones(c) {
    var a = E.ageInfo(c, today());
    var done = S.milestones[c.id] || {};
    var h = '<div class="card accent"><h2>مراحل النمو (CDC)</h2><p class="small">هذه مهارات يبلغها معظم الأطفال (75% أو أكثر) في هذا العمر. ' +
      (a.useCorrected ? 'نستخدم العمر المصحح لطفلك لأنه وُلد مبكرًا. ' : '') +
      'إذا لم يبلغ طفلك بعضها، أو فقد مهارة كان يتقنها، فتحدثي مع طبيب الطفل مبكرًا — لا تنتظري.</p>' + srcHtml(['cdc_milestones', 'aap_preemie']) + '</div>';
    var cur = null;
    window.MILESTONES.forEach(function (b) { if (b.m <= a.devMonths + 0.01) cur = b.m; });
    window.MILESTONES.forEach(function (b) {
      var isCur = b.m === cur;
      var isNext = cur === null ? b.m === window.MILESTONES[0].m : false;
      var total = 0, got = 0;
      Object.keys(b.items).forEach(function (area) { b.items[area].forEach(function (_, i) { total++; if (done[b.m + '-' + area + '-' + i]) got++; }); });
      var past = b.m < (cur || 0);
      var label = b.m < 24 ? b.m + ' شهر' : (b.m % 12 ? b.m + ' شهرًا' : (b.m / 12) + ' سنوات').replace('2 سنوات', 'سنتان');
      h += '<details class="card"' + (isCur || isNext ? ' open' : '') + '><summary class="row between" style="cursor:pointer"><h2 style="margin:0">عمر ' + esc(label) + '</h2>' +
        '<span class="chip ' + (got === total ? 'accent' : (past && got < total ? 'warn' : '')) + '">' + got + '/' + total + '</span>' + (isCur ? '<span class="chip brand">المرحلة الحالية</span>' : '') + '</summary>';
      ['move', 'social', 'lang', 'cog'].forEach(function (area) {
        h += '<h3 style="margin-top:10px">' + esc(window.MILESTONE_AREAS[area]) + '</h3>';
        b.items[area].forEach(function (txt, i) {
          var k = b.m + '-' + area + '-' + i;
          h += '<label class="ms"><input type="checkbox" data-action="ms" data-k="' + k + '"' + (done[k] ? ' checked' : '') + '>' + esc(txt) + '</label>';
        });
      });
      if (past && got < total) h += '<p class="small" style="color:var(--warn)">بعض المهارات غير محددة بعد. إن لم يبلغها طفلك فعلًا، ناقشي ذلك مع طبيب الطفل.</p>';
      h += '</details>';
    });
    return h;
  }

  /* ---------- guide ---------- */
  function vGuide() {
    var c = child(); var a = E.ageInfo(c, today());
    var who = sub.guide || 'baby';
    var h = seg('guide', [['baby', 'دليل الطفل'], ['mother', 'دليل الأم']], who);
    if (who === 'baby') {
      var stageId = sub.stage || E.stageFor(a.devMonths, window.STAGES).id;
      var st = window.STAGES.filter(function (s) { return s.id === stageId; })[0];
      h += '<div class="card"><label for="stagePick">اختاري المرحلة العمرية</label><select id="stagePick" data-action="stage">' +
        window.STAGES.map(function (s) { return '<option value="' + s.id + '"' + (s.id === stageId ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></div>';
      h += '<div class="card"><h2>🍼 التغذية</h2>' + tipsHtml(st.feed) + '</div>' +
        '<div class="card"><h2>🧸 الحركة والنشاط</h2>' + tipsHtml(st.move) + '</div>' +
        '<div class="card"><h2>😴 النوم</h2>' + tipsHtml(st.sleep) + '</div>' +
        '<div class="card"><h2>🩺 الرعاية</h2>' + tipsHtml(st.care) + '</div>';
    } else {
      var mt = E.buildTracks(S.mother, c, today()).filter(function (t) { return t.who === 'mother'; });
      h += '<div class="card"><h2>🚶‍♀️ حركتك ونشاطك</h2>' + tipsHtml(window.MOTHER_GENERAL.move) + '</div>' +
        '<div class="card"><h2>🥗 تغذيتك</h2>' + tipsHtml(window.MOTHER_GENERAL.feed) + '</div>' +
        '<div class="card"><h2>💗 رعايتك وصحتك النفسية</h2>' + tipsHtml(window.MOTHER_GENERAL.care) + '</div>';
      if (mt.length) {
        h += '<div class="card soft"><h2>مساراتك الخاصة</h2>';
        mt.forEach(function (t) { h += '<details class="track"><summary>' + esc(t.title) + '</summary><p class="small muted">' + esc(t.reason) + '</p>' + tipsHtml(t.tips) + '</details>'; });
        h += '</div>';
      }
    }
    return h + disclaimer();
  }

  /* ---------- care: vaccines & danger ---------- */
  function vCare() {
    var c = child();
    var tab = sub.care || 'vax';
    var h = seg('care', [['vax', 'التطعيمات'], ['danger', 'علامات الخطر']], tab);
    if (tab === 'vax') {
      var done = S.vaccines[c.id] || {};
      var a = E.ageInfo(c, today());
      h += '<div class="card warn"><p class="small"><b>مهم:</b> هذا الجدول للتذكير ومبني على جدول التطعيمات الوطني السعودي. قد يُحدَّث الجدول، فتأكدي دائمًا من مركز الرعاية الصحية الأولية أو تطبيق "صحتي". التطعيمات حسب العمر الفعلي حتى للخدّج.</p>' + srcHtml(['moh_vaccines', 'sfda_vaccines']) + '</div>';
      h += '<div class="card"><h1>جدول تطعيمات ' + esc(c.name) + '</h1><ul class="list">';
      window.VACCINES.forEach(function (v) {
        var due = new Date(E.daysBetween('1970-01-01', c.dob) * 86400000 + v.m * E.DAYS_PER_MONTH * 86400000);
        var st = done[v.m] ? ['accent', done[v.m] === c.dob && v.m > 0 ? 'تم' : 'تم ' + fmtDate(done[v.m])] : a.months > v.m + 1 ? ['danger', 'متأخر'] : a.months >= v.m - 0.25 ? ['warn', 'مستحق الآن'] : ['', 'قادم'];
        h += '<li><input type="checkbox" style="width:24px;height:24px;min-height:0;flex:none;accent-color:var(--accent)" aria-label="تم التطعيم" data-action="vax" data-m="' + v.m + '"' + (done[v.m] ? ' checked' : '') + '>' +
          '<div class="grow"><b>' + esc(v.label) + '</b> <span class="chip ' + st[0] + '">' + esc(st[1]) + '</span><div class="small muted">الموعد: ' + esc(fmtDate(due)) + '</div><div class="small">' + esc(v.list.join('، ')) + '</div></div></li>';
      });
      h += '</ul></div><div class="card"><h2>ملاحظات</h2><ul class="tips">' + window.VACCINE_NOTES.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' + srcHtml(['moh_vaccines']) + '</div>';
    } else {
      h += '<div class="card danger"><h1>🚨 في الطوارئ</h1><div class="grid2"><a class="btn primary" style="background:var(--danger);border-color:var(--danger);color:#fff" href="tel:997">اتصلي بالإسعاف 997</a><a class="btn" href="tel:937">استشارة 937</a></div>' +
        '<p class="small" style="margin-top:8px">997: الإسعاف (الهلال الأحمر). 937: مركز اتصال وزارة الصحة، مجاني 24 ساعة. ويمكنك الاستشارة الافتراضية عبر تطبيق "صحتي".</p></div>';
      h += '<div class="card"><h2>علامات الخطر لدى الطفل — اذهبي للطوارئ فورًا</h2><ul class="tips">' + window.DANGER_BABY.items.map(function (i) { return '<li>⚠️ ' + esc(i) + '</li>'; }).join('') + '</ul>' + srcHtml(window.DANGER_BABY.src) + '</div>';
      h += '<div class="card"><h2>علامات الخطر لدى الأم بعد الولادة</h2><ul class="tips">' + window.DANGER_MOTHER.items.map(function (i) { return '<li>⚠️ ' + esc(i) + '</li>'; }).join('') + '</ul>' + srcHtml(window.DANGER_MOTHER.src) + '</div>';
      h += '<div class="card"><h2>😴 قواعد النوم الآمن</h2><ul class="tips">' +
        ['على الظهر في كل نوم (القيلولة والليل) حتى عمر سنة.', 'سطح صلب ومستوٍ غير مائل، بغطاء مشدود فقط.', 'لا وسائد ولا بطانيات ولا ألعاب ولا حواجز مبطنة في السرير.', 'مشاركة الغرفة لا السرير، لـ6 أشهر على الأقل ويفضل سنة.', 'لا تنامي مع الرضيع على كنبة أو كرسي.', 'تجنبي الحرارة الزائدة وتغطية الرأس أثناء النوم.', 'لا تدخين قرب الطفل.']
          .map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' + srcHtml(['aap_safe_sleep']) + '</div>';
    }
    return h;
  }

  /* ---------- settings ---------- */
  function vSettings() {
    var c = child();
    var tab = sub.settings || 'profile';
    var h = seg('settings', [['profile', 'الملف'], ['children', 'الأطفال'], ['data', 'البيانات'], ['sources', 'المصادر']], tab);
    if (tab === 'profile') {
      h += '<form class="card" data-form="mother">' + motherFields(S.mother) + '<button class="btn primary block" style="margin-top:14px" type="submit">حفظ معلوماتي</button></form>';
      h += '<form class="card" data-form="child" data-id="' + c.id + '">' + childFields(c) + '<button class="btn primary block" style="margin-top:14px" type="submit">حفظ معلومات ' + esc(c.name) + '</button></form>';
    } else if (tab === 'children') {
      h += '<div class="card"><h2>أطفالك</h2><ul class="list">' + S.children.map(function (k) {
        return '<li><div class="grow"><b>' + esc(k.name) + '</b><div class="small muted">' + esc(E.formatAge(E.ageInfo(k, today()).days)) + '</div></div>' +
          (k.id === S.activeId ? '<span class="chip brand">الحالي</span>' : '<button class="btn" data-action="switch" data-id="' + k.id + '">اختيار</button>') +
          (S.children.length > 1 ? '<button class="x" aria-label="حذف" data-action="delchild" data-id="' + k.id + '">✕</button>' : '') + '</li>';
      }).join('') + '</ul></div>';
      h += '<form class="card" data-form="newchild"><h2>إضافة طفل</h2>' + childFields() + '<button class="btn primary block" style="margin-top:14px" type="submit">إضافة</button></form>';
    } else if (tab === 'data') {
      h += '<div class="card"><h2>🔒 خصوصيتك</h2><p>كل بياناتك محفوظة على هذا الجهاز فقط ولا تُرسل إلى أي خادم. إذا مسحتِ بيانات المتصفح ستُحذف، لذا احفظي نسخة احتياطية.</p>' +
        '<div class="grid2"><button class="btn" data-action="export">⬇️ حفظ نسخة احتياطية</button><label class="btn" style="margin:0">⬆️ استعادة نسخة<input type="file" accept="application/json" data-action="import" class="hidden"></label></div></div>' +
        '<div class="card"><h2>المظهر</h2><div class="grid3"><button class="btn" data-action="theme" data-val="">تلقائي</button><button class="btn" data-action="theme" data-val="light">فاتح</button><button class="btn" data-action="theme" data-val="dark">داكن</button></div></div>' +
        '<div class="card danger"><h2>حذف كل البيانات</h2><p class="small">لا يمكن التراجع عن هذا.</p><button class="btn danger" data-action="wipe">حذف كل البيانات</button></div>';
    } else {
      h += '<div class="card"><h2>المصادر المعتمدة</h2><p class="small muted">يعتمد التطبيق فقط على جهات رسمية وعلمية موثوقة. تاريخ المراجعة بجانب كل مصدر.</p><ul class="list">' +
        Object.keys(window.SOURCES).map(function (k) {
          var s = window.SOURCES[k];
          return '<li><div class="grow"><b>' + esc(s.org) + '</b><div><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a></div><div class="small muted">رُوجع: ' + esc(s.checked) + '</div></div></li>';
        }).join('') + '</ul></div>';
    }
    return h + disclaimer();
  }

  /* ---------- render ---------- */
  var TITLES = { home: 'خطة طفلي', log: 'السجل اليومي', growth: 'النمو والتطور', guide: 'الدليل', care: 'التطعيم والرعاية', settings: 'الإعدادات' };
  function render() {
    var app = document.getElementById('app');
    var tabs = document.getElementById('tabs');
    if (!S.children.length) {
      app.innerHTML = vOnboard();
      tabs.classList.add('hidden');
      return;
    }
    tabs.classList.remove('hidden');
    if (!child()) S.activeId = S.children[0].id;
    if (!S.activeId) S.activeId = S.children[0].id;
    var fn = { home: vHome, log: vLog, growth: vGrowth, guide: vGuide, care: vCare, settings: vSettings }[view] || vHome;
    app.innerHTML = fn();
    document.getElementById('topTitle').textContent = TITLES[view] || 'خطة طفلي';
    [].forEach.call(tabs.querySelectorAll('button'), function (b) {
      var on = b.getAttribute('data-view') === view;
      b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }
  function openModal(html) {
    document.getElementById('modal').innerHTML = '<div class="modal-bg" data-action="bg"><div class="modal" role="dialog" aria-modal="true">' + html + '</div></div>';
    var first = document.querySelector('#modal input:not([type=datetime-local]), #modal select');
    if (first) first.focus();
  }
  function closeModal() { document.getElementById('modal').innerHTML = ''; }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var act = el.getAttribute('data-action');
    if (act === 'bg' && e.target !== el) return;
    switch (act) {
      case 'go':
        e.preventDefault();
        if (!S.children.length) return;
        view = el.getAttribute('data-view');
        if (el.getAttribute('data-sub')) sub[view] = el.getAttribute('data-sub');
        render(); window.scrollTo(0, 0); break;
      case 'sub': sub[el.getAttribute('data-key')] = el.getAttribute('data-val'); render(); break;
      case 'switch': S.activeId = el.getAttribute('data-id'); save(); render(); break;
      case 'addlog': {
        var type = el.getAttribute('data-type');
        if (type === 'vitd') { addLog({ type: 'vitd', ts: Date.now() }); render(); break; }
        openModal(logForm(type)); break;
      }
      case 'dellog': if (confirm('حذف هذا السجل؟')) { S.logs = S.logs.filter(function (l) { return l.id !== el.getAttribute('data-id'); }); save(); render(); } break;
      case 'addgrowth':
        openModal('<form data-form="growth"><div class="row between"><h2>📏 قياس جديد</h2><button type="button" class="x" data-action="close" aria-label="إغلاق">✕</button></div>' +
          '<label for="g_date">التاريخ</label><input id="g_date" name="g_date" type="date" max="' + today() + '" min="' + esc(child().dob) + '" value="' + today() + '" required>' +
          '<label for="g_w">الوزن (كغ)</label><input id="g_w" name="g_w" type="number" inputmode="decimal" step="0.01" min="0.3" max="40">' +
          '<label for="g_l">الطول (سم)</label><input id="g_l" name="g_l" type="number" inputmode="decimal" step="0.1" min="25" max="130">' +
          '<label for="g_hc">محيط الرأس (سم)</label><input id="g_hc" name="g_hc" type="number" inputmode="decimal" step="0.1" min="20" max="60">' +
          '<button class="btn primary block" style="margin-top:14px" type="submit">حفظ</button></form>');
        break;
      case 'delgrowth': if (confirm('حذف هذا القياس؟')) { S.growth = S.growth.filter(function (g) { return g.id !== el.getAttribute('data-id'); }); save(); render(); } break;
      case 'close': case 'bg': closeModal(); break;
      case 'delchild':
        if (confirm('حذف هذا الطفل وكل سجلاته؟')) {
          var id = el.getAttribute('data-id');
          S.children = S.children.filter(function (k) { return k.id !== id; });
          S.logs = S.logs.filter(function (l) { return l.childId !== id; });
          S.growth = S.growth.filter(function (g) { return g.childId !== id; });
          delete S.milestones[id]; delete S.vaccines[id];
          if (S.activeId === id) S.activeId = S.children[0] && S.children[0].id;
          save(); render();
        }
        break;
      case 'export': {
        var blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'baby-plan-backup-' + today() + '.json';
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        break;
      }
      case 'theme': setTheme(el.getAttribute('data-val')); break;
      case 'wipe':
        if (confirm('هل أنتِ متأكدة؟ سيتم حذف كل البيانات من هذا الجهاز.')) { S = window.Store.empty(); save(); view = 'home'; render(); }
        break;
    }
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    var act = el.getAttribute('data-action');
    if (act === 'ms') {
      var c = child(); S.milestones[c.id] = S.milestones[c.id] || {};
      if (el.checked) S.milestones[c.id][el.getAttribute('data-k')] = today(); else delete S.milestones[c.id][el.getAttribute('data-k')];
      save(); render();
    } else if (act === 'vax') {
      var ch = child(); S.vaccines[ch.id] = S.vaccines[ch.id] || {};
      if (el.checked) S.vaccines[ch.id][el.getAttribute('data-m')] = today(); else delete S.vaccines[ch.id][el.getAttribute('data-m')];
      save(); render();
    } else if (act === 'stage') {
      sub.stage = el.value; render();
    } else if (act === 'import' && el.files && el.files[0]) {
      var r = new FileReader();
      r.onload = function () {
        try {
          var data = JSON.parse(r.result);
          if (!data || !Array.isArray(data.children)) throw new Error('bad');
          if (!confirm('استبدال بياناتك الحالية بهذه النسخة؟')) return;
          var e2 = window.Store.empty(); for (var k in e2) if (data[k] === undefined) data[k] = e2[k];
          S = data; save(); view = 'home'; render();
        } catch (err) { alert('الملف غير صالح.'); }
      };
      r.readAsText(el.files[0]);
    }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target; var kind = f.getAttribute('data-form');
    if (!kind) return;
    e.preventDefault();
    if (kind === 'onboard') {
      S.mother = readMother(f);
      var c = readChild(f); S.children.push(c); S.activeId = c.id; if (f.c_vaxdone && f.c_vaxdone.checked) markPastVaccines(c); save(); view = 'home'; render();
    } else if (kind === 'mother') {
      S.mother = readMother(f); save(); render();
    } else if (kind === 'child') {
      var id = f.getAttribute('data-id');
      S.children = S.children.map(function (k) { return k.id === id ? readChild(f, k) : k; }); save(); render();
    } else if (kind === 'newchild') {
      var n = readChild(f); S.children.push(n); S.activeId = n.id; if (f.c_vaxdone && f.c_vaxdone.checked) markPastVaccines(n); save(); view = 'home'; render();
    } else if (kind === 'log') {
      var type = f.getAttribute('data-type');
      var entry = { type: type, ts: new Date(f.l_ts.value).getTime() || Date.now() };
      if (f.l_side) entry.side = f.l_side.value;
      if (f.l_min && f.l_min.value) entry.minutes = +f.l_min.value;
      if (f.l_ml && f.l_ml.value) entry.ml = +f.l_ml.value;
      if (f.l_what) entry.what = f.l_what.value;
      if (f.l_food) entry.food = f.l_food.value.trim();
      if (f.l_kind) entry.kind = f.l_kind.value;
      if (f.l_note && f.l_note.value) entry.note = f.l_note.value.trim();
      if (f.l_mood) entry.mood = +f.l_mood.value;
      addLog(entry); closeModal(); render();
    } else if (kind === 'growth') {
      var g = { id: window.Store.uid(), childId: child().id, date: f.g_date.value, w: f.g_w.value ? +f.g_w.value : null, l: f.g_l.value ? +f.g_l.value : null, hc: f.g_hc.value ? +f.g_hc.value : null };
      if (!g.w && !g.l && !g.hc) { alert('أدخلي قياسًا واحدًا على الأقل.'); return; }
      S.growth.push(g); save(); closeModal(); render();
    }
  });
  function addLog(entry) {
    entry.id = window.Store.uid();
    entry.childId = child().id;
    S.logs.push(entry); save();
  }

  function setTheme(v) {
    try { if (v) localStorage.setItem('babyplan.theme', v); else localStorage.removeItem('babyplan.theme'); } catch (e) { /* ignore */ }
    if (v) document.documentElement.setAttribute('data-theme', v); else document.documentElement.removeAttribute('data-theme');
  }
  try { var th = localStorage.getItem('babyplan.theme'); if (th) document.documentElement.setAttribute('data-theme', th); } catch (e) { /* ignore */ }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline support optional */ });
  }
  render();
})();
