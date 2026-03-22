/**
 * scripts/seed.mjs
 * -----------------
 * Inserts mock data into the Turso database so you can see the app with real content.
 *
 * Run:
 *   node --env-file=.env.local scripts/seed.mjs
 *
 * What it inserts:
 *   events        — 3 normal + 5 extreme edge-case rows
 *   message_logs  — 3 normal + 5 extreme edge-case rows
 *
 * Safe to re-run — uses INSERT OR REPLACE so existing rows with the same
 * seed IDs are overwritten rather than causing duplicate-key errors.
 */

import { createClient } from '@libsql/client';

// ── Connect ───────────────────────────────────────────────────────────────────

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('❌  TURSO_DATABASE_URL is not set.');
  console.error('    Run:  node --env-file=.env.local scripts/seed.mjs');
  process.exit(1);
}

const db = createClient({ url, authToken });

// ── Ensure tables exist ───────────────────────────────────────────────────────

await db.execute(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
    date TEXT NOT NULL, start_time TEXT, end_time TEXT,
    color TEXT DEFAULT 'indigo', all_day INTEGER DEFAULT 1,
    scheduled_email TEXT, scheduled_whatsapp TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

await db.execute(`
  CREATE TABLE IF NOT EXISTS message_logs (
    id TEXT PRIMARY KEY, type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', recipient TEXT NOT NULL,
    subject TEXT, message TEXT, scheduled_at TEXT NOT NULL,
    sent_at TEXT, error TEXT, event_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

console.log('✅  Tables ready\n');

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS — 3 NORMAL
// ─────────────────────────────────────────────────────────────────────────────

const normalEvents = [

  // ── 1. English ──────────────────────────────────────────────────────────────
  {
    id:          'SEED-EVENT-EN-001',
    title:       '[EXAMPLE] Team Birthday Party',
    description: 'Example English event. Celebrating the team milestone birthday. Cake and drinks provided.',
    date:        '2026-04-10',
    start_time:  '15:00',
    end_time:    '18:00',
    color:       'emerald',
    all_day:     0,
    scheduled_email: JSON.stringify({
      id: 'SEED-EMAIL-EN-001',
      to: ['alice@example.com', 'bob@example.com'],
      subject: 'Team Birthday Party — Save the Date!',
      body: 'Hi team,\n\nYou are invited to the birthday party on April 10th at 3pm.\n\nSee you there!',
      scheduledAt: '2026-04-10T12:00:00.000Z',
      sent: false,
    }),
    scheduled_whatsapp: null,
  },

  // ── 2. Hebrew ───────────────────────────────────────────────────────────────
  {
    id:          'SEED-EVENT-HE-001',
    title:       '[דוגמה] ארוחת שבת משפחתית',
    description: 'דוגמה לאירוע בעברית. ארוחת שבת עם המשפחה המורחבת. לבוא רעבים!',
    date:        '2026-04-11',
    start_time:  '19:30',
    end_time:    '22:00',
    color:       'violet',
    all_day:     0,
    scheduled_email: null,
    scheduled_whatsapp: JSON.stringify({
      id: 'SEED-WA-HE-001',
      to: '+972501234567',
      message: 'שלום! תזכורת לארוחת שבת הערב בשעה 19:30 🕯️\nמחכים לכם!',
      scheduledAt: '2026-04-11T14:00:00.000Z',
      sent: false,
    }),
  },

  // ── 3. Mixed English + Hebrew ────────────────────────────────────────────────
  {
    id:          'SEED-EVENT-MIX-001',
    title:       '[EXAMPLE / דוגמה] Team Meeting — ישיבת צוות',
    description: 'Mixed-language example event.\nEnglish: Weekly sync with the dev team.\nעברית: סנכרון שבועי עם צוות הפיתוח.\n\nAgenda / סדר יום:\n1. Sprint review / סקירת ספרינט\n2. Planning / תכנון',
    date:        '2026-04-14',
    start_time:  '10:00',
    end_time:    '11:00',
    color:       'sky',
    all_day:     0,
    scheduled_email: JSON.stringify({
      id: 'SEED-EMAIL-MIX-001',
      to: ['team@example.com'],
      subject: '[Meeting / ישיבה] Weekly Sync — סנכרון שבועי',
      body: 'Hi / שלום,\n\nReminder for the weekly meeting on Monday.\nתזכורת לישיבה השבועית ביום שני.\n\nZoom link: https://zoom.example.com/meeting\n\nSee you / להתראות!',
      scheduledAt: '2026-04-14T07:00:00.000Z',
      sent: false,
    }),
    scheduled_whatsapp: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS — 5 EXTREME EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

const extremeEvents = [

  // ── X1. Maximum length title + description ───────────────────────────────────
  {
    id:          'SEED-EVENT-EXTREME-LONGTEXT',
    title:       '[EXTREME: LONG TEXT] ' + 'A'.repeat(200) + ' — Long Title Test',
    description: '[EXTREME] This description is intentionally very long to test how the UI handles overflow, truncation, and layout wrapping. '.repeat(15).trim(),
    date:        '2026-05-01',
    start_time:  null,
    end_time:    null,
    color:       'rose',
    all_day:     1,
    scheduled_email: null,
    scheduled_whatsapp: null,
  },

  // ── X2. Special characters / injection attempts ──────────────────────────────
  {
    id:          'SEED-EVENT-EXTREME-SPECIALCHARS',
    title:       "[EXTREME: SPECIAL CHARS] <script>alert('xss')</script> & \"quotes\" 'apostrophe' -- SQL; DROP TABLE events;",
    description: 'Tests that the app safely stores and displays special characters without executing them.\n\nHTML: <b>bold</b> <img src=x onerror=alert(1)>\nSQL:  \' OR \'1\'=\'1\nJSON: {"key":"val","arr":[1,2,3]}\nUnicode escapes: \\u0041 \\u05D0',
    date:        '2026-05-02',
    start_time:  '00:00',
    end_time:    '23:59',
    color:       'amber',
    all_day:     0,
    scheduled_email: null,
    scheduled_whatsapp: null,
  },

  // ── X3. Emoji + RTL heavy ─────────────────────────────────────────────────────
  {
    id:          'SEED-EVENT-EXTREME-EMOJI',
    title:       '[EXTREME: EMOJI] 🎉🕍✡️🕯️🌟 חג שמח Happy Holiday 🎊🥳🙏❤️🎁',
    description: '🔴 Red event with maximum emoji density.\n\nEmoji in every line:\n🌅 Sunrise: 06:00\n🕐 Mincha: 17:30\n🕯️ Candle lighting: 19:05\n🌙 Havdalah: 20:15\n\nMultiple scripts: English, עברית, عربي, Ελληνικά\n\n🔥💡⭐🎯🏆🎵😊🙌👏💪🤝',
    date:        '2026-05-03',
    start_time:  '09:00',
    end_time:    '21:00',
    color:       'indigo',
    all_day:     0,
    scheduled_email: null,
    scheduled_whatsapp: JSON.stringify({
      id: 'SEED-WA-EXTREME-EMOJI',
      to: '+972521234567',
      message: '🎉 *חג שמח* 🎉\n\nHappy Holiday! 🕍\n_May it be joyful_ ✨\n\n```special monospace text```\n\n~strikethrough test~',
      scheduledAt: '2026-05-03T06:00:00.000Z',
      sent: false,
    }),
  },

  // ── X4. All optional fields populated ────────────────────────────────────────
  {
    id:          'SEED-EVENT-EXTREME-ALLFILLED',
    title:       '[EXTREME: ALL FIELDS] Fully Populated Event — אירוע מלא',
    description: 'Every optional field is filled to test that nothing is dropped or lost during read/write cycles.',
    date:        '2026-12-31',
    start_time:  '08:30',
    end_time:    '23:45',
    color:       'violet',
    all_day:     0,
    scheduled_email: JSON.stringify({
      id: 'SEED-EMAIL-EXTREME-ALL',
      to: ['a@example.com', 'b@example.com', 'c@example.com', 'd@example.com', 'e@example.com'],
      subject: '[EXTREME] New Year Eve Event Reminder — תזכורת ערב ראש השנה',
      body: 'Dear all / לכולם,\n\nThis is a fully populated email with many recipients.\n\nLine 2\nLine 3\nLine 4\n\nBest regards,\nבברכה,\nThe Calendar App',
      scheduledAt: '2026-12-31T06:00:00.000Z',
      sent: false,
    }),
    scheduled_whatsapp: JSON.stringify({
      id: 'SEED-WA-EXTREME-ALL',
      to: '+972509876543',
      message: '[EXTREME] Both email AND WhatsApp scheduled for the same event.\nThis tests dual-channel scheduling.\n\nשני ערוצים — מייל ו-WhatsApp יחד.',
      scheduledAt: '2026-12-31T07:00:00.000Z',
      sent: false,
    }),
  },

  // ── X5. Minimal — only required fields, everything else null ─────────────────
  {
    id:          'SEED-EVENT-EXTREME-MINIMAL',
    title:       '[EXTREME: MINIMAL] Title Only',
    description: null,
    date:        '2026-01-01',
    start_time:  null,
    end_time:    null,
    color:       'indigo',
    all_day:     1,
    scheduled_email:    null,
    scheduled_whatsapp: null,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE LOGS — 3 NORMAL
// ─────────────────────────────────────────────────────────────────────────────

const normalLogs = [

  // ── 1. English — pending WhatsApp ────────────────────────────────────────────
  {
    id:           'SEED-LOG-EN-001',
    type:         'whatsapp',
    status:       'pending',
    recipient:    '+1234567890',
    subject:      null,
    message:      '[EXAMPLE] Hi! This is a reminder for the Team Birthday Party on April 10th at 3pm. See you there! 🎂',
    scheduled_at: '2026-04-10T12:00:00.000Z',
    sent_at:      null,
    error:        null,
    event_id:     'SEED-EVENT-EN-001',
  },

  // ── 2. Hebrew — sent email ───────────────────────────────────────────────────
  {
    id:           'SEED-LOG-HE-001',
    type:         'email',
    status:       'sent',
    recipient:    'family@example.com',
    subject:      '[דוגמה] תזכורת לארוחת שבת',
    message:      'שלום משפחה יקרה,\n\nתזכורת לארוחת שבת הערב בשעה 19:30.\nמחכים לכולם!\n\nשבת שלום 🕯️',
    scheduled_at: '2026-04-11T14:00:00.000Z',
    sent_at:      '2026-04-11T14:00:03.000Z',
    error:        null,
    event_id:     'SEED-EVENT-HE-001',
  },

  // ── 3. Mixed — failed WhatsApp ───────────────────────────────────────────────
  {
    id:           'SEED-LOG-MIX-001',
    type:         'whatsapp',
    status:       'failed',
    recipient:    '+972501111111',
    subject:      null,
    message:      '[EXAMPLE / דוגמה] Weekly team meeting reminder — תזכורת לישיבה השבועית.\n\nMonday 10am / יום שני 10:00.',
    scheduled_at: '2026-04-14T07:00:00.000Z',
    sent_at:      null,
    error:        'WhatsApp API error 131047: Message failed to send because more than 24 hours have passed since the customer last replied.',
    event_id:     'SEED-EVENT-MIX-001',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE LOGS — 5 EXTREME EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

const extremeLogs = [

  // ── X1. Very long message + very long error ───────────────────────────────────
  {
    id:           'SEED-LOG-EXTREME-LONGTEXT',
    type:         'email',
    status:       'failed',
    recipient:    'longtest@example.com',
    subject:      '[EXTREME: LONG TEXT] ' + 'Subject '.repeat(20).trim(),
    message:      '[EXTREME] Long message body. '.repeat(100).trim(),
    scheduled_at: '2026-05-01T08:00:00.000Z',
    sent_at:      null,
    error:        'SMTP connection error: ' + 'Error detail '.repeat(50).trim(),
    event_id:     'SEED-EVENT-EXTREME-LONGTEXT',
  },

  // ── X2. Many email recipients ─────────────────────────────────────────────────
  {
    id:           'SEED-LOG-EXTREME-MANYRECIPIENTS',
    type:         'email',
    status:       'sent',
    recipient:    'r1@example.com,r2@example.com,r3@example.com,r4@example.com,r5@example.com,r6@example.com,r7@example.com,r8@example.com,r9@example.com,r10@example.com',
    subject:      '[EXTREME: MANY RECIPIENTS] Bulk send test — 10 recipients',
    message:      'This message was sent to 10 recipients simultaneously to test bulk email handling.',
    scheduled_at: '2026-05-02T09:00:00.000Z',
    sent_at:      '2026-05-02T09:00:05.000Z',
    error:        null,
    event_id:     null,   // no associated event — standalone message
  },

  // ── X3. Emoji + special chars in message ──────────────────────────────────────
  {
    id:           'SEED-LOG-EXTREME-EMOJI',
    type:         'whatsapp',
    status:       'sent',
    recipient:    '+972521234567',
    subject:      null,
    message:      '🎉 *חג שמח* 🎉\n\nHappy Holiday! 🕍\n_May it be joyful_ ✨\n\n```special monospace text```\n\n~strikethrough test~\n\nSpecial: <>&"\' \\n \\t',
    scheduled_at: '2026-05-03T06:00:00.000Z',
    sent_at:      '2026-05-03T06:00:01.000Z',
    error:        null,
    event_id:     'SEED-EVENT-EXTREME-EMOJI',
  },

  // ── X4. Pending far in the future ─────────────────────────────────────────────
  {
    id:           'SEED-LOG-EXTREME-FUTURESCHEDULED',
    type:         'whatsapp',
    status:       'pending',
    recipient:    '+972509876543',
    subject:      null,
    message:      '[EXTREME: FUTURE] This message is scheduled for New Year Eve 2026 at midnight. Tests that far-future pending messages stay pending and are not picked up early by the cron job.',
    scheduled_at: '2026-12-31T22:00:00.000Z',
    sent_at:      null,
    error:        null,
    event_id:     'SEED-EVENT-EXTREME-ALLFILLED',
  },

  // ── X5. Standalone log with no event, minimal fields ─────────────────────────
  {
    id:           'SEED-LOG-EXTREME-NOPARENT',
    type:         'email',
    status:       'sent',
    recipient:    'standalone@example.com',
    subject:      '[EXTREME: NO PARENT EVENT] Standalone message',
    message:      'This log entry has no event_id — it was sent directly from the Messages page, not from an event. Tests that the log panel handles missing parent events gracefully.',
    scheduled_at: '2026-03-01T10:00:00.000Z',
    sent_at:      '2026-03-01T10:00:02.000Z',
    error:        null,
    event_id:     null,  // intentionally no parent event
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// INSERT
// ─────────────────────────────────────────────────────────────────────────────

async function insertEvents(rows, label) {
  for (const e of rows) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO events
              (id, title, description, date, start_time, end_time, color, all_day,
               scheduled_email, scheduled_whatsapp, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`,
      args: [
        e.id, e.title, e.description ?? null, e.date,
        e.start_time ?? null, e.end_time ?? null,
        e.color, e.all_day,
        e.scheduled_email ?? null, e.scheduled_whatsapp ?? null,
      ],
    });
    console.log(`  ✅ event  [${label}]  ${e.id}`);
  }
}

