/**
 * pages/DailyLog/services/exportService.ts
 * ------------------------------------------
 * Client-side export helpers — generate and trigger downloads without
 * requiring a server round-trip.
 *
 * Exported functions:
 * - exportCSV(entries)        — converts Entry[] to CSV and downloads as
 *                               worklog_YYYY-MM-DD.csv
 * - exportSchemaJSON(schema)  — serialises the Schema to pretty JSON and
 *                               downloads as worklog_schema.json
 */

import type { Entry, Schema } from '../utils/types';
import { entriesToCSV, downloadFile } from '../utils/helpers';

export function exportCSV(entries: Entry[]) {
  const csv = entriesToCSV(entries);
  const date = new Date().toISOString().split('T')[0];
  downloadFile(csv, `worklog_export_${date}.csv`, 'text/csv');
}

export function exportSchemaJSON(schema: Schema) {
  const json = JSON.stringify(schema, null, 2);
  const date = new Date().toISOString().split('T')[0];
  downloadFile(json, `worklog_schema_${date}.json`, 'application/json');
}
