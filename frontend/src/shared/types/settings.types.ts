/**
 * shared/types/settings.types.ts
 * --------------------------------
 * TypeScript interfaces for app settings + the DEFAULT_SETTINGS object.
 *
 * Settings are stored in localStorage (via SettingsContext) and control:
 * - calendarMode / weekStart — how the calendar grid is rendered
 * - holidays — which Hebrew calendar events appear on the grid
 * - zmanim — location + which prayer times to display on DailyTimes page
 * - smtpHost/Port/User / emailFromName — email configuration
 * - whatsappPhoneNumberId / whatsappAccessToken — WhatsApp Business API credentials
 */

export type CalendarMode = 'gregorian' | 'hebrew';

export type WeekStart = 0 | 1; // 0 = Sunday, 1 = Monday

export interface HolidaySettings {
  // Jewish holidays
  majorHolidays: boolean;     // Rosh Hashana, Yom Kippur, Pesach, etc.
  minorHolidays: boolean;     // Chanuka, Purim, etc.
  roshChodesh: boolean;       // New month
  shabbat: boolean;           // Shabbat highlight
  parashat: boolean;          // Weekly parasha
  dafYomi: boolean;           // Daf Yomi
  omerCount: boolean;         // Counting of the Omer
  // Israeli
  israelHolidays: boolean;    // Yom Haatzmaut, Yom Hazikaron, etc.
  // Location
  diaspora: boolean;          // Use diaspora calendar (2-day yom tov)
}

export interface ZmanimSettings {
  location: {
    lat: number;
    lng: number;
    name: string;
    timezone: string;
  };
  showAlotHashachar: boolean;
  showMisheyakir: boolean;
  showSunrise: boolean;
  showSofZmanShma: boolean;
  showSofZmanTfilla: boolean;
  showChatzot: boolean;
  showMinchaGedola: boolean;
  showPlagHamincha: boolean;
  showSunset: boolean;
  showTzet: boolean;
  showTzetShabbat: boolean;
}

export interface AppSettings {
  calendarMode: CalendarMode;
  weekStart: WeekStart;
  holidays: HolidaySettings;
  zmanim: ZmanimSettings;
  // Email
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  emailFromName: string;
  // WhatsApp
  whatsappPhoneNumberId: string;
  whatsappAccessToken: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  calendarMode: 'hebrew',
  weekStart: 0,
  holidays: {
    majorHolidays: true,
    minorHolidays: true,
    roshChodesh: true,
    shabbat: true,
    parashat: true,
    dafYomi: false,
    omerCount: false,
    israelHolidays: true,
    diaspora: false,
  },
  zmanim: {
    location: {
      lat: 31.7683,
      lng: 35.2137,
      name: 'Jerusalem',
      timezone: 'Asia/Jerusalem',
    },
    showAlotHashachar: true,
    showMisheyakir: false,
    showSunrise: true,
    showSofZmanShma: true,
    showSofZmanTfilla: true,
    showChatzot: true,
    showMinchaGedola: true,
    showPlagHamincha: true,
    showSunset: true,
    showTzet: true,
    showTzetShabbat: true,
  },
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpUser: '',
  emailFromName: 'Calendar App',
  whatsappPhoneNumberId: '',
  whatsappAccessToken: '',
};
