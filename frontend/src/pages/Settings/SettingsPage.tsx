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
import { Language } from '@/shared/types/settings.types';

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
        </div>
      </div>
    </div>
  );
}
