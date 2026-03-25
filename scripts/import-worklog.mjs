/**
 * scripts/import-worklog.mjs
 * ---------------------------
 * One-time import script: reads worklog_export_*.csv and upserts all entries
 * into the Turso database using INSERT OR REPLACE (idempotent).
 *
 * Usage:
 *   node scripts/import-worklog.mjs [path/to/export.csv]
 *
 * Defaults to: daily-work-logger-main/worklog_export_2026-03-23.csv
 *
 * Env vars required (reads from .env automatically):
 *   TURSO_DATABASE_URL
 *   TURSO_AUTH_TOKEN
 */

import { readFileSync } from 'node:fs';
import { randomUUID }   from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';

// ── Load .env ────────────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../.env');
try {
  const envText = readFileSync(envPath, 'utf8');
  for (const line of envText.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* .env not found — rely on real env vars */ }

// ── Connect ───────────────────────────────────────────────────────────────────
const url = process.env.TURSO_DATABASE_URL;
if (!url) { console.error('❌  TURSO_DATABASE_URL is not set'); process.exit(1); }

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

// ── CSV parser (handles quoted fields with embedded commas/newlines) ───────────
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"')            { inQuotes = false; }
      else                            { field += ch; }
    } else {
      if      (ch === '"')  { inQuotes = true; }
      else if (ch === ',')  { row.push(field); field = ''; }
      else if (ch === '\r' && next === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else                  { field += ch; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ── Technology parser: "Python (FastAPI, Pydantic) | MongoDB" → TechSelection[] ─
function parseTechnologies(techStr) {
  if (!techStr?.trim()) return [];
  return techStr.split('|').map(part => {
    part = part.trim();
    const m = part.match(/^(.+?)\s*\((.+)\)$/);
    if (m) {
      return { tech: m[1].trim(), subTechs: m[2].split(',').map(s => s.trim()).filter(Boolean) };
    }
    return { tech: part, subTechs: [] };
  }).filter(t => t.tech);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const csvPath = process.argv[2]
  ?? resolve(__dir, '../daily-work-logger-main/worklog_export_2026-03-23.csv');

console.log(`\n📂  Reading: ${csvPath}`);
const text = readFileSync(csvPath, 'utf8');
const [headerRow, ...dataRows] = parseCSV(text);

// Map header names to column indices
const col = {};
headerRow.forEach((h, i) => { col[h.trim()] = i; });

console.log(`📋  Found ${dataRows.length} entries\n`);

let inserted = 0, skipped = 0;

for (const row of dataRows) {
  if (row.length < 3 || !row[col.title]?.trim()) { skipped++; continue; }

  const date       = row[col.date]?.trim() ?? '';
  const dayNumber  = parseInt(row[col.dayNumber] ?? '1', 10);
  const project    = row[col.project]?.trim() ?? '';
  const categories = (row[col.categories] ?? '').split(';').map(s => s.trim()).filter(Boolean);
  const langs      = (row[col.codingLanguages] ?? '').split(';').map(s => s.trim()).filter(Boolean);
  const title      = row[col.title]?.trim() ?? '';
  const description = row[col.description]?.trim() ?? null;
  const technologies = parseTechnologies(row[col.technologies]);
  const teamType   = (row[col.teamType]?.trim() ?? 'solo') === 'team' ? 'team' : 'solo';
  const teamSize   = row[col.teamSize]?.trim() ? parseInt(row[col.teamSize], 10) : null;
  const createdAt  = row[col.createdAt]?.trim() || new Date().toISOString();
  const id         = randomUUID();

  await db.execute({
    sql: `INSERT OR REPLACE INTO worklog_entries
          (id, date, day_number, project, categories, title, description,
           technologies, team_type, team_size, coding_languages, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, date, dayNumber, project,
      JSON.stringify(categories),
      title, description || null,
      JSON.stringify(technologies),
      teamType, teamSize,
      JSON.stringify(langs),
      createdAt,
    ],
  });

  console.log(`  ✅  [${date}] ${title.slice(0, 60)}${title.length > 60 ? '…' : ''}`);
  inserted++;
}

console.log(`\n🎉  Done — ${inserted} inserted, ${skipped} skipped\n`);
process.exit(0);
