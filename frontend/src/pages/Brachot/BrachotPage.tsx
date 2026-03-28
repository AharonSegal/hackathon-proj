/**
 * Brachot/BrachotPage.tsx
 * ------------------------
 * Prayer text page with two sections:
 *  1. ברכת המזון  — Birkat Hamazon (Grace After Meals)
 *  2. ברכת מעין שלש — Al HaMichya (Short Grace)
 *
 * Text is unvowelized (no nikud) with standard punctuation only.
 * Anchor buttons at the top scroll smoothly to each section.
 */

import { PageHeader } from '@/shared/components/Layout/PageHeader';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-2xl font-bold text-primary-400 mb-6 pb-2 border-b border-slate-700"
      dir="rtl"
      style={{ fontFamily: "'Heebo', sans-serif" }}
    >
      {children}
    </h2>
  );
}

function BlessingTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 text-right"
      dir="rtl"
    >
      {children}
    </h3>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-base text-slate-200 leading-9 mb-4 text-right"
      dir="rtl"
      style={{ fontFamily: "'Heebo', sans-serif" }}
    >
      {children}
    </p>
  );
}

function Variant({ label, text }: { label: string; text: string }) {
  return (
    <p className="text-sm text-right mb-1.5" dir="rtl" style={{ fontFamily: "'Heebo', sans-serif" }}>
      <span className="text-slate-500 text-xs ml-2">{label}</span>
      <span className="text-slate-300">{text}</span>
    </p>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-4 my-10">
      <div className="flex-1 h-px bg-slate-700" />
      <span className="text-slate-600 text-lg">✦</span>
      <div className="flex-1 h-px bg-slate-700" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function BrachotPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="ברכות"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => scrollTo('birkat-hamazon')}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              style={{ fontFamily: "'Heebo', sans-serif" }}
            >
              ברכת המזון
            </button>
            <button
              onClick={() => scrollTo('meein-shalosh')}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              style={{ fontFamily: "'Heebo', sans-serif" }}
            >
              מעין שלש
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">

          {/* ══════════════════════════════════════
              ברכת המזון
          ══════════════════════════════════════ */}
          <section id="birkat-hamazon">
            <SectionTitle>ברכת המזון</SectionTitle>

            <BlessingTitle>ברכה ראשונה — הזן</BlessingTitle>
            <Para>
              ברוך אתה יי אלהינו מלך העולם הזן את העולם כולו בטובו בחן בחסד וברחמים,
              הוא נותן לחם לכל בשר כי לעולם חסדו. ובטובו הגדול תמיד לא חסר לנו ואל יחסר לנו מזון
              לעולם ועד, בעבור שמו הגדול כי הוא אל זן ומפרנס לכל ומטיב לכל ומכין מזון לכל בריותיו
              אשר ברא. ברוך אתה יי הזן את הכל.
            </Para>

            <BlessingTitle>ברכה שניה — הארץ</BlessingTitle>
            <Para>
              נודה לך יי אלהינו על שהנחלת לאבותינו ארץ חמדה טובה ורחבה ועל שהוצאתנו יי אלהינו
              מארץ מצרים ופדיתנו מבית עבדים ועל בריתך שחתמת בבשרנו ועל תורתך שלמדתנו ועל חקיך
              שהודעתנו ועל חיים חן וחסד שחוננתנו, ועל אכילת מזון שאתה זן ומפרנס אותנו תמיד,
              בכל יום ובכל עת ובכל שעה.
            </Para>
            <Para>
              ועל הכל יי אלהינו אנחנו מודים לך ומברכים אותך, יתברך שמך בפי כל חי תמיד לעולם ועד,
              ככתוב: "ואכלת ושבעת, וברכת את יי אלהיך על הארץ הטובה אשר נתן לך."
              ברוך אתה יי, על הארץ ועל המזון.
            </Para>

            <BlessingTitle>ברכה שלישית — בונה ירושלים</BlessingTitle>
            <Para>
              רחם נא יי אלהינו על ישראל עמך, ועל ירושלים עירך, ועל ציון משכן כבודך,
              ועל מלכות בית דוד משיחך, ועל הבית הגדול והקדוש שנקרא שמך עליו.
              אלהינו, אבינו, רענו, זוננו, פרנסנו וכלכלנו והרויחנו, והרוח לנו יי אלהינו מהרה
              מכל צרותינו. ונא אל תצריכנו יי אלהינו, לא לידי מתנת בשר ודם ולא לידי הלואתם,
              כי אם לידך המלאה הפתוחה הקדושה והרחבה, שלא נבוש ולא נכלם לעולם ועד.
            </Para>
            <Para>
              ובנה ירושלים עיר הקדש במהרה בימינו. ברוך אתה יי, בונה ברחמיו ירושלים. אמן.
            </Para>

            <BlessingTitle>ברכה רביעית — הטוב והמטיב</BlessingTitle>
            <Para>
              ברוך אתה יי אלהינו, מלך העולם, האל אבינו, מלכנו, אדירנו, בוראנו, גאלנו, יוצרנו,
              קדושנו קדוש יעקב, רוענו רועה ישראל, המלך הטוב והמטיב לכל, שבכל יום ויום הוא היטיב,
              הוא מטיב, הוא ייטיב לנו. הוא גמלנו, הוא גומלנו, הוא יגמלנו לעד, לחן ולחסד ולרחמים
              ולרוח הצלה והצלחה, ברכה וישועה, נחמה פרנסה וכלכלה ורחמים וחיים ושלום וכל טוב;
              ומכל טוב לעולם אל יחסרנו.
            </Para>

            <BlessingTitle>הרחמן</BlessingTitle>
            <Para>
              הרחמן הוא ימלוך עלינו לעולם ועד. הרחמן הוא יתברך בשמים ובארץ.
              הרחמן הוא ישתבח לדור דורים, ויתפאר בנו לעד ולנצח נצחים, ויתהדר בנו לעד ולעולמי עולמים.
            </Para>
            <Para>
              הרחמן הוא יפרנסנו בכבוד. הרחמן הוא ישבור עלנו מעל צוארנו, והוא יוליכנו קוממיות לארצנו.
              הרחמן הוא ישלח לנו ברכה מרובה בבית הזה, ועל שלחן זה שאכלנו עליו.
              הרחמן הוא ישלח לנו את אליהו הנביא זכור לטוב, ויבשר לנו בשורות טובות ישועות ונחמות.
            </Para>
            <Para>
              הרחמן הוא יברך אותי ואת אשתי ואת זרעי ואת כל אשר לי.
            </Para>
            <Para>
              אותם ואת ביתם ואת זרעם ואת כל אשר להם, אותנו ואת כל אשר לנו,
              כמו שנתברכו אבותינו אברהם יצחק ויעקב בכל מכל כל —
              כן יברך אותנו כולנו יחד בברכה שלמה. ונאמר: אמן.
            </Para>
            <Para>
              במרום ילמדו עליהם ועלינו זכות שתהא למשמרת שלום.
              ונשא ברכה מאת יי, וצדקה מאלהי ישענו, ונמצא חן ושכל טוב בעיני אלהים ואדם.
            </Para>
            <Para>
              הרחמן הוא יזכנו לימות המשיח ולחיי העולם הבא.
              מגדיל ישועות מלכו, ועשה חסד למשיחו, לדוד ולזרעו עד עולם.
              עשה שלום במרומיו, הוא יעשה שלום עלינו ועל כל ישראל. ואמרו: אמן.
            </Para>
            <Para>
              יראו את יי קדושיו, כי אין מחסור ליראיו. כפירים רשו ורעבו, ודרשי יי לא יחסרו כל טוב.
              הודו ליי כי טוב, כי לעולם חסדו. פותח את ידך, ומשביע לכל חי רצון.
              ברוך הגבר אשר יבטח ביי, והיה יי מבטחו.
              נער הייתי גם זקנתי, ולא ראיתי צדיק נעזב, וזרעו מבקש לחם.
              יי עז לעמו יתן, יי יברך את עמו בשלום.
            </Para>
          </section>

          <Divider />

          {/* ══════════════════════════════════════
              ברכת מעין שלש
          ══════════════════════════════════════ */}
          <section id="meein-shalosh">
            <SectionTitle>ברכת מעין שלש</SectionTitle>

            <Para>ברוך אתה יי, אלהינו מלך העולם,</Para>

            <div className="mb-4 card bg-slate-900/60 space-y-1">
              <Variant label="על חמשת מיני דגן:" text="על המחיה ועל הכלכלה" />
              <Variant label="על היין:" text="על הגפן ועל פרי הגפן" />
              <Variant label="על פירות שבעת המינים:" text="על העץ ועל פרי העץ" />
            </div>

            <Para>
              ועל תנובת השדה ועל ארץ חמדה טובה ורחבה שרצית והנחלת לאבותינו לאכול מפריה
              ולשבוע מטובה. רחם (נא) יי אלהינו על ישראל עמך ועל ירושלים עירך ועל ציון משכן כבודך,
              ועל מזבחך, ועל היכלך. ובנה ירושלים עיר הקדש במהרה בימינו. והעלנו לתוכה ושמחנו
              בבנינה, ונאכל מפריה ונשבע מטובה ונברכך עליה בקדושה ובטהרה.
              כי אתה יי טוב ומטיב לכל ונודה לך על הארץ
            </Para>

            <div className="mb-4 card bg-slate-900/60 space-y-1">
              <Variant label="על חמשת מיני דגן:" text="ועל המחיה" />
              <Variant label="על היין:" text="ועל פרי גפנה" />
              <Variant label="על פירות שבעת המינים:" text="ועל פירותיה" />
            </div>

            <Para>ברוך אתה יי, על הארץ</Para>

            <div className="mb-6 card bg-slate-900/60 space-y-1">
              <Variant label="על חמשת מיני דגן:" text='ועל המחיה (וי"א גם ועל הכלכלה).' />
              <Variant label="על היין:" text="ועל פרי גפנה." />
              <Variant label="על פירות שבעת המינים:" text="ועל פירותיה." />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