async function insertLogs(rows, label) {
  for (const l of rows) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO message_logs
              (id, type, status, recipient, subject, message,
               scheduled_at, sent_at, error, event_id, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
      args: [
        l.id, l.type, l.status, l.recipient,
        l.subject ?? null, l.message ?? null,
        l.scheduled_at, l.sent_at ?? null,
        l.error ?? null, l.event_id ?? null,
      ],
    });
    console.log(`  ✅ log    [${label}]  ${l.id}`);
  }
}

console.log('─── Inserting NORMAL events ───────────────────────────────────');
await insertEvents(normalEvents, 'normal');

console.log('\n─── Inserting EXTREME events ──────────────────────────────────');
await insertEvents(extremeEvents, 'extreme');

console.log('\n─── Inserting NORMAL message logs ─────────────────────────────');
await insertLogs(normalLogs, 'normal');

console.log('\n─── Inserting EXTREME message logs ────────────────────────────');
await insertLogs(extremeLogs, 'extreme');

// ── Summary ───────────────────────────────────────────────────────────────────

const { rows: evRows } = await db.execute('SELECT COUNT(*) as n FROM events');
const { rows: lgRows } = await db.execute('SELECT COUNT(*) as n FROM message_logs');

console.log('\n─── Done ───────────────────────────────────────────────────────');
console.log(`  events        total: ${evRows[0].n}`);
console.log(`  message_logs  total: ${lgRows[0].n}`);
console.log('\n  Open the app or run: turso db shell <name>');
console.log('  then: SELECT id, title, date FROM events ORDER BY date;');
