// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                                                                          ║
// ║   ██████╗  ██████╗     ███╗   ██╗ ██████╗ ████████╗                    ║
// ║   ██╔══██╗██╔═══██╗    ████╗  ██║██╔═══██╗╚══██╔══╝                    ║
// ║   ██║  ██║██║   ██║    ██╔██╗ ██║██║   ██║   ██║                       ║
// ║   ██║  ██║██║   ██║    ██║╚██╗██║██║   ██║   ██║                       ║
// ║   ██████╔╝╚██████╔╝    ██║ ╚████║╚██████╔╝   ██║                       ║
// ║   ╚═════╝  ╚═════╝     ╚═╝  ╚═══╝ ╚═════╝    ╚═╝                       ║
// ║                                                                          ║
// ║             RE-RUN THIS SCRIPT AGAIN.                                    ║
// ║                                                                          ║
// ║   This script has ALREADY been run. The output file exists at:           ║
// ║     scripts/seed-notes-output.js                                         ║
// ║                                                                          ║
// ║   Re-running will DESTROY any notes the user has created in the app      ║
// ║   because it overwrites localStorage with the seed data.                 ║
// ║                                                                          ║
// ║   The guard file (.seed-notes-done) will block re-runs automatically,   ║
// ║   but if you delete it — DON'T. Just use the existing output file.       ║
// ║                                                                          ║
// ║   To use the seed data:                                                  ║
// ║     1. Open the app at http://localhost:5173                             ║
// ║     2. Open DevTools → Console (F12)                                     ║
// ║     3. Paste the contents of scripts/seed-notes-output.js               ║
// ║     4. Reload the page                                                   ║
// ║                                                                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝

/**
 * scripts/seed-notes.mjs
 * -----------------------
 * Generates mock Note objects compatible with the 'calendar_notes' localStorage key
 * used by NotesContext.
 *
 * Run:
 *   node scripts/seed-notes.mjs
 *
 * Output:
 *   scripts/seed-notes-output.js — paste this into DevTools → Console
 *   while the app is open at http://localhost:5173 to populate the Notes page.
 *
 * What it generates:
 *   notes — 3 normal + 5 extreme edge-case rows
 *
 * Safe to re-run — uses a guard file (.seed-notes-done) just like seed.mjs.
 * To reset:
 *   del .seed-notes-done          (Windows)
 *   rm .seed-notes-done           (Mac / Linux)
 */

import { writeFileSync, existsSync } from 'node:fs';

// ── Guard — refuse to run more than once ──────────────────────────────────────

const GUARD_FILE = '.seed-notes-done';

if (existsSync(GUARD_FILE)) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ⚠️   NOTES SEED ALREADY RAN — DO NOT RUN AGAIN             ║');
  console.log('║                                                              ║');
  console.log('║  The output file already exists.                            ║');
  console.log('║  Re-running will overwrite any manual edits you made.       ║');
  console.log('║                                                              ║');
  console.log('║  To reseed, delete the guard file first:                    ║');
  console.log('║    del .seed-notes-done          (Windows)                  ║');
  console.log('║    rm .seed-notes-done           (Mac / Linux)              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  process.exit(0);
}

// ── BlockNote block helpers ───────────────────────────────────────────────────
// Notes store content as a JSON-serialised array of BlockNote block objects.
// These helpers produce the exact shape BlockNote expects when reading from
// localStorage on the Notes page.

let _idx = 0;
const bid = () => `seed-block-${String(++_idx).padStart(4, '0')}`;

// Default block props shared by all block types
const bprops = (extra = {}) => ({
  textColor: 'default',
  backgroundColor: 'default',
  textAlignment: 'left',
  ...extra,
});

// Inline text run. styles keys: bold, italic, underline, strike,
//   textColor ('red'|'blue'|'green'|'orange'|'purple'|'gray'|'default'),
//   backgroundColor (same palette)
const txt  = (text, styles = {})  => ({ type: 'text', text, styles });
const bold = (t) => txt(t, { bold: true });
const ital = (t) => txt(t, { italic: true });
const ul   = (t) => txt(t, { underline: true });
const st   = (t) => txt(t, { strike: true });
const col  = (t, c) => txt(t, { textColor: c });
const bg   = (t, c) => txt(t, { backgroundColor: c });

// Block constructors
function para(...runs) {
  const content = runs.map(r => (typeof r === 'string' ? txt(r) : r));
  return { id: bid(), type: 'paragraph', props: bprops(), content, children: [] };
}

