import Link from 'next/link';
import { FiChevronRight } from 'react-icons/fi';

// Same gradient as components/dashboard/KPICard.jsx, so the phone tiles read as
// the same cards as the desktop KPI row.
const TILE_BG = 'bg-gradient-to-br from-purple-800 via-indigo-800 to-[#2563EB]';

// Phone-only 2x2 summary tiles (the gradient KPI cards take over from sm up) —
// each tile is just a big number and its label. With an `href` the tile is a
// tap target to the matching page; without one it is a plain, non-tappable tile.
export default function MobileKPITiles({ items }) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:hidden">
      {items.map(({ label, value, href, icon }) => {
        const Tile = href ? Link : 'div';
        return (
          <Tile
            key={label}
            {...(href ? { href } : {})}
            className={`flex flex-col gap-3 rounded-2xl p-4 text-white shadow-sm transition ${TILE_BG} ${href ? 'active:opacity-90' : ''}`}
          >
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 text-white shrink-0">{icon}</span>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-1">
                <p className={`font-bold tabular-nums tracking-tight truncate ${String(value).length > 7 ? 'text-xl' : 'text-3xl'}`}>{value}</p>
                {href && <FiChevronRight className="w-4 h-4 text-white/70 shrink-0" />}
              </div>
              <p className="text-sm text-white/80 mt-0.5">{label}</p>
            </div>
          </Tile>
        );
      })}
    </div>
  );
}
