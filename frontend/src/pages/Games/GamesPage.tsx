import { useState } from 'react';
import { Gamepad2, Play, X } from 'lucide-react';
import { useT } from '@/shared/i18n/useT';

const GAMES = [
  {
    id: 'kart-racer-phaser',
    title: 'Kart Racer Pro',
    description: 'Full Mario Kart experience — Phaser 3 engine, 6 karts, drift boost, 9 items, AI rubberbanding, minimap & more.',
    emoji: '🏆',
    tags: ['Racing', 'Arcade', 'Multiplayer'],
    src: '/games/kart-racer-phaser.html',
  },
  {
    id: 'kart-racer',
    title: 'Kart Racer (Classic)',
    description: 'Top-down Mario Kart–style racing with AI opponents, items, and 3-lap circuits.',
    emoji: '🏎️',
    tags: ['Racing', 'Arcade'],
    src: '/games/kart-racer.html',
  },
];

export function GamesPage() {
  const t = useT();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const active = GAMES.find(g => g.id === activeGame);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3 shrink-0">
        <Gamepad2 size={22} className="text-primary-400" />
        <div>
          <h1 className="text-xl font-semibold text-slate-100">{t.nav_games}</h1>
          <p className="text-sm text-slate-500">Pick a game and play</p>
        </div>
      </div>

      {/* Game viewer */}
      {active ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800 shrink-0 bg-slate-900">
            <span className="text-slate-300 font-medium text-sm">{active.emoji} {active.title}</span>
            <button
              onClick={() => setActiveGame(null)}
              className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors px-2 py-1 rounded hover:bg-slate-800"
            >
              <X size={14} /> Back to games
            </button>
          </div>
          <iframe
            src={active.src}
            title={active.title}
            className="flex-1 w-full border-0 bg-black"
            allow="autoplay"
          />
        </div>
      ) : (
        /* Game grid */
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto">
          {GAMES.map(game => (
            <div
              key={game.id}
              className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-primary-500 transition-colors group"
            >
              {/* Thumbnail */}
              <div className="h-36 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-6xl select-none">
                {game.emoji}
              </div>

              <div className="p-4">
                <h2 className="text-slate-100 font-semibold text-base mb-1">{game.title}</h2>
                <p className="text-slate-400 text-sm mb-3 leading-snug">{game.description}</p>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {game.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setActiveGame(game.id)}
                  className="flex items-center gap-2 w-full justify-center py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors"
                >
                  <Play size={14} fill="currentColor" /> Play
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
