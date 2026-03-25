import { useState } from 'react';
import { ChevronDown, ChevronRight, User, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { Badge } from '@/shared/components/ui/Badge';
import type { Entry } from '../../../utils/types';
import { formatDate } from '../../../utils/helpers';

interface DayGroup {
  date: string;
  dayNumber: number;
  entries: Entry[];
}

export default function EntryHistory({ history }: { history: DayGroup[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  if (!history.length) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <h3 className="text-base font-semibold text-slate-100 mb-4">Entry History</h3>
      <div className="space-y-3">
        {history.map(({ date, dayNumber, entries }) => (
          <div key={date}>
            <div className="flex items-center gap-2 py-2 text-sm font-semibold text-slate-200">
              <span className="bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded text-xs font-semibold">
                Day {dayNumber}
              </span>
              {formatDate(date)}
              <span className="text-slate-500 text-xs font-normal">— {entries[0]?.project}</span>
            </div>

            <div className="space-y-2">
              {entries.map((e) => {
                const isOpen = expanded[e.id];
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => toggle(e.id)}
                    className="w-full text-left bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 flex flex-col gap-1.5 hover:border-slate-500 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 font-medium text-slate-100 text-sm">
                      {isOpen ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
                      {e.title}
                    </div>

                    {e.technologies.length > 0 && (
                      <p className="text-xs text-slate-400 pl-5">
                        {e.technologies.map((t) => {
                          const subs = t.subTechs.length ? ` (${t.subTechs.join(', ')})` : '';
                          return `${t.tech}${subs}`;
                        }).join(' · ')}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 pl-5">
                      {e.categories.map((c) => <Badge key={c} color="indigo">{c}</Badge>)}
                      <Badge color={e.teamType === 'solo' ? 'slate' : 'amber'}>
                        <span className="flex items-center gap-1">
                          {e.teamType === 'solo' ? <User size={10} /> : <Users size={10} />}
                          {e.teamType}
                        </span>
                      </Badge>
                    </div>

                    {isOpen && e.description && (
                      <p className="text-xs text-slate-400 pl-5 pt-2 mt-1 border-t border-slate-700 whitespace-pre-wrap leading-relaxed">
                        {e.description}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
