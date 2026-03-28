/**
 * Settings/SettingsPage.tsx
 * --------------------------
 * App configuration page.
 *
 * Sections:
 * 0. Language — switch between Hebrew (RTL) and English (LTR)
 * 1. Calendar View — Hebrew vs Gregorian mode, week-start day
 * 2. Holidays & Events Display — toggles for which Hebrew calendar events to show
 * 3. Zmanim Location — lat/lng/timezone for prayer time calculations
 * 4. Times to Display — individual toggles for each zman
 * 5. Email / SMTP — server credentials + test button
 * 6. WhatsApp Business API — phone number ID, access token + test button
 *
 * All changes are immediately reflected via SettingsContext (localStorage).
 * The "Save" button also posts settings to /api/settings (best-effort).
 */

import { useState } from 'react';
import * as Switch from '@radix-ui/react-switch';
import { Save, TestTube2, MapPin } from 'lucide-react';
import { PageHeader } from '@/shared/components/Layout/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useSettings } from '@/shared/context/SettingsContext';
import { settingsApi } from '@/shared/hooks/useApi';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { useT } from '@/shared/i18n/useT';
import { Language, ClockStyle, ClockTheme } from '@/shared/types/settings.types';
import { WORLD_CITIES } from '@/shared/data/worldCities';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">{children}</h2>;
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={clsx('flex items-center justify-between py-2.5', disabled && 'opacity-40')}>
      <div>
        <p className="text-sm text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="w-10 h-5 rounded-full bg-slate-700 data-[state=checked]:bg-primary-600 transition-colors outline-none focus:ring-2 focus:ring-primary-500/50"
      >
        <Switch.Thumb className="block w-4 h-4 rounded-full bg-white shadow translate-x-0.5 data-[state=checked]:translate-x-5 transition-transform" />
      </Switch.Root>
    </div>
  );
}

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const t = useT();
  const [saving, setSaving] = useState(false);
  const [testingWA, setTestingWA] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testWATo, setTestWATo] = useState('');
  const [testEmailTo, setTestEmailTo] = useState('');

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.save(settings);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings to server');
      // Settings are still saved locally via context
    } finally {
      setSaving(false);
    }
  };

  const handleTestWA = async () => {
    if (!testWATo) return;
    setTestingWA(true);
    try {
      await settingsApi.testWhatsApp(testWATo);
      toast.success('WhatsApp test message sent!');
    } catch {
      toast.error('WhatsApp test failed — check credentials');
    } finally {
      setTestingWA(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailTo) return;
    setTestingEmail(true);
    try {
      await settingsApi.testEmail(testEmailTo);
      toast.success('Test email sent!');
    } catch {
      toast.error('Email test failed — check SMTP settings');
    } finally {
      setTestingEmail(false);
    }
  };

  const h = settings.holidays;
  const z = settings.zmanim;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t.settings_title}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={resetSettings}>
              {t.btn_reset}
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              <Save size={14} />
              {t.btn_save}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* ── Language ── */}
          <section className="card space-y-1">
            <SectionTitle>{t.section_language}</SectionTitle>
            <div className="flex gap-3">
              {(['he', 'en'] as Language[]).map(lang => (
                <button
                  key={lang}
                  onClick={() => updateSettings({ language: lang })}
                  className={clsx(
                    'flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors',
                    settings.language === lang
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500',
                  )}
                >
                  {lang === 'he' ? t.lang_hebrew : t.lang_english}
                </button>
              ))}
            </div>
          </section>

          {/* ── Calendar View ── */}
          <section className="card space-y-1">
            <SectionTitle>{t.section_calendar}</SectionTitle>
            <div className="flex gap-3 mb-4">
              {(['hebrew', 'gregorian'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => updateSettings({ calendarMode: mode })}
                  className={clsx(
                    'flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors',
                    settings.calendarMode === mode
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500',
                  )}
                >
                  {mode === 'hebrew' ? t.mode_hebrew : t.mode_gregorian}
                </button>
              ))}
            </div>
            <ToggleRow
              label={t.week_starts_monday}
              checked={settings.weekStart === 1}
              onCheckedChange={v => updateSettings({ weekStart: v ? 1 : 0 })}
            />
          </section>

          {/* ── Holidays ── */}
          <section className="card">
            <SectionTitle>{t.section_holidays}</SectionTitle>
            <div className="divide-y divide-slate-800">
              <ToggleRow label={t.holiday_major}     description={t.holiday_major_desc}     checked={h.majorHolidays}   onCheckedChange={v => updateSettings({ holidays: { ...h, majorHolidays: v } })} />
              <ToggleRow label={t.holiday_minor}     description={t.holiday_minor_desc}     checked={h.minorHolidays}   onCheckedChange={v => updateSettings({ holidays: { ...h, minorHolidays: v } })} />
              <ToggleRow label={t.rosh_chodesh}      description={t.rosh_chodesh_desc}      checked={h.roshChodesh}     onCheckedChange={v => updateSettings({ holidays: { ...h, roshChodesh: v } })} />
              <ToggleRow label={t.shabbat_highlight} description={t.shabbat_highlight_desc} checked={h.shabbat}         onCheckedChange={v => updateSettings({ holidays: { ...h, shabbat: v } })} />
              <ToggleRow label={t.parashat}          description={t.parashat_desc}          checked={h.parashat}        onCheckedChange={v => updateSettings({ holidays: { ...h, parashat: v } })} />
              <ToggleRow label={t.daf_yomi}                                                 checked={h.dafYomi}         onCheckedChange={v => updateSettings({ holidays: { ...h, dafYomi: v } })} />
              <ToggleRow label={t.sefirat_omer}      description={t.sefirat_omer_desc}      checked={h.omerCount}       onCheckedChange={v => updateSettings({ holidays: { ...h, omerCount: v } })} />
              <ToggleRow label={t.israeli_holidays}  description={t.israeli_holidays_desc}  checked={h.israelHolidays}  onCheckedChange={v => updateSettings({ holidays: { ...h, israelHolidays: v } })} />
              <ToggleRow label={t.diaspora}          description={t.diaspora_desc}          checked={h.diaspora}        onCheckedChange={v => updateSettings({ holidays: { ...h, diaspora: v } })} />
            </div>
          </section>

          {/* ── Zmanim Location ── */}
          <section className="card space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle>{t.section_zmanim_location}</SectionTitle>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin size={12} />
                {z.location.name}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t.field_city_name}
                value={z.location.name}
                onChange={e => updateSettings({ zmanim: { ...z, location: { ...z.location, name: e.target.value } } })}
              />
              <Input
                label={t.field_timezone}
                value={z.location.timezone}
                onChange={e => updateSettings({ zmanim: { ...z, location: { ...z.location, timezone: e.target.value } } })}
                hint={t.hint_timezone}
              />
              <Input
                label={t.field_latitude}
                type="number"
                value={z.location.lat}
                onChange={e => updateSettings({ zmanim: { ...z, location: { ...z.location, lat: parseFloat(e.target.value) } } })}
              />
              <Input
                label={t.field_longitude}
                type="number"
                value={z.location.lng}
                onChange={e => updateSettings({ zmanim: { ...z, location: { ...z.location, lng: parseFloat(e.target.value) } } })}
              />
            </div>
            <SectionTitle>{t.section_times_display}</SectionTitle>
            <div className="divide-y divide-slate-800">
              <ToggleRow label={t.alot_hashachar} checked={z.showAlotHashachar} onCheckedChange={v => updateSettings({ zmanim: { ...z, showAlotHashachar: v } })} />
              <ToggleRow label={t.misheyakir}     checked={z.showMisheyakir}    onCheckedChange={v => updateSettings({ zmanim: { ...z, showMisheyakir: v } })} />
              <ToggleRow label={t.sunrise}        checked={z.showSunrise}       onCheckedChange={v => updateSettings({ zmanim: { ...z, showSunrise: v } })} />
              <ToggleRow label={t.sof_zman_shma}  checked={z.showSofZmanShma}   onCheckedChange={v => updateSettings({ zmanim: { ...z, showSofZmanShma: v } })} />
              <ToggleRow label={t.sof_zman_tfilla}checked={z.showSofZmanTfilla} onCheckedChange={v => updateSettings({ zmanim: { ...z, showSofZmanTfilla: v } })} />
              <ToggleRow label={t.chatzot}        checked={z.showChatzot}       onCheckedChange={v => updateSettings({ zmanim: { ...z, showChatzot: v } })} />
              <ToggleRow label={t.mincha_gedola}  checked={z.showMinchaGedola}  onCheckedChange={v => updateSettings({ zmanim: { ...z, showMinchaGedola: v } })} />
              <ToggleRow label={t.plag_hamincha}  checked={z.showPlagHamincha}  onCheckedChange={v => updateSettings({ zmanim: { ...z, showPlagHamincha: v } })} />
              <ToggleRow label={t.sunset}         checked={z.showSunset}        onCheckedChange={v => updateSettings({ zmanim: { ...z, showSunset: v } })} />
              <ToggleRow label={t.tzet}           checked={z.showTzet}          onCheckedChange={v => updateSettings({ zmanim: { ...z, showTzet: v } })} />
              <ToggleRow label={t.tzet_shabbat}   checked={z.showTzetShabbat}   onCheckedChange={v => updateSettings({ zmanim: { ...z, showTzetShabbat: v } })} />
            </div>
          </section>

          {/* ── Email SMTP ── */}
          <section className="card space-y-3">
            <SectionTitle>{t.section_email}</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Input label={t.field_smtp_host} value={settings.smtpHost} onChange={e => updateSettings({ smtpHost: e.target.value })} />
              <Input label={t.field_smtp_port} type="number" value={settings.smtpPort} onChange={e => updateSettings({ smtpPort: parseInt(e.target.value) })} />
              <Input label={t.field_smtp_user} value={settings.smtpUser} onChange={e => updateSettings({ smtpUser: e.target.value })} />
              <Input label={t.field_from_name} value={settings.emailFromName} onChange={e => updateSettings({ emailFromName: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="test@example.com"
                value={testEmailTo}
                onChange={e => setTestEmailTo(e.target.value)}
                className="flex-1"
              />
              <Button variant="secondary" size="sm" onClick={handleTestEmail} loading={testingEmail}>
                <TestTube2 size={13} />
                {t.btn_test_email}
              </Button>
            </div>
          </section>

          {/* ── WhatsApp ── */}
          <section className="card space-y-3">
            <SectionTitle>{t.section_whatsapp}</SectionTitle>
            <Input
              label={t.field_phone_id}
              value={settings.whatsappPhoneNumberId}
              onChange={e => updateSettings({ whatsappPhoneNumberId: e.target.value })}
              hint={t.hint_phone_id}
            />
            <Input
              label={t.field_access_token}
              type="password"
              value={settings.whatsappAccessToken}
              onChange={e => updateSettings({ whatsappAccessToken: e.target.value })}
              hint={t.hint_access_token}
            />
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="+972501234567"
                value={testWATo}
                onChange={e => setTestWATo(e.target.value)}
                className="flex-1"
              />
              <Button variant="whatsapp" size="sm" onClick={handleTestWA} loading={testingWA}>
                <TestTube2 size={13} />
                {t.btn_test_wa}
              </Button>
            </div>
          </section>

          {/* ── Weather ── */}
          <section className="card space-y-3">
            <SectionTitle>{t.section_weather}</SectionTitle>
            <p className="text-xs text-slate-500">{t.weather_location_note}</p>
            <div className="divide-y divide-slate-800">
              <ToggleRow
                label={t.weather_show_widget}
                checked={settings.weather.show}
                onCheckedChange={v => updateSettings({ weather: { ...settings.weather, show: v } })}
              />
            </div>
            <div>
              <p className="text-sm text-slate-200 mb-2">{t.weather_unit_label}</p>
              <div className="flex gap-3">
                {(['celsius', 'fahrenheit'] as const).map(u => (
                  <button
                    key={u}
                    onClick={() => updateSettings({ weather: { ...settings.weather, unit: u } })}
                    className={clsx(
                      'flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors',
                      settings.weather.unit === u
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-slate-600 text-slate-400 hover:border-slate-500',
                    )}
                  >
                    {u === 'celsius' ? t.weather_celsius : t.weather_fahrenheit}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Clock ── */}
          <ClockSettingsSection />

        </div>
      </div>
    </div>
  );
}

// ── Clock settings section ────────────────────────────────────────────────────

const CLOCK_STYLES: { value: ClockStyle; label: string }[] = [
  { value: 'digital', label: 'Digital' },
  { value: 'analog',  label: 'Analog'  },
  { value: 'minimal', label: 'Minimal' },
];

const CLOCK_THEMES: { value: ClockTheme; color: string; label: string }[] = [
  { value: 'purple',  color: 'bg-violet-400',  label: 'Purple'  },
  { value: 'blue',    color: 'bg-blue-400',    label: 'Blue'    },
  { value: 'amber',   color: 'bg-amber-400',   label: 'Amber'   },
  { value: 'emerald', color: 'bg-emerald-400', label: 'Emerald' },
  { value: 'rose',    color: 'bg-rose-400',    label: 'Rose'    },
  { value: 'slate',   color: 'bg-slate-300',   label: 'Slate'   },
];

function TzSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors">
        <Select.Value />
        <Select.Icon><ChevronDown size={14} className="text-slate-400" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-64 overflow-y-auto rounded-xl bg-slate-800 border border-slate-700 shadow-xl py-1"
        >
          <Select.Viewport>
            {WORLD_CITIES.map(city => (
              <Select.Item
                key={city.tz + city.label}
                value={city.tz}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-slate-700 focus:bg-slate-700 focus:outline-none data-[highlighted]:bg-slate-700 select-none"
              >
                <Select.ItemText>{city.label}</Select.ItemText>
                <Select.ItemIndicator className="ml-auto">
                  <Check size={12} className="text-primary-400" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function ClockSettingsSection() {
  const { settings, updateSettings } = useSettings();
  const clk = settings.clock;

  const updateClock = (patch: Partial<typeof clk>) =>
    updateSettings({ clock: { ...clk, ...patch } });

  const updateClockEntry = (idx: 0 | 1 | 2, patch: Partial<typeof clk.clocks[0]>) => {
    const next = [...clk.clocks] as typeof clk.clocks;
    next[idx] = { ...next[idx], ...patch };
    updateClock({ clocks: next });
  };

  return (
    <section className="card space-y-4">
      <SectionTitle>Clock</SectionTitle>

      <div className="divide-y divide-slate-800">
        <ToggleRow
          label="Show clock widget"
          checked={clk.show}
          onCheckedChange={v => updateClock({ show: v })}
        />
        <ToggleRow
          label="Show seconds"
          checked={clk.showSeconds}
          onCheckedChange={v => updateClock({ showSeconds: v })}
          disabled={!clk.show}
        />
        <ToggleRow
          label="24-hour format"
          checked={clk.use24h}
          onCheckedChange={v => updateClock({ use24h: v })}
          disabled={!clk.show}
        />
      </div>

      {/* Style picker */}
      <div className={clsx(!clk.show && 'opacity-40 pointer-events-none')}>
        <p className="text-sm text-slate-200 mb-2">Style</p>
        <div className="flex gap-2">
          {CLOCK_STYLES.map(s => (
            <button
              key={s.value}
              onClick={() => updateClock({ style: s.value })}
              className={clsx(
                'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                clk.style === s.value
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'border-slate-600 text-slate-400 hover:border-slate-500',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color theme picker */}
      <div className={clsx(!clk.show && 'opacity-40 pointer-events-none')}>
        <p className="text-sm text-slate-200 mb-2">Accent color</p>
        <div className="flex gap-2 flex-wrap">
          {CLOCK_THEMES.map(th => (
            <button
              key={th.value}
              onClick={() => updateClock({ theme: th.value })}
              title={th.label}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                clk.theme === th.value
                  ? 'border-slate-400 bg-slate-700 text-slate-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500',
              )}
            >
              <span className={clsx('w-2.5 h-2.5 rounded-full', th.color)} />
              {th.label}
            </button>
          ))}
        </div>
      </div>

      {/* Per-clock slot editors */}
      <div className={clsx('space-y-3', !clk.show && 'opacity-40 pointer-events-none')}>
        <p className="text-sm text-slate-200">World clocks (up to 3)</p>
        {([0, 1, 2] as const).map(idx => {
          const entry = clk.clocks[idx];
          return (
            <div key={idx} className="rounded-lg border border-slate-700 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Clock {idx + 1}
                </span>
                <Switch.Root
                  checked={entry.show}
                  onCheckedChange={v => updateClockEntry(idx, { show: v })}
                  className="w-8 h-4 rounded-full bg-slate-700 data-[state=checked]:bg-primary-600 transition-colors outline-none focus:ring-2 focus:ring-primary-500/50"
                >
                  <Switch.Thumb className="block w-3 h-3 rounded-full bg-white shadow translate-x-0.5 data-[state=checked]:translate-x-4 transition-transform" />
                </Switch.Root>
              </div>
              <input
                type="text"
                value={entry.label}
                onChange={e => updateClockEntry(idx, { label: e.target.value })}
                placeholder="Label (e.g. Home)"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
              />
              <TzSelect
                value={entry.tz}
                onChange={v => updateClockEntry(idx, { tz: v })}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
