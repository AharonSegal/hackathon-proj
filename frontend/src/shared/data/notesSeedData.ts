/**
 * shared/data/notesSeedData.ts
 * -----------------------------
 * Default notes loaded into localStorage on the very first visit
 * (when 'calendar_notes' key does not exist yet).
 *
 * Content mirrors scripts/seed-notes.mjs — 3 normal + 5 extreme edge-case notes.
 * Covers: English, Hebrew (RTL), mixed language, emoji, special chars, all
 * BlockNote block types, long text overflow, and a minimal empty note.
 */

import { type Note } from '@/shared/types/note.types';

// ── BlockNote block helpers ───────────────────────────────────────────────────

let _idx = 0;
const bid = () => `seed-block-${String(++_idx).padStart(4, '0')}`;

const bprops = (extra: Record<string, unknown> = {}) => ({
  textColor: 'default', backgroundColor: 'default', textAlignment: 'left', ...extra,
});

const txt  = (text: string, styles: Record<string, unknown> = {}) => ({ type: 'text', text, styles });
const bold = (t: string) => txt(t, { bold: true });
const ital = (t: string) => txt(t, { italic: true });
const ul   = (t: string) => txt(t, { underline: true });
const st   = (t: string) => txt(t, { strike: true });
const col  = (t: string, c: string) => txt(t, { textColor: c });
const bg   = (t: string, c: string) => txt(t, { backgroundColor: c });

function para(...runs: (string | ReturnType<typeof txt>)[]) {
  return { id: bid(), type: 'paragraph', props: bprops(), content: runs.map(r => typeof r === 'string' ? txt(r) : r), children: [] };
}
function h(level: 1 | 2 | 3, text: string) {
  return { id: bid(), type: 'heading', props: bprops({ level }), content: [txt(text)], children: [] };
}
function bullet(text: string) {
  return { id: bid(), type: 'bulletListItem', props: bprops(), content: [txt(text)], children: [] };
}
function numbered(text: string) {
  return { id: bid(), type: 'numberedListItem', props: bprops(), content: [txt(text)], children: [] };
}
function code(text: string, language = 'javascript') {
  return { id: bid(), type: 'codeBlock', props: { language }, content: [txt(text)], children: [] };
}

// Flatten and serialise a block array → the string stored in Note.content
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const blocks = (...items: any[]) => JSON.stringify(items.flat());

// ── Date helpers ──────────────────────────────────────────────────────────────

const now      = new Date();
const daysAgo  = (n: number) => new Date(+now - n * 86_400_000).toISOString();
const hoursAgo = (n: number) => new Date(+now - n * 3_600_000).toISOString();

// ─────────────────────────────────────────────────────────────────────────────
// NOTES — 3 NORMAL
// ─────────────────────────────────────────────────────────────────────────────

