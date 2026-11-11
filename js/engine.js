/* المحرك: حساب العمر والعمر المصحح والمرحلة ونِسب النمو، وبناء "المسارات" المخصصة حسب ملف الأم والطفل.
 * Engine: age maths, WHO LMS z-scores, and the rules that build personalised tracks. Pure functions, no DOM. */
(function (root) {
  'use strict';
  var DAY = 86400000;
  var DAYS_PER_MONTH = 30.4375;

  function parseDate(s) {
    if (s instanceof Date) return s;
    var p = String(s).split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }
  function daysBetween(a, b) { return Math.floor((parseDate(b) - parseDate(a)) / DAY); }

  /* العمر بالأيام والأشهر. corrected: يطرح أسابيع الخداج (قبل 37 أسبوعًا) حتى عمر سنتين فقط. */
  function ageInfo(child, onDate) {
    var days = daysBetween(child.dob, onDate);
    var ga = +child.gaWeeks || 40;
    var preterm = ga < 37;
    var correctionDays = preterm ? Math.round((40 - ga) * 7) : 0;
    var correctedDays = days - correctionDays;
    var useCorrected = preterm && days < 2 * 365.25;
    var devDays = useCorrected ? Math.max(0, correctedDays) : days;
    return {
      days: days,
      months: days / DAYS_PER_MONTH,
      preterm: preterm,
      correctedDays: correctedDays,
      useCorrected: useCorrected,
      devDays: devDays,
      devMonths: devDays / DAYS_PER_MONTH,
      weeksPostpartum: Math.floor(days / 7)
    };
  }

  function formatAge(days) {
    if (days < 0) return 'لم يولد بعد';
    if (days < 31) return days + ' يوم';
    var months = Math.floor(days / DAYS_PER_MONTH);
    if (months < 24) {
      var rem = Math.floor(days - months * DAYS_PER_MONTH);
      return months + ' شهر' + (rem ? ' و' + rem + ' يوم' : '');
    }
    var y = Math.floor(months / 12), m = months % 12;
    return y + ' سنة' + (m ? ' و' + m + ' شهر' : '');
  }

  function stageFor(months, stages) {
    for (var i = 0; i < stages.length; i++) {
      if (months >= stages[i].from && months < stages[i].to) return stages[i];
    }
    return stages[stages.length - 1];
  }

  /* LMS → z-score (WHO). يستكمل خطيًا بين الأشهر. */
  function lmsAt(table, months) {
    if (months < 0) months = 0;
    var max = table.length - 1;
    if (months >= max) return table[max];
    var i = Math.floor(months), f = months - i, a = table[i], b = table[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }
  function zScore(value, lms) {
    var L = lms[0], M = lms[1], S = lms[2];
    if (Math.abs(L) < 1e-9) return Math.log(value / M) / S;
    return (Math.pow(value / M, L) - 1) / (L * S);
  }
  function valueAtZ(z, lms) {
    var L = lms[0], M = lms[1], S = lms[2];
    if (Math.abs(L) < 1e-9) return M * Math.exp(S * z);
    return M * Math.pow(1 + L * S * z, 1 / L);
  }
  /* التوزيع الطبيعي التراكمي (تقريب Abramowitz–Stegun). */
  function normCdf(z) {
    var t = 1 / (1 + 0.2316419 * Math.abs(z));
    var d = 0.3989422804014327 * Math.exp(-z * z / 2);
    var p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return z > 0 ? 1 - p : p;
  }
  function growthAssess(indicator, sex, months, value, lmsData) {
    var table = lmsData[indicator][sex === 'f' ? 'f' : 'm'];
    var z = zScore(value, lmsAt(table, months));
    var pct = normCdf(z) * 100;
    var level = 'ok';
    if (z < -3 || z > 3) level = 'urgent';
    else if (z < -2 || z > 2) level = 'check';
    return { z: z, percentile: pct, level: level };
  }

  /* ===== المسارات المخصصة ===== */
  function tip(t, src) { return { t: t, src: src }; }

  function buildTracks(mother, child, onDate) {
    mother = mother || {};
    var a = ageInfo(child, onDate);
    var mc = mother.conditions || [];
    var cc = child.conditions || [];
    var tracks = [];
    function add(id, who, title, reason, tips) {
      tracks.push({ id: id, who: who, title: title, reason: reason, tips: tips });
    }
    var early = a.days < 84;       // أول 12 أسبوعًا

    /* --- نوع الولادة --- */
    var d = child.delivery;
    if ((d === 'cs_planned' || d === 'cs_emergency') && early) {
      add('cs', 'mother', 'مسار التعافي بعد القيصرية',
        d === 'cs_emergency' ? 'لأن ولادتك كانت قيصرية طارئة' : 'لأن ولادتك كانت قيصرية',
        [
          tip('التعافي الكامل يأخذ غالبًا نحو 6 أسابيع. امشي مشيًا خفيفًا مبكرًا لتقليل خطر الجلطات.', ['nhs_csection']),
          tip('لا ترفعي شيئًا أثقل من طفلك لمدة 6 أسابيع تقريبًا.', ['nhs_csection']),
          tip('القيادة: فقط عندما تستطيعين الضغط على الفرامل بقوة دون ألم (غالبًا 4–6 أسابيع)، وتأكدي من التأمين.', ['nhs_csection']),
          tip('الرضاعة: جرّبي وضعية الجنب أو وضعية "كرة القدم" تحت الذراع لإبعاد الطفل عن الجرح.', ['nhs_csection']),
          tip('التمارين: ابدئي بتمارين التنفس وقاع الحوض الخفيفة، ثم بعد موافقة الطبيب. لا تمارين قفز أو أوزان قبل 12 أسبوعًا.', ['nhs_csection', 'acog_exercise']),
          tip('راقبي الجرح: احمرار يزداد، صديد، رائحة، انفتاح أو حرارة ← راجعي الطبيب فورًا.', ['nhs_csection', 'who_pnc_2022'])
        ]);
    }
    if ((d === 'vaginal' || d === 'assisted') && early) {
      add('vag', 'mother', 'مسار التعافي بعد الولادة الطبيعية',
        d === 'assisted' ? 'لأن ولادتك كانت طبيعية بمساعدة (شفط أو ملقط)' : 'لأن ولادتك كانت طبيعية',
        [
          tip('يمكن البدء بالمشي الخفيف وتمارين قاع الحوض خلال أيام إذا كانت الولادة دون مضاعفات، ثم الزيادة تدريجيًا.', ['acog_exercise']),
          tip('اهتمي بنظافة منطقة العجان (الغرز إن وُجدت) وغيّري الفوطة بانتظام. الألم المتزايد أو الرائحة الكريهة يستدعيان مراجعة الطبيب.', ['who_pnc_2022']),
          tip('الهدف على المدى البعيد: 150 دقيقة أسبوعيًا من النشاط المعتدل.', ['acog_exercise'])
        ].concat(d === 'assisted' ? [tip('بعد الولادة بالشفط قد يظهر تورّم بسيط في رأس الطفل يختفي عادة خلال أيام؛ أخبري الطبيب إن كبر أو ظهر اصفرار.', ['who_pnc_2022'])] : []));
    }

    /* --- جنس الرضيع --- */
    if (child.sex === 'm') {
      var boyTips = [tip('منحنيات النمو في التطبيق تستخدم معايير منظمة الصحة العالمية الخاصة بالذكور.', ['who_growth'])];
      if (a.days < 365) boyTips.push(tip('يتحقق الطبيب في فحوصات المتابعة من نزول الخصيتين؛ أخبريه إن لاحظتِ كيسًا فارغًا أو تورّمًا في المنطقة.', ['who_pnc_2022']));
      add('boy', 'baby', 'مسار الطفل الذكر', 'لأن طفلك ذكر', boyTips);
    } else if (child.sex === 'f') {
      var girlTips = [tip('منحنيات النمو في التطبيق تستخدم معايير منظمة الصحة العالمية الخاصة بالإناث.', ['who_growth'])];
      if (a.days < 30) girlTips.push(tip('قد يظهر إفراز مهبلي بسيط أو قطرات دم في الأيام الأولى بسبب هرمونات الأم، وهذا شائع ويزول وحده. نظّفي من الأمام إلى الخلف.', ['who_pnc_2022']));
      add('girl', 'baby', 'مسار الطفلة الأنثى', 'لأن طفلتك أنثى', girlTips);
    }

    /* --- عمر الأم --- */
    var age = +mother.age || 0;
    if (age && age < 20) {
      add('young', 'mother', 'مسار الأم الصغيرة', 'لأن عمرك أقل من 20 سنة', [
        tip('جسمك ما زال ينمو: احرصي على الحديد والكالسيوم والبروتين وتنوع الغذاء خلال الرضاعة.', ['cdc_maternal_diet']),
        tip('المباعدة: انتظري 24 شهرًا على الأقل قبل الحمل التالي، واطلبي وسيلة منع حمل مناسبة للرضاعة.', ['who_spacing']),
        tip('اطلبي الدعم من الأسرة والفريق الصحي، ولا تترددي في الإفصاح عن الحزن أو القلق.', ['who_pnc_2022'])
      ]);
    } else if (age >= 35) {
      add('age35', 'mother', 'مسار الأم فوق 35 سنة', 'لأن عمرك 35 سنة أو أكثر', [
        tip('احرصي على مراجعات ما بعد الولادة بما فيها قياس الضغط، خاصة إذا كان لديك ضغط أو سكر حمل.', ['who_pnc_2022', 'acog_postpartum']),
        tip('ابدئي النشاط تدريجيًا مع تمارين قاع الحوض، والهدف 150 دقيقة أسبوعيًا.', ['acog_exercise']),
        tip('خطط الحمل القادم: يُنصح بمباعدة 24 شهرًا، وناقشي مع طبيبتك التوقيت المناسب لعمرك.', ['who_spacing'])
      ]);
    }

    /* --- عدد الولادات --- */
    var parity = +mother.parity || 1;
    if (parity === 1) {
      add('first', 'mother', 'مسار الأم لأول مرة', 'لأنه طفلك الأول', [
        tip('الرضاعة مهارة تُتعلّم: اطلبي من الممرضة أو أخصائية الرضاعة مساعدتك في وضعية الالتقام الصحيحة في الأيام الأولى.', ['who_bf_ar', 'who_pnc_2022']),
        tip('علامة كفاية الرضاعة: 6 حفاضات مبللة أو أكثر يوميًا بعد اليوم الخامس، واستعادة وزن الولادة خلال 10–14 يومًا — راقبيها في الأيام الأولى.', ['aap_enough_milk', 'nhs_enough_milk', 'weight_loss']),
        tip('تعلّمي علامات الخطر لدى المولود (صفحة "الرعاية") واحفظي رقم الإسعاف 997.', ['who_newborn_danger'])
      ]);
    } else {
      var multiTips = [
        tip('المباعدة بين الولادات 24 شهرًا على الأقل تقلل مخاطر الولادة المبكرة وانخفاض الوزن.', ['who_spacing']),
        tip('أكملي التطعيمات وراجعي مراحل النمو لكل طفل؛ أضيفي إخوته في التطبيق لمتابعتهم أيضًا.', ['moh_vaccines', 'cdc_milestones'])
      ];
      if (parity >= 5) multiTips.push(tip('مع 5 ولادات أو أكثر يزيد خطر فقر الدم ونزيف ما بعد الولادة: اطلبي فحص الدم (الهيموغلوبين) وراقبي النزيف.', ['who_pnc_2022']));
      add('multi', 'mother', 'مسار الأم لأكثر من طفل', 'لأن هذه ولادتك رقم ' + parity, multiTips);
    }
    var interval = mother.prevIntervalMonths;
    if (interval !== undefined && interval !== null && interval !== '' && +interval < 18 && parity > 1) {
      add('spacing', 'mother', 'تنبيه المباعدة القصيرة', 'لأن الفاصل عن الولادة السابقة أقل من 18 شهرًا', [
        tip('الفاصل القصير بين الولادات يرتبط بزيادة خطر الولادة المبكرة وانخفاض الوزن. انتظري 24 شهرًا على الأقل قبل الحمل التالي.', ['who_spacing']),
        tip('اطلبي فحص فقر الدم وتابعي تغذيتك (الحديد والفولات).', ['who_spacing', 'cdc_maternal_diet'])
      ]);
    }

    /* --- الحالة الصحية للأم --- */
    if (mc.indexOf('gdm') >= 0) {
      add('gdm', 'mother', 'مسار ما بعد سكر الحمل', 'لأنك أُصبتِ بسكر الحمل', [
        tip('افحصي السكر بين 4 و12 أسبوعًا بعد الولادة (صيام أو اختبار تحمّل الجلوكوز 75 غ).', ['acog_postpartum']),
        tip('الرضاعة الطبيعية والنشاط المنتظم (150 دقيقة أسبوعيًا) والوزن الصحي تقلل خطر السكري من النوع الثاني لاحقًا.', ['acog_exercise', 'who_iycf']),
        tip('استمري بفحص السكر دوريًا مدى الحياة حسب توجيه طبيبك.', ['acog_postpartum'])
      ]);
    }
    if (mc.indexOf('htn') >= 0) {
      add('htn', 'mother', 'مسار ضغط الدم / تسمم الحمل', 'لأن لديك ارتفاع ضغط أو تسمم حمل', [
        tip('إذا كان ضغطك شديد الارتفاع في الحمل أو الولادة فيجب قياسه خلال 72 ساعة من الخروج، ولكل حالات ارتفاع الضغط خلال 7–10 أيام بعد الولادة. قراءة 160/110 أو أعلى ← اذهبي للطوارئ فورًا.', ['acog_postpartum']),
        tip('صداع شديد، تشوش رؤية، ألم في أعلى البطن أو الصدر، ضيق تنفس ← اتصلي بالإسعاف 997 فورًا (قد يحدث تسمم الحمل بعد الولادة).', ['acog_postpartum', 'who_pnc_2022']),
        tip('ارتفاع الضغط في الحمل يزيد خطر أمراض القلب لاحقًا: افحصي الضغط سنويًا على الأقل.', ['acog_postpartum'])
      ]);
    }
    if (mc.indexOf('anemia') >= 0) {
      add('anemia', 'mother', 'مسار فقر الدم', 'لأن لديك فقر دم', [
        tip('تناولي أطعمة غنية بالحديد (لحم أحمر، كبد باعتدال، بقوليات، خضار ورقية) مع مصدر فيتامين ج لزيادة الامتصاص.', ['cdc_maternal_diet']),
        tip('استمري بمكمل الحديد الذي وصفه الطبيب وأعيدي فحص الدم في الموعد المحدد.', ['who_pnc_2022'])
      ]);
    }
    if (mc.indexOf('depression') >= 0) {
      add('mh', 'mother', 'مسار الدعم النفسي', 'لأن لديك تاريخًا مع الاكتئاب أو القلق', [
        tip('أنتِ أكثر عرضة لاكتئاب ما بعد الولادة: اطلبي فحصًا مبكرًا بعد الولادة ثم في كل مراجعة، واستخدمي "كيف حالك؟" في التطبيق.', ['nice_mh']),
        tip('النوم والدعم والمشي الخفيف تساعد. لا توقفي أي علاج نفسي دون استشارة الطبيب.', ['who_pnc_2022']),
        tip('للاستشارة: 937 (وزارة الصحة، مجاني 24 ساعة). أفكار إيذاء النفس أو الطفل ← 997 فورًا.', ['moh_child'])
      ]);
    }
    if (mc.indexOf('thyroid') >= 0) {
      add('thyroid', 'mother', 'مسار الغدة الدرقية', 'لأن لديك اضطرابًا في الغدة الدرقية', [
        tip('أعيدي فحص الغدة بعد الولادة حسب موعد الطبيب؛ فالجرعة قد تتغير بعد الولادة.', ['who_pnc_2022']),
        tip('أخبري طبيبك أنك ترضعين قبل أي تغيير في الدواء.', ['who_pnc_2022'])
      ]);
    }
    if (mc.indexOf('obesity') >= 0) {
      add('weight', 'mother', 'مسار الوزن الصحي', 'لأنك أشرتِ إلى زيادة الوزن', [
        tip('إنقاص الوزن التدريجي آمن مع الرضاعة: نشاط 150 دقيقة أسبوعيًا ونظام متوازن، دون حميات قاسية.', ['acog_exercise', 'cdc_maternal_diet'])
      ]);
    }
    if (mc.indexOf('smoking') >= 0) {
      add('smoke', 'baby', 'مسار بيئة خالية من الدخان', 'لأنك أشرتِ إلى التدخين في المنزل', [
        tip('التعرض للدخان يزيد خطر الموت المفاجئ للرضيع. لا تدخين داخل المنزل أو السيارة أو قرب الطفل.', ['aap_safe_sleep']),
        tip('لا يُنصح بمشاركة السرير مطلقًا، ويتضاعف الخطر كثيرًا إذا كان أحد الوالدين يدخن ولو خارج السرير.', ['aap_safe_sleep'])
      ]);
    }

    /* --- صحة الرضيع --- */
    if (a.preterm) {
      add('preterm', 'baby', 'مسار الطفل الخديج', 'لأن طفلك وُلد في الأسبوع ' + child.gaWeeks, [
        tip('يستخدم التطبيق العمر المصحح تلقائيًا لمراحل النمو ومنحنيات النمو حتى عمر سنتين.', ['aap_preemie']),
        tip('التطعيمات تُعطى حسب العمر الفعلي من تاريخ الولادة، لا العمر المصحح.', ['moh_vaccines']),
        tip('الخدج يحتاجون غالبًا الحديد مبكرًا (من الشهر الأول) — التزمي بوصفة الطبيب.', ['aap_vit_iron']),
        tip('اسألي عن وقاية الفيروس المخلوي التنفسي (RSV) في موسمه.', ['moh_rsv'])
      ]);
    }
    var bw = +child.birthWeight || 0;
    if (bw && bw < 2500) {
      add('lbw', 'baby', 'مسار انخفاض وزن الولادة', 'لأن وزن الولادة أقل من 2500 غرام', [
        tip('سجّلي الوزن في كل مراجعة لمتابعة اللحاق بالنمو، وأرضعي بشكل متكرر.', ['who_growth', 'who_iycf']),
        tip('حافظي على دفء الطفل؛ التلامس جلدًا لجلد مفيد جدًا.', ['who_pnc_2022'])
      ]);
    }
    if (child.multiple) {
      add('twins', 'baby', 'مسار التوائم', 'لأنها ولادة توائم', [
        tip('الرضاعة الطبيعية للتوائم ممكنة؛ اطلبي مساعدة أخصائية رضاعة في وضعيات الرضاعة المزدوجة.', ['who_bf_ar']),
        tip('لكل توأم سرير منفصل وفق قواعد النوم الآمن.', ['aap_safe_sleep']),
        tip('أضيفي كل توأم كطفل منفصل في التطبيق لمتابعة نموه وحده.', ['who_growth'])
      ]);
    }
    if (cc.indexOf('nicu') >= 0 && a.days < 365) {
      add('nicu', 'baby', 'مسار ما بعد العناية المركزة', 'لأن طفلك دخل العناية المركزة لحديثي الولادة', [
        tip('احضري كل مواعيد المتابعة (التطور، السمع، النظر إن طُلب).', ['who_pnc_2022']),
        tip('تابعي مراحل النمو بالعمر المصحح وأخبري الطبيب بأي تأخر.', ['aap_preemie', 'cdc_milestones'])
      ]);
    }
    if (cc.indexOf('eczema') >= 0 && a.devMonths >= 3 && a.devMonths < 12) {
      add('allergy', 'baby', 'مسار الوقاية من الحساسية', 'لأن طفلك لديه إكزيما شديدة أو حساسية بيض', [
        tip('الأطفال المصابون بإكزيما شديدة أو حساسية البيض قد يستفيدون من إدخال الفول السوداني مبكرًا (4–6 أشهر) بعد تقييم الطبيب — لا تبدئي قبل استشارته.', ['niaid_peanut']),
        tip('بعد موافقة الطبيب: قدّمي كل طعام جديد وحده وراقبي ساعتين، واستمري بتقديمه بانتظام إن تحمّله.', ['niaid_peanut', 'aap_allergy'])
      ]);
    }
    if (cc.indexOf('jaundice') >= 0 && a.days < 30) {
      add('jaundice', 'baby', 'مسار اليرقان', 'لأن طفلك أصيب باليرقان', [
        tip('أرضعي بتكرار (8–12 مرة يوميًا) لمساعدة الجسم على التخلص من الصفراء.', ['who_iycf']),
        tip('براز فاتح أو أبيض، بول داكن، خمول أو ضعف رضاعة، أو امتداد الاصفرار ← راجعي الطبيب فورًا.', ['who_pnc_2022'])
      ]);
    }

    /* --- نوع التغذية --- */
    if (a.devMonths < 12) {
      if (child.feeding === 'formula') {
        add('formula', 'baby', 'مسار الرضاعة الصناعية', 'لأن طفلك يرضع حليبًا صناعيًا', [
          tip('حضّري الحليب حسب تعليمات العبوة تمامًا بماء مغلي ومبرّد قليلًا، ولا تخففيه أو تركزيه.', ['who_iycf']),
          tip('أطعميه عند الجوع وانتبهي لعلامات الشبع، ولا تجبريه على إنهاء الرضّاعة.', ['who_cf_2023']),
          tip('اسألي الطبيب عن فيتامين د إذا كان يشرب أقل من لتر حليب صناعي يوميًا.', ['aap_vit_iron'])
        ]);
      } else if (child.feeding === 'mixed') {
        add('mixed', 'baby', 'مسار الرضاعة المختلطة', 'لأن طفلك يرضع طبيعيًا وصناعيًا', [
          tip('للحفاظ على إدرار الحليب: أرضعي من الثدي أولًا وبتكرار، واطلبي دعم أخصائية رضاعة إن رغبتِ بزيادة الرضاعة الطبيعية.', ['who_bf_ar']),
          tip('فيتامين د 400 وحدة يوميًا، والحديد من عمر 4 أشهر حسب توجيه الطبيب.', ['aap_vit_iron'])
        ]);
      } else {
        add('breast', 'baby', 'مسار الرضاعة الطبيعية', 'لأن طفلك يرضع طبيعيًا', [
          tip('رضاعة حصرية حتى 6 أشهر ثم مع الطعام حتى سنتين أو أكثر.', ['who_iycf']),
          tip('فيتامين د 400 وحدة يوميًا حتى عمر سنة، والحديد من عمر 4 أشهر حتى بدء أطعمة غنية بالحديد (حسب الطبيب).', ['aap_vit_iron'])
        ]);
      }
    }

    return tracks;
  }

  /* التطعيم القادم */
  /* تاريخ الاستحقاق: عدد أيام صحيح من تاريخ الولادة، كنص YYYY-MM-DD (لا يتأثر بالمنطقة الزمنية) */
  function addDays(iso, n) {
    var d = new Date(parseDate(iso).getTime() + Math.round(n) * DAY);
    return d.getUTCFullYear() + '-' + (d.getUTCMonth() < 9 ? '0' : '') + (d.getUTCMonth() + 1) + '-' + (d.getUTCDate() < 10 ? '0' : '') + d.getUTCDate();
  }
  function vaccineDue(dob, m) { return addDays(dob, m * DAYS_PER_MONTH); }
  function nextVaccine(child, vaccines, done, onDate) {
    var months = ageInfo(child, onDate).months;
    for (var i = 0; i < vaccines.length; i++) {
      var v = vaccines[i];
      if (!done || !done[v.m]) {
        return { v: v, due: vaccineDue(child.dob, v.m), overdue: months > v.m + 1 };
      }
    }
    return null;
  }

  /* اتجاه الوزن على المنحنى (NICE): نزول خطّين مئويين (≈ 1.34 انحراف معياري) أو خط واحد إذا كان الوزن الأساسي تحت المئين 9.
   * Weight trend: a "centile space" is ~0.67 SD. Measurements in the first 14 days and before term are ignored. */
  function growthTrend(child, growth, lmsData) {
    var info0 = ageInfo(child, child.dob);
    var pts = (growth || []).filter(function (g) { return g.childId === child.id && g.w; }).map(function (g) {
      var a = ageInfo(child, g.date);
      return { date: g.date, w: +g.w, days: a.days, dm: a.devMonths, pre: a.preterm && a.correctedDays < 0 };
    }).filter(function (p) { return !p.pre && p.days >= 0 && p.dm <= 60; }).sort(function (x, y) { return x.date < y.date ? -1 : 1; });
    var res = { velocity: null, alert: false, spaces: 0 };
    if (pts.length >= 2) {
      var last = pts[pts.length - 1], prev = null;
      for (var i = pts.length - 2; i >= 0; i--) { if (last.days - pts[i].days >= 7) { prev = pts[i]; break; } }
      if (prev) res.velocity = { gPerDay: Math.round((last.w - prev.w) * 1000 / (last.days - prev.days)), days: last.days - prev.days };
    }
    var later = pts.filter(function (p) { return p.days >= 14; });
    if (!later.length) return res;
    var sex = child.sex === 'f' ? 'f' : 'm';
    var baseZ = null;
    if (child.birthWeight && !info0.preterm) baseZ = zScore(child.birthWeight / 1000, lmsAt(lmsData.wfa[sex], 0));
    else if (pts.length >= 2) baseZ = zScore(pts[0].w, lmsAt(lmsData.wfa[sex], pts[0].dm));
    if (baseZ === null) return res;
    var cur = later[later.length - 1];
    var curZ = zScore(cur.w, lmsAt(lmsData.wfa[sex], cur.dm));
    res.spaces = (baseZ - curZ) / 0.67;
    res.threshold = baseZ < -1.34 ? 1 : 2;
    res.alert = res.spaces >= res.threshold;
    return res;
  }

  /* مواعيد الأم الشخصية المحسوبة من تاريخ الولادة وحالتها الصحية */
  function motherDates(mother, child) {
    var mc = (mother && mother.conditions) || [];
    var out = [];
    function add(id, title, fromDay, toDay, src) { out.push({ id: id, title: title, from: addDays(child.dob, fromDay), to: addDays(child.dob, toDay), src: src }); }
    add('pnc1', 'مراجعة ما بعد الولادة الأولى (لك ولطفلك)', 2, 3, ['who_pnc_2022']);
    add('pnc2', 'مراجعة ما بعد الولادة الثانية', 7, 14, ['who_pnc_2022']);
    add('pnc3', 'مراجعة الأسبوع السادس (تشمل صحتك النفسية ووسيلة منع الحمل)', 36, 42, ['who_pnc_2022']);
    if (mc.indexOf('htn') >= 0) add('bp', 'قياس الضغط بعد الولادة (خلال 72 ساعة إن كان شديد الارتفاع)', 3, 10, ['acog_postpartum']);
    if (mc.indexOf('gdm') >= 0) add('gtt', 'فحص السكر بعد سكر الحمل', 28, 84, ['acog_postpartum']);
    var ga = +child.gaWeeks || 40;
    var corr = ga < 37 ? Math.round((40 - ga) * 7) : 0;
    add('mchat18', 'فحص التوحد المبكر لطفلك (M-CHAT-R/F) عند 18 شهرًا', Math.round(18 * DAYS_PER_MONTH) + corr, Math.round(19 * DAYS_PER_MONTH) + corr, ['mchat']);
    add('mchat24', 'فحص التوحد المبكر لطفلك (M-CHAT-R/F) عند 24 شهرًا', Math.round(24 * DAYS_PER_MONTH) + corr, Math.round(25 * DAYS_PER_MONTH) + corr, ['mchat']);
    return out;
  }

  var api = {
    ageInfo: ageInfo, formatAge: formatAge, stageFor: stageFor, daysBetween: daysBetween,
    lmsAt: lmsAt, zScore: zScore, valueAtZ: valueAtZ, normCdf: normCdf, growthAssess: growthAssess,
    buildTracks: buildTracks, nextVaccine: nextVaccine, addDays: addDays, vaccineDue: vaccineDue, growthTrend: growthTrend, motherDates: motherDates, DAYS_PER_MONTH: DAYS_PER_MONTH
  };
  root.Engine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