function h(level, text) {
  return { id: bid(), type: 'heading', props: bprops({ level }), content: [txt(text)], children: [] };
}

function bullet(text) {
  return { id: bid(), type: 'bulletListItem', props: bprops(), content: [txt(text)], children: [] };
}

function numbered(text) {
  return { id: bid(), type: 'numberedListItem', props: bprops(), content: [txt(text)], children: [] };
}

function code(text, language = 'javascript') {
  return { id: bid(), type: 'codeBlock', props: { language }, content: [txt(text)], children: [] };
}

// Serialise a block array → the string stored in Note.content
const blocks = (...items) => JSON.stringify(items.flat());

// ── Date helpers ──────────────────────────────────────────────────────────────

const now      = new Date();
const iso      = (d) => d.toISOString();
const daysAgo  = (n) => iso(new Date(+now - n * 86_400_000));
const hoursAgo = (n) => iso(new Date(+now - n * 3_600_000));

// ─────────────────────────────────────────────────────────────────────────────
// NOTES — 3 NORMAL
// ─────────────────────────────────────────────────────────────────────────────

const normalNotes = [

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
      para(bold('Important:'), txt(' check all critical-path items before Thursday.')),
      h(2, 'Next Week'),
      numbered('Team retrospective — 1 hr'),
      numbered('Sprint planning — 2 hrs'),
      numbered('Client demo prep — review deck'),
      h(2, 'Notes'),
      para('Deadline for the release candidate is April 18th. No feature-freeze exceptions.'),
    ),
    tags:      ['planning', 'work', 'weekly'],
    pinned:    false,
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
      para(bold('זמן הדלקת נרות:'), txt(' 18:23 בירושלים')),
      para('להכין את הבית לפני 18:00. לא לשכוח להניח את הבלכ"ה.'),
      para(ital('שבת שלום ומבורך לכל המשפחה ✨')),
    ),
    tags:      ['שבת', 'מטבח', 'קניות'],
    pinned:    true,
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
        'javascript',
      ),
      para(ital('Next meeting: Monday 10:00  |  ישיבה הבאה: יום שני 10:00')),
    ),
    tags:      ['meetings', 'ישיבות', 'dev', 'sprint'],
    pinned:    false,
    createdAt: daysAgo(14),
    updatedAt: daysAgo(14),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NOTES — 5 EXTREME EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