const normalNotes: Note[] = [

  // ── 1. English — weekly planning ─────────────────────────────────────────────
  {
    id:        'SEED-NOTE-EN-001',
    title:     '[EXAMPLE] Weekly Planning',
    content:   blocks(
      h(1, 'Weekly Planning'),
      h(2, 'This Week'),
      bullet('Review pull requests and leave feedback'),
      bullet('Send project status update email to stakeholders'),
      bullet('Prepare slides for Friday demo'),
      para(bold('Important:'), ' check all critical-path items before Thursday.'),
      h(2, 'Next Week'),
      numbered('Team retrospective — 1 hr'),
      numbered('Sprint planning — 2 hrs'),
      numbered('Client demo prep — review deck'),
      h(2, 'Notes'),
      para('Deadline for the release candidate is April 18th. No feature-freeze exceptions.'),
    ),
    tags:      ['planning', 'work', 'weekly'],
    pinned:    false,
    folderId:  null,
    createdAt: daysAgo(7),
    updatedAt: daysAgo(1),
  },

  // ── 2. Hebrew — Shabbat prep (pinned) ────────────────────────────────────────
  {
    id:        'SEED-NOTE-HE-001',
    title:     '[דוגמה] הכנות לשבת 🕯️',
    content:   blocks(
      h(1, 'הכנות לשבת'),
      h(2, 'מה לקנות'),
      bullet('לחם שבת — שתי חלות מכוסות'),
      bullet('יין לקידוש'),
      bullet('נרות שבת (מינימום שניים)'),
      bullet('תבשיל עדשים עם קולרבי'),
      bullet('עוגה לקינוח — שוקולד אם אפשר'),
      h(2, 'מה לבשל'),
      numbered('מרק עוף עם אטריות'),
      numbered('קציצות בשר ברוטב עגבניות'),
      numbered('פשטידה ירקות צבעוניים'),
      numbered('סלט ירוק + טחינה'),
      h(2, 'תזכורות'),
      para(bold('זמן הדלקת נרות:'), ' 18:23 בירושלים'),
      para('להכין את הבית לפני 18:00. לא לשכוח להניח את הבלכ"ה.'),
      para(ital('שבת שלום ומבורך לכל המשפחה ✨')),
    ),
    tags:      ['שבת', 'מטבח', 'קניות'],
    pinned:    true,
    folderId:  null,
    createdAt: daysAgo(3),
    updatedAt: hoursAgo(4),
  },

  // ── 3. Mixed English + Hebrew — meeting notes ─────────────────────────────────
  {
    id:        'SEED-NOTE-MIX-001',
    title:     '[EXAMPLE / דוגמה] Team Meeting Notes — הערות ישיבת צוות',
    content:   blocks(
      h(1, 'Team Meeting / ישיבת צוות'),
      para(txt('Date: April 14, 2026  |  '), col('תאריך: י״ד ניסן תשפ״ו', 'purple')),
      h(2, 'Agenda / סדר יום'),
      numbered('Sprint review / סקירת ספרינט'),
      numbered('Blockers / חסמים'),
      numbered('Next steps / צעדים הבאים'),
      h(2, 'Action Items / משימות'),
      bullet('John: Fix calendar Hebrew-mode date picker bug — due Friday / עד יום ו׳'),
      bullet('Sara: Write integration tests / כתיבת טסטים — due Thursday / עד יום ה׳'),
      bullet('Avi: Update deployment docs / עדכון תיעוד פריסה'),
      h(2, 'Code Snippet From Meeting'),
      code(
        'const reminder = async () => {\n' +
        '  await sendWhatsApp("+972501234567", "תזכורת לישיבה מחר בשעה 10:00");\n' +
        '};',
      ),
      para(ital('Next meeting: Monday 10:00  |  ישיבה הבאה: יום שני 10:00')),
    ),
    tags:      ['meetings', 'ישיבות', 'dev', 'sprint'],
    pinned:    false,
    folderId:  null,
    createdAt: daysAgo(14),
    updatedAt: daysAgo(14),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NOTES — 5 EXTREME EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

const extremeNotes: Note[] = [

  // ── X1. Maximum-length title + very long content ──────────────────────────────
  {
    id:        'SEED-NOTE-EXTREME-LONGTEXT',
    title:     '[EXTREME: LONG TEXT] ' + 'A'.repeat(180) + ' — Title Overflow Test',
    content:   blocks(
      h(1, 'Long Content Stress Test'),
      para('This note has a very long title and many content blocks to test layout overflow, sidebar truncation, scroll behaviour, and text wrapping.'),
      h(2, 'Section 1 — 20 Repeated Paragraphs'),
      ...Array.from({ length: 20 }, (_, i) =>
        para(`Paragraph ${i + 1}: ${'The quick brown fox jumps over the lazy dog. '.repeat(5).trim()}`),
      ),
      h(2, 'Section 2 — Long Bullet List (15 items)'),
      ...Array.from({ length: 15 }, (_, i) =>
        bullet(`Bullet ${i + 1}: ${'Lorem ipsum dolor sit amet consectetur adipiscing elit. '.repeat(3).trim()}`),
      ),
      h(2, 'Section 3 — Long Numbered List (10 items)'),
      ...Array.from({ length: 10 }, (_, i) =>
        numbered(`Step ${i + 1}: ${'Do something important and time-consuming here. '.repeat(4).trim()}`),
      ),
      h(2, 'Section 4 — Code Block'),
      code(
        Array.from({ length: 20 }, (_, i) =>
          `const variable${i + 1} = "This is a very long string value number ${i + 1} to test code block overflow and horizontal scrolling behaviour";`,
        ).join('\n'),
      ),
    ),
    tags:      ['extreme', 'long', 'overflow', 'stress', 'ui', 'test', 'content', 'layout'],
    pinned:    false,
    folderId:  null,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
  },

  // ── X2. Special characters, HTML injection, SQL injection ─────────────────────
  {
    id:        'SEED-NOTE-EXTREME-SPECIALCHARS',
    title:     "[EXTREME: SPECIAL CHARS] <script>alert('xss')</script> & \"quotes\" 'apos' -- SQL; DROP TABLE notes;",
    content:   blocks(
      h(1, 'Special Characters & Injection Safety Test'),
      h(2, 'HTML / XSS Attempts'),
      para('<b>bold tag</b> <img src=x onerror=alert(1)> <a href="javascript:void(0)">link</a>'),
      para('<script>document.title = "HACKED"</script>'),
      para('HTML entities: &amp; &lt; &gt; &quot; &#39; &nbsp;'),
      h(2, 'SQL Injection Attempts'),
      para("'; DROP TABLE notes; --"),
      para("' OR '1'='1' --"),
      para("UNION SELECT NULL, username, password FROM users--"),
      h(2, 'JSON / Escape Sequences'),
      para('{"key":"value","array":[1,2,3],"nested":{"a":true,"b":null}}'),
      para('Escapes: \\n newline \\t tab \\\\ backslash \\u0041 \\u05D0'),
      h(2, 'Zero-Width & Invisible Characters'),
      para('Zero-width space: be\u200Bfore·af\u200Bter'),
      para('RTL override: \u202Ethis appears reversed\u202C normal'),
      code('const s = "null\\u0000byte\\u0001SOH";', 'javascript'),
    ),
    tags:      ['extreme', 'security', 'xss', 'sql', 'special-chars', 'unicode'],
    pinned:    false,
    folderId:  null,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },

  // ── X3. Emoji explosion + multilingual scripts ────────────────────────────────
  {
    id:        'SEED-NOTE-EXTREME-EMOJI',
    title:     '🎉🕍✡️🕯️🌟 [EXTREME: EMOJI] חג שמח · Happy Holiday · Праздник · عيد مبارك 🎊🥳🙏❤️🎁',
    content:   blocks(
      h(1, '🌍 Multilingual + Emoji Stress Test'),
      h(2, '🇮🇱 Hebrew / עברית (RTL)'),
      para('שלום עולם! זהו טקסט בעברית עם כיוון ימין לשמאל.'),
      para('כ״ה ניסן תשפ״ה · ירושלים עיר הקודש · שבת שלום ✨'),
      h(2, '🇬🇧 English (LTR)'),
      para('The quick brown fox jumps over the lazy dog.'),
      h(2, '🇷🇺 Russian / Русский'),
      para('Привет, мир! Это текст на русском языке для тестирования Unicode.'),
      h(2, '🇸🇦 Arabic / العربية (RTL)'),
      para('مرحباً بالعالم! هذا نص عربي يُكتب من اليمين إلى اليسار.'),
      h(2, '🇬🇷 Greek / Ελληνικά'),
      para('Γεια σου κόσμε! Αυτό είναι ελληνικό κείμενο.'),
      h(2, '😀 Emoji Density Test'),
      bullet('Flags: 🇮🇱🇺🇸🇬🇧🇩🇪🇫🇷🇯🇵🇨🇳🇷🇺🇧🇷🇦🇺🇨🇦'),
      bullet('Jewish: ✡️🕍🕯️📜🔯🌟🕎🥂🍷🫙🥙🧆'),
      bullet('Nature: 🌅🌄🌙☀️⭐🌈🌊🏔️🌸🌺🌻'),
      bullet('ZWJ sequences: 👨‍👩‍👧‍👦 👩‍💻 👨‍🍳 🧑‍🚀 🏳️‍🌈'),
      bullet('Skin tones: 👋🏻 👋🏼 👋🏽 👋🏾 👋🏿'),
      h(2, '⚠️ Direction Mixing'),
      para(txt('Mixed inline: '), col('English ', 'blue'), col('עברית ', 'red'), col('Русский', 'green')),
    ),
    tags:      ['🎉', 'extreme', 'emoji', 'multilingual', 'rtl', 'unicode', 'עברית'],
    pinned:    true,
    folderId:  null,
    createdAt: daysAgo(5),
    updatedAt: hoursAgo(1),
  },

  // ── X4. All block types — rich formatting coverage ────────────────────────────
  {
    id:        'SEED-NOTE-EXTREME-ALLBLOCKS',
    title:     '[EXTREME: ALL BLOCK TYPES] Rich Formatting Coverage — כל סוגי הפורמוט',
    content:   blocks(
      h(1, 'Heading Level 1'),
      h(2, 'Heading Level 2'),
      h(3, 'Heading Level 3'),
      para('Plain paragraph — no formatting.'),
      para(txt('Mixed inline: '), bold('BOLD '), ital('italic '), ul('underline '), st('strikethrough'), txt(' — all in one line.')),
      para(txt('Bold+italic: '), txt('both at once', { bold: true, italic: true })),
      para(txt('Colours: '), col('red ', 'red'), col('blue ', 'blue'), col('green ', 'green'), col('orange ', 'orange'), col('purple', 'purple')),
      para(txt('Backgrounds: '), bg('yellow ', 'yellow'), bg('blue ', 'blue'), bg('red', 'red')),
      h(2, 'Bullet List'),
      bullet('First bullet — short'),
      bullet('Second bullet — ' + 'slightly longer text '.repeat(5).trim()),
      bullet('Third bullet with ' + 'very long wrapping text '.repeat(4).trim()),
      h(2, 'Numbered List'),
      numbered('Step one — initialise the environment'),
      numbered('Step two — configure all required settings'),
      numbered('Step three — run the test suite'),
      numbered('Step four — deploy to production'),
      h(2, 'Code Blocks'),
      code('const greet = (name: string) => `שלום, ${name}! Hello, ${name}!`;\nconsole.log(greet("World"));', 'javascript'),
      code('def greet(name: str) -> str:\n    return f"שלום, {name}!"\n\nprint(greet("World"))', 'python'),
      code('SELECT id, title, date FROM events WHERE date >= CURRENT_DATE ORDER BY date ASC LIMIT 10;', 'sql'),
      h(2, 'Empty Paragraphs'),
      para(''),
      para('Paragraph after empty one — layout should not collapse.'),
      h(2, 'Long Single-Run'),
      para('X'.repeat(300)),
    ),
    tags:      ['extreme', 'formatting', 'all-blocks', 'coverage', 'code', 'lists'],
    pinned:    false,
    folderId:  null,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(3),
  },

  // ── X5. Minimal — empty content, no tags, not pinned ─────────────────────────
  {
    id:        'SEED-NOTE-EXTREME-MINIMAL',
    title:     '[EXTREME: MINIMAL] Empty Note',
    content:   '[]',
    tags:      [],
    pinned:    false,
    folderId:  null,
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
  },
];

// ─────────────────────────────────────────────────────────────────────────────

export const SEED_NOTES: Note[] = [...normalNotes, ...extremeNotes];
