import { useState } from 'react';
import * as Switch from '@radix-ui/react-switch';
import { Save, TestTube2, MapPin } from 'lucide-react';
import { PageHeader } from '@/shared/components/Layout/PageHeader';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { useSettings } from '@/shared/context/SettingsContext';
import { settingsApi } from '@/shared/hooks/useApi';
import { toast } from 'sonner';
import { clsx } from 'clsx';

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
        title="Settings"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={resetSettings}>
              Reset
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              <Save size={14} />
              Save
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Calendar View */}
          <section className="card space-y-1">
            <SectionTitle>Calendar View</SectionTitle>
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
                  {mode === 'hebrew' ? '🕍 Hebrew Calendar' : '📅 Gregorian Calendar'}
                </button>
              ))}
            </div>
            <ToggleRow
              label="Week starts Monday"
              checked={settings.weekStart === 1}
              onCheckedChange={v => updateSettings({ weekStart: v ? 1 : 0 })}
            />
          </section>

          {/* Holidays */}
          <section className="card">
            <SectionTitle>Holidays & Events Display</SectionTitle>
            <div className="divide-y divide-slate-800">
              <ToggleRow label="Major Holidays" description="Rosh Hashana, Yom Kippur, Pesach, Shavuot, Sukkot…" checked={h.majorHolidays} onCheckedChange={v => updateSettings({ holidays: { ...h, majorHolidays: v } })} />
              <ToggleRow label="Minor Holidays" description="Chanuka, Purim, Tu BiShvat, Lag BaOmer…" checked={h.minorHolidays} onCheckedChange={v => updateSettings({ holidays: { ...h, minorHolidays: v } })} />
              <ToggleRow label="Rosh Chodesh" description="New Hebrew month" checked={h.roshChodesh} onCheckedChange={v => updateSettings({ holidays: { ...h, roshChodesh: v } })} />
              <ToggleRow label="Shabbat Highlight" description="Highlight Shabbat on calendar" checked={h.shabbat} onCheckedChange={v => updateSettings({ holidays: { ...h, shabbat: v } })} />
              <ToggleRow label="Parashat HaShavua" description="Weekly Torah portion" checked={h.parashat} onCheckedChange={v => updateSettings({ holidays: { ...h, parashat: v } })} />
              <ToggleRow label="Daf Yomi" checked={h.dafYomi} onCheckedChange={v => updateSettings({ holidays: { ...h, dafYomi: v } })} />
              <ToggleRow label="Sefirat HaOmer" description="Counting of the Omer" checked={h.omerCount} onCheckedChange={v => updateSettings({ holidays: { ...h, omerCount: v } })} />
              <ToggleRow label="Israeli Holidays" description="Yom HaAtzmaut, Yom HaZikaron, Yom Yerushalayim" checked={h.israelHolidays} onCheckedChange={v => updateSettings({ holidays: { ...h, israelHolidays: v } })} />
              <ToggleRow label="Diaspora Calendar" description="2-day Yom Tov outside Israel" checked={h.diaspora} onCheckedChange={v => updateSettings({ holidays: { ...h, diaspora: v } })} />
            </div>
          </section>

          {/* Zmanim Location */}
          <section className="card space-y-4">
            <div className="flex items-center justify-between">
              <SectionTitle>Zmanim Location</SectionTitle>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPin size={12} />
                {z.location.name}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City / Location name"
                value={z.location.name}
                onChange={e => updateSettings({ zmanim: { ...z, location: { ...z.location, name: e.target.value } } })}
              />
              <Input
                label="Timezone (IANA)"
                value={z.location.timezone}
                onChange={e => updateSettings({ zmanim: { ...z, location: { ...z.location, timezone: e.target.value } } })}
                hint="e.g. Asia/Jerusalem"
              />
              <Input
                label="Latitude"
                type="number"
                value={z.location.lat}
                onChange={e => updateSettings({ zmanim: { ...z, location: { ...z.location, lat: parseFloat(e.target.value) } } })}
              />
              <Input
                label="Longitude"
                type="number"
                value={z.location.lng}
                onChange={e => updateSettings({ zmanim: { ...z, location: { ...z.location, lng: parseFloat(e.target.value) } } })}
              />
            </div>
            <SectionTitle>Times to Display</SectionTitle>
            <div className="divide-y divide-slate-800">
              <ToggleRow label="Alot HaShachar" checked={z.showAlotHashachar} onCheckedChange={v => updateSettings({ zmanim: { ...z, showAlotHashachar: v } })} />
              <ToggleRow label="Misheyakir" checked={z.showMisheyakir} onCheckedChange={v => updateSettings({ zmanim: { ...z, showMisheyakir: v } })} />
              <ToggleRow label="Sunrise / Hanetz" checked={z.showSunrise} onCheckedChange={v => updateSettings({ zmanim: { ...z, showSunrise: v } })} />
              <ToggleRow label="Sof Zman Kriat Shma" checked={z.showSofZmanShma} onCheckedChange={v => updateSettings({ zmanim: { ...z, showSofZmanShma: v } })} />
              <ToggleRow label="Sof Zman Tfilla" checked={z.showSofZmanTfilla} onCheckedChange={v => updateSettings({ zmanim: { ...z, showSofZmanTfilla: v } })} />
              <ToggleRow label="Chatzot" checked={z.showChatzot} onCheckedChange={v => updateSettings({ zmanim: { ...z, showChatzot: v } })} />
              <ToggleRow label="Mincha Gedola" checked={z.showMinchaGedola} onCheckedChange={v => updateSettings({ zmanim: { ...z, showMinchaGedola: v } })} />
              <ToggleRow label="Plag HaMincha" checked={z.showPlagHamincha} onCheckedChange={v => updateSettings({ zmanim: { ...z, showPlagHamincha: v } })} />
              <ToggleRow label="Sunset / Shkia" checked={z.showSunset} onCheckedChange={v => updateSettings({ zmanim: { ...z, showSunset: v } })} />
              <ToggleRow label="Tzet HaKochavim" checked={z.showTzet} onCheckedChange={v => updateSettings({ zmanim: { ...z, showTzet: v } })} />
              <ToggleRow label="Tzet Shabbat (Rabbeinu Tam)" checked={z.showTzetShabbat} onCheckedChange={v => updateSettings({ zmanim: { ...z, showTzetShabbat: v } })} />
            </div>
          </section>

          {/* Email SMTP */}
          <section className="card space-y-3">
            <SectionTitle>Email / SMTP</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Input label="SMTP Host" value={settings.smtpHost} onChange={e => updateSettings({ smtpHost: e.target.value })} />
              <Input label="SMTP Port" type="number" value={settings.smtpPort} onChange={e => updateSettings({ smtpPort: parseInt(e.target.value) })} />
              <Input label="Username / Email" value={settings.smtpUser} onChange={e => updateSettings({ smtpUser: e.target.value })} />
              <Input label="From Name" value={settings.emailFromName} onChange={e => updateSettings({ emailFromName: e.target.value })} />
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
                Test Email
              </Button>
            </div>
          </section>

          {/* WhatsApp */}
          <section className="card space-y-3">
            <SectionTitle>WhatsApp Business API</SectionTitle>
            <Input
              label="Phone Number ID"
              value={settings.whatsappPhoneNumberId}
              onChange={e => updateSettings({ whatsappPhoneNumberId: e.target.value })}
              hint="From Meta Business → WhatsApp → API Setup"
            />
            <Input
              label="Access Token"
              type="password"
              value={settings.whatsappAccessToken}
              onChange={e => updateSettings({ whatsappAccessToken: e.target.value })}
              hint="Permanent token from Meta for Developers"
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
                Test WA
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