const extremeNotes = [

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
        'javascript',
      ),
    ),
    tags:      ['extreme', 'long', 'overflow', 'stress', 'ui', 'test', 'content', 'layout'],
    pinned:    false,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
  },

  // ── X2. Special characters, HTML injection, SQL injection ────────────────────
  {
    id:        'SEED-NOTE-EXTREME-SPECIALCHARS',
    title:     "[EXTREME: SPECIAL CHARS] <script>alert('xss')</script> & \"quotes\" 'apos' -- SQL; DROP TABLE notes;",
    content:   blocks(
      h(1, 'Special Characters & Injection Safety Test'),
      h(2, 'HTML / XSS Attempts'),
      para('<b>bold tag</b> <img src=x onerror=alert(1)> <a href="javascript:void(0)">link</a>'),
      para('<script>document.title = "HACKED"</script>'),
      para('<svg onload=alert(1)><iframe src="javascript:alert(1)"></iframe></svg>'),
      para('HTML entities: &amp; &lt; &gt; &quot; &#39; &nbsp; &#x27; &#x2F;'),
      h(2, 'SQL Injection Attempts'),
      para("'; DROP TABLE notes; --"),
      para("' OR '1'='1' --"),
      para("1; SELECT * FROM users WHERE '1'='1'; --"),
      para("UNION SELECT NULL, username, password FROM users--"),
      h(2, 'JSON / Escape Sequences'),
      para('{"key":"value","array":[1,2,3],"nested":{"a":true,"b":null}}'),
      para('Escapes: \\n newline \\t tab \\\\ backslash \\/ slash \\u0041 \\u05D0'),
      para('Quotes inside: He said "hello" and she said \'hi\''),
      h(2, 'Zero-Width & Invisible Characters'),
      para('Zero-width space between words: be\u200Bfore·af\u200Bter'),
      para('BOM character: \uFEFFafter-BOM'),
      para('RTL override \u202E(this text appears reversed)\u202C normal'),
      code('const s = "null\\u0000byte\\u0001SOH\\u001FUNIT_SEPARATOR";', 'javascript'),
    ),
    tags:      ['extreme', 'security', 'xss', 'sql-injection', 'special-chars', 'unicode'],
    pinned:    false,
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
      bullet('גמרא: כל המציל נפש אחת — מעלה עליו הכתוב כאילו קיים עולם מלא'),
      h(2, '🇬🇧 English (LTR)'),
      para('The quick brown fox jumps over the lazy dog. Testing layout with mixed-direction rendering.'),
      numbered('First: configure locale settings'),
      numbered('Second: test RTL/LTR switching'),
      numbered('Third: verify emoji rendering in all block types'),
      h(2, '🇷🇺 Russian / Русский'),
      para('Привет, мир! Это текст на русском языке для тестирования Unicode и кириллицы.'),
      h(2, '🇸🇦 Arabic / العربية (RTL)'),
      para('مرحباً بالعالم! هذا نص عربي يُكتب من اليمين إلى اليسار مثل العبرית.'),
      h(2, '🇬🇷 Greek / Ελληνικά'),
      para('Γεια σου κόσμε! Αυτό είναι ελληνικό κείμενο για δοκιμή Unicode.'),
      h(2, '🇨🇳 Chinese / 中文'),
      para('你好，世界！这是用来测试Unicode渲染的中文文本。'),
      h(2, '😀 Emoji Density Test'),
      bullet('Flags: 🇮🇱🇺🇸🇬🇧🇩🇪🇫🇷🇯🇵🇨🇳🇷🇺🇧🇷🇦🇺🇨🇦🇮🇳🇰🇷🇸🇪🇳🇱🇨🇭'),
      bullet('Jewish: ✡️🕍🕯️📜🔯🌟🕎🥂🍷🫙🥙🧆🫓'),
      bullet('Nature: 🌅🌄🌙☀️⭐🌈🌊🏔️🌸🌺🌻🍂🌿🌾'),
      bullet('Tech: 💻📱⌨️🖥️🖨️🖱️💾📀🔋🔌🛜📡🔭🔬'),
      bullet('Faces: 😀😂🤣😊😍🤩😎🧐😅😭😡🤯🥳🥺🫠🤔'),
      bullet('Skin-tone modifiers: 👋🏻 👋🏼 👋🏽 👋🏾 👋🏿'),
      bullet('ZWJ sequences: 👨‍👩‍👧‍👦 👩‍💻 👨‍🍳 🧑‍🚀 🏳️‍🌈 🏴‍☠️'),
      h(2, '🔢 Numbers in Multiple Scripts'),
      para('Arabic-Indic: ٠١٢٣٤٥٦٧٨٩ · Hebrew gematriya: א ב ג ד ה ו ז ח ט י · Roman: I II III IV V X'),
      h(2, '⚠️ Direction Mixing'),
      para('LTR start → עברית RTL in middle → LTR end.'),
      para(
        txt('Mixed inline: '),
        col('English ', 'blue'),
        col('עברית ', 'red'),
        col('Русский ', 'green'),
        col('中文', 'orange'),
      ),
    ),
    tags:      ['🎉', 'extreme', 'emoji', 'multilingual', 'rtl', 'unicode', 'עברית', 'arabic', 'russian'],
    pinned:    true,
    createdAt: daysAgo(5),
    updatedAt: hoursAgo(1),
  },

  // ── X4. All block types — rich formatting coverage ────────────────────────────
  {
    id:        'SEED-NOTE-EXTREME-ALLBLOCKS',
    title:     '[EXTREME: ALL BLOCK TYPES] Rich Formatting Coverage — כל סוגי הפורמוט',
    content:   blocks(
      h(1, 'Heading Level 1 / כותרת רמה 1'),
      h(2, 'Heading Level 2 / כותרת רמה 2'),
      h(3, 'Heading Level 3 / כותרת רמה 3'),
      para(''),
      h(2, 'Paragraph Variants'),
      para('Plain paragraph — no formatting.'),
      para(
        txt('Mixed inline styles: '),
        bold('BOLD '),
        ital('italic '),
        ul('underline '),
        st('strikethrough '),
        txt('— all combined in one paragraph.'),
      ),
      para(
        txt('Bold-italic combo: '),
        txt('bold AND italic', { bold: true, italic: true }),
        txt(' · '),
        txt('all four', { bold: true, italic: true, underline: true, strike: true }),
      ),
      para(
        txt('Inline colours: '),
        col('red ', 'red'),
        col('blue ', 'blue'),
        col('green ', 'green'),
        col('orange ', 'orange'),
        col('purple', 'purple'),
      ),
      para(
        txt('Backgrounds: '),
        bg('yellow ', 'yellow'),
        bg('blue ', 'blue'),
        bg('green ', 'green'),
        bg('red', 'red'),
      ),
      h(2, 'Bullet List'),
      bullet('First bullet — short'),
      bullet('Second bullet — ' + 'slightly longer text '.repeat(5).trim()),
      bullet('Third bullet with ' + 'very long text that should wrap inside the list item '.repeat(3).trim()),
      h(2, 'Numbered List'),
      numbered('Step one — initialise the environment'),
      numbered('Step two — configure all required settings'),
      numbered('Step three — run the test suite'),
      numbered('Step four — deploy to production'),
      h(2, 'Code Blocks (Multiple Languages)'),
      code(
        '// JavaScript / TypeScript\nconst greet = (name: string): string =>\n  `שלום, ${name}! Hello, ${name}!`;\n\nconsole.log(greet("World"));',
        'javascript',
      ),
      code(
        '# Python\ndef greet(name: str) -> str:\n    return f"שלום, {name}! Hello, {name}!"\n\nprint(greet("World"))',
        'python',
      ),
      code(
        'SELECT id, title, date, color\nFROM   events\nWHERE  date >= CURRENT_DATE\n  AND  all_day = 0\nORDER  BY date ASC, start_time ASC\nLIMIT  10;',
        'sql',
      ),
      code(
        '{"id":"uuid","type":"paragraph","props":{"textColor":"default"},"content":[{"type":"text","text":"Hello","styles":{}}],"children":[]}',
        'json',
      ),
      h(2, 'Empty & Whitespace Paragraphs'),
      para(''),
      para('   '),
      para('Paragraph after empty ones — layout should not collapse.'),
      h(2, 'Very Long Single-Run'),
      para('X'.repeat(300)),
    ),
    tags:      ['extreme', 'formatting', 'all-blocks', 'coverage', 'ui', 'headings', 'code', 'lists'],
    pinned:    false,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(3),
  },

  // ── X5. Minimal — empty content, no tags, no pin ──────────────────────────────
  {
    id:        'SEED-NOTE-EXTREME-MINIMAL',
    title:     '[EXTREME: MINIMAL] Empty Note',
    content:   '[]',
    tags:      [],
    pinned:    false,
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

const allNotes = [...normalNotes, ...extremeNotes];

// Print summary to console
console.log('─── Normal notes ───────────────────────────────────────────────');
normalNotes.forEach(n => console.log(`  ✅ note  [normal]   ${n.id}`));

console.log('\n─── Extreme notes ──────────────────────────────────────────────');
extremeNotes.forEach(n => console.log(`  ✅ note  [extreme]  ${n.id}`));

// Write the browser-console paste file
const OUTPUT_FILE = 'scripts/seed-notes-output.js';

const output = [
  '// ─────────────────────────────────────────────────────────────────────────────',
  '// seed-notes-output.js',
  '// Paste this entire file into DevTools → Console while the app is open at',
  '// http://localhost:5173 to populate the Notes page with seed data.',
  '//',
  `// Generated: ${now.toISOString()}`,
  `// Notes: ${allNotes.length} (${normalNotes.length} normal + ${extremeNotes.length} extreme)`,
  '// ─────────────────────────────────────────────────────────────────────────────',
  '',
  `localStorage.setItem('calendar_notes', ${JSON.stringify(JSON.stringify(allNotes))});`,
  '',
  `console.log('%c✅ Seeded ${allNotes.length} notes into calendar_notes — reload the app to see them.', 'color: #4ade80; font-weight: bold;');`,
].join('\n');

writeFileSync(OUTPUT_FILE, output);

// Write the guard file
writeFileSync(GUARD_FILE, now.toISOString());

console.log('\n─── Done ───────────────────────────────────────────────────────');
console.log(`  notes total: ${allNotes.length}  (${normalNotes.length} normal + ${extremeNotes.length} extreme)`);
console.log(`\n  Output written to: ${OUTPUT_FILE}`);
console.log('\n  To seed the app:');
console.log('  1. Open the app:  http://localhost:5173');
console.log('  2. Open DevTools → Console  (F12)');
console.log(`  3. Paste the contents of ${OUTPUT_FILE}`);
console.log('  4. Reload the page (Ctrl+R / Cmd+R)');
console.log('\n  To clear notes later:');
console.log("  localStorage.removeItem('calendar_notes');  location.reload();");
