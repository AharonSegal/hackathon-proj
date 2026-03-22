import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { useSettings } from '@/shared/context/SettingsContext';

interface CalendarHeaderProps {
  title: string;
  hebrewTitle: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function CalendarHeader({ title, hebrewTitle, onPrev, onNext, onToday }: CalendarHeaderProps) {
  const { settings } = useSettings();
  const isHebrew = settings.calendarMode === 'hebrew';

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            {isHebrew ? hebrewTitle : title}
          </h2>
          <p className="text-xs text-slate-500 font-hebrew">
            {isHebrew ? title : hebrewTitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onToday}>
          <CalendarDays size={14} />
          Today
        </Button>
        <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden">
          <button
            onClick={onPrev}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="w-px h-5 bg-slate-700" />
          <button
            onClick={onNext}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
