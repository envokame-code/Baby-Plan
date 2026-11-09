/* سجل المصادر المعتمدة. كل معلومة في التطبيق تشير إلى معرّف (id) من هنا.
 * Trusted-source registry. Every piece of guidance in the app points to one or more ids below.
 * "checked" = the month the link/guidance was last reviewed for this app. */
window.SOURCES = {
  who_iycf: {
    org: 'منظمة الصحة العالمية (WHO)',
    title: 'تغذية الرضّع وصغار الأطفال — صحيفة وقائع',
    url: 'https://www.who.int/News-Room/Fact-Sheets/Detail/Infant-and-Young-Child-Feeding',
    checked: 'نوفمبر 2026'
  },
  who_bf_ar: {
    org: 'منظمة الصحة العالمية (WHO)',
    title: 'الرضاعة الطبيعية (صفحة عربية)',
    url: 'https://who.int/ar/health-topics/breastfeeding',
    checked: 'نوفمبر 2026'
  },
  who_cf_2023: {
    org: 'منظمة الصحة العالمية (WHO)',
    title: 'إرشادات التغذية التكميلية للرضع والأطفال 6–23 شهرًا (2023)',
    url: 'https://www.who.int/news-room/events/detail/2023/12/06/default-calendar/webinar-who-guideline-for-complementary-feeding-of-infants-and-young-children-6-23-months',
    checked: 'نوفمبر 2026'
  },
  who_pa_u5: {
    org: 'منظمة الصحة العالمية (WHO)',
    title: 'إرشادات النشاط البدني والخمول والنوم للأطفال دون 5 سنوات (2019)',
    url: 'https://www.who.int/publications/i/item/9789241550536',
    checked: 'نوفمبر 2026'
  },
  who_growth: {
    org: 'منظمة الصحة العالمية (WHO)',
    title: 'معايير نمو الطفل (2006) — جداول الوزن والطول ومحيط الرأس',
    url: 'https://www.emro.who.int/press-releases/2006-arabic/2012-01-05-12-32-12.html',
    checked: 'نوفمبر 2026'
  },
  who_pnc_2022: {
    org: 'منظمة الصحة العالمية (WHO)',
    title: 'توصيات رعاية الأم والمولود لتجربة إيجابية بعد الولادة (2022)',
    url: 'https://www.who.int/news/item/30-03-2022-who-urges-quality-care-for-women-and-newborns-in-critical-first-weeks-after-childbirth',
    checked: 'نوفمبر 2026'
  },
  who_spacing: {
    org: 'منظمة الصحة العالمية (WHO)',
    title: 'تقرير الاستشارة الفنية حول المباعدة بين الولادات (2005)',
    url: 'https://rhsupplies.org/activities-resources/publications/report-of-a-who-technical-consultation-on-birth-spacing-geneva-switzerland-13-15-june-2005-7842',
    checked: 'نوفمبر 2026'
  },
  cdc_milestones: {
    org: 'مراكز السيطرة على الأمراض الأمريكية (CDC)',
    title: 'مراحل النمو "تعرّف على العلامات وتصرّف مبكرًا" (تحديث 2022)',
    url: 'https://www.cdc.gov/ncbddd/actearly/milestones/',
    checked: 'نوفمبر 2026'
  },
  cdc_maternal_diet: {
    org: 'مراكز السيطرة على الأمراض الأمريكية (CDC)',
    title: 'غذاء الأم المرضع',
    url: 'https://www.cdc.gov/breastfeeding-special-circumstances/hcp/diet-micronutrients/maternal-diet.html',
    checked: 'نوفمبر 2026'
  },
  aap_safe_sleep: {
    org: 'الأكاديمية الأمريكية لطب الأطفال (AAP)',
    title: 'النوم الآمن: الظهر هو الأفضل (توصيات 2022)',
    url: 'https://www.healthychildren.org/English/news/Pages/safe-sleep-back-is-best-avoid-soft-bedding-inclined-surfaces-and-bedsharing.aspx',
    checked: 'نوفمبر 2026'
  },
  aap_vit_iron: {
    org: 'الأكاديمية الأمريكية لطب الأطفال (AAP)',
    title: 'مكملات فيتامين د والحديد للرضع',
    url: 'https://www.healthychildren.org/English/ages-stages/baby/feeding-nutrition/Pages/Vitamin-Iron-Supplements.aspx',
    checked: 'نوفمبر 2026'
  },
  aap_preemie: {
    org: 'الأكاديمية الأمريكية لطب الأطفال (AAP)',
    title: 'مراحل نمو الطفل الخديج والعمر المصحح',
    url: 'https://www.healthychildren.org/English/ages-stages/baby/preemie/Pages/Preemie-Milestones.aspx',
    checked: 'نوفمبر 2026'
  },
  aap_botulism: {
    org: 'الأكاديمية الأمريكية لطب الأطفال (AAP)',
    title: 'التسمم الوشيقي — لا عسل قبل عمر سنة',
    url: 'https://healthychildren.org/English/health-issues/conditions/infections/Pages/Botulism.aspx',
    checked: 'نوفمبر 2026'
  },
  nhs_weaning_avoid: {
    org: 'هيئة الخدمات الصحية البريطانية (NHS)',
    title: 'أطعمة ومشروبات يجب تجنبها عند الفطام',
    url: 'https://www.nhs.uk/best-start-in-life/baby/weaning/safe-weaning/food-and-drinks-to-avoid/',
    checked: 'نوفمبر 2026'
  },
  nhs_csection: {
    org: 'هيئة الخدمات الصحية البريطانية (NHS)',
    title: 'التعافي بعد الولادة القيصرية',
    url: 'https://www.nhs.uk/tests-and-treatments/caesarean-section/recovery/',
    checked: 'نوفمبر 2026'
  },
  acog_postpartum: {
    org: 'الكلية الأمريكية لأطباء النساء والتوليد (ACOG)',
    title: 'تحسين رعاية ما بعد الولادة (ملخص التوصيات)',
    url: 'https://www.mdedge.com/content/acog-advises-earlier-more-comprehensive-postpartum-care/page/0/2',
    checked: 'نوفمبر 2026'
  },
  acog_exercise: {
    org: 'الكلية الأمريكية لأطباء النساء والتوليد (ACOG)',
    title: 'الرياضة بعد الولادة — 150 دقيقة أسبوعيًا تدريجيًا',
    url: 'https://lancastergeneralhealth.org/health-hub-home/motherhood/fitness-and-nutrition/when-is-it-safe-to-start-exercising-after-giving-birth',
    checked: 'نوفمبر 2026'
  },
  moh_vaccines: {
    org: 'وزارة الصحة السعودية',
    title: 'جدول التطعيمات الوطني للأطفال',
    url: 'https://www.moh.gov.sa/en/healthawareness/educationalcontent/vaccination/pages/vaccination1.aspx',
    checked: 'نوفمبر 2026'
  },
  sfda_vaccines: {
    org: 'الهيئة العامة للغذاء والدواء (SFDA)',
    title: 'جدول التطعيمات الأساسية في المملكة العربية السعودية',
    url: 'https://www.sfda.gov.sa/sites/default/files/2022-08/012-000.pdf',
    checked: 'نوفمبر 2026'
  },
  moh_child: {
    org: 'وزارة الصحة السعودية',
    title: 'منصة التوعية — صحة الطفل',
    url: 'https://www.moh.gov.sa/en/awarenessplateform/ChildsHealth/Pages/default.aspx',
    checked: 'نوفمبر 2026'
  },
  who_newborn_danger: {
    org: 'منظمة الصحة العالمية (WHO)',
    title: 'علامات الخطر عند حديثي الولادة (توصيات رعاية ما بعد الولادة)',
    url: 'https://www.who.int/news/item/30-03-2022-who-urges-quality-care-for-women-and-newborns-in-critical-first-weeks-after-childbirth',
    checked: 'نوفمبر 2026'
  }
};
