/**
 * shared/components/NotificationPicker.tsx
 * -----------------------------------------
 * Reusable notification picker — lets users add / remove multiple browser
 * notification reminders for an event or todo.
 *
 * Usage:
 *   <NotificationPicker value={notifications} onChange={setNotifications} hasTime={!allDay} />
 *
 * `hasTime` controls which presets are shown:
 *   - true  → time-relative offsets (at event time, 5 min before, …)
 *   - false → day-relative offsets  (on the day at 9 AM, 1 day before, …)
 */

import { useState } from 'react';
import { Bell, X, Plus, Check } from 'lucide-react';
import { BrowserNotification } from '@/shared/types/event.types';

// ── Theme (matches TaskEditor / dark palette) ─────────────────────────────────

const T = {
  bgMain:    '#1e293b',
  bgSection: '#0f172a',
  bgHover:   '#273347',
  border:    '#334155',
  borderFocus: '#6366f1',
  textPrim:  '#f1f5f9',
  textSec:   '#94a3b8',
  textMuted: '#64748b',
  primary:   '#6366f1',
};

// ── Preset options ────────────────────────────────────────────────────────────

interface Preset { label: string; offsetMinutes: number }

const PRESETS_WITH_TIME: Preset[] = [
  { label: 'At event time',   offsetMinutes: 0    },
  { label: '5 min before',    offsetMinutes: 5    },
  { label: '15 min before',   offsetMinutes: 15   },
  { label: '30 min before',   offsetMinutes: 30   },
  { label: '1 hour before',   offsetMinutes: 60   },
  { label: '2 hours before',  offsetMinutes: 120  },
  { label: '1 day before',    offsetMinutes: 1440 },
  { label: '1 week before',   offsetMinutes: 10080},
];

const PRESETS_ALL_DAY: Preset[] = [
  { label: 'On the day (9 AM)',    offsetMinutes: 0    },
  { label: '1 day before (9 AM)',  offsetMinutes: 1440 },
  { label: '1 week before (9 AM)', offsetMinutes: 10080},
];

function labelFor(offsetMinutes: number, hasTime: boolean): string {
  const presets = hasTime ? PRESETS_WITH_TIME : PRESETS_ALL_DAY;
  return presets.find(p => p.offsetMinutes === offsetMinutes)?.label
    ?? `${offsetMinutes} min before`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface NotificationPickerProps {
  value: BrowserNotification[];
  onChange: (v: BrowserNotification[]) => void;
  hasTime?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NotificationPicker({ value, onChange, hasTime = false }: NotificationPickerProps) {
  const [open, setOpen] = useState(false);
  const presets = hasTime ? PRESETS_WITH_TIME : PRESETS_ALL_DAY;

  const add = (offsetMinutes: number) => {
    // Prevent duplicates
    if (value.some(n => n.offsetMinutes === offsetMinutes)) return;
    onChange([...value, { id: crypto.randomUUID(), offsetMinutes }]);
  };

  const remove = (id: string) => {
    onChange(value.filter(n => n.id !== id));
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Existing notification chips */}
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {value.map(n => (
            <span key={n.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)',
              borderRadius: 20, padding: '4px 10px', fontSize: 12, color: T.primary,
            }}>
              <Bell size={11} />
              {labelFor(n.offsetMinutes, hasTime)}
              <button
                type="button"
                onClick={() => remove(n.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: T.textMuted }}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          border: `1px dashed ${open ? T.primary : T.border}`,
          borderRadius: 20, padding: '5px 12px', fontSize: 12,
          color: open ? T.primary : T.textMuted,
          background: open ? 'rgba(99,102,241,0.08)' : 'transparent',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        <Plus size={12} />
        Add reminder
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: 4,
          background: T.bgMain, border: `1px solid ${T.border}`, borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)', minWidth: 200, overflow: 'hidden',
        }}>
          {presets.map(p => {
            const selected = value.some(n => n.offsetMinutes === p.offsetMinutes);
            return (
              <div
                key={p.offsetMinutes}
                onClick={() => { add(p.offsetMinutes); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 14px', cursor: selected ? 'default' : 'pointer',
                  fontSize: 13,
                  color: selected ? T.textMuted : T.textPrim,
                  background: 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = T.bgHover; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Bell size={13} color={selected ? T.textMuted : T.primary} />
                <span style={{ flex: 1 }}>{p.label}</span>
                {selected && <Check size={12} color={T.textMuted} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
