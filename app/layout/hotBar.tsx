import type { ReactNode } from "react";
import { NavLink } from "react-router";

const icone = (d: string): ReactNode => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const menuItems = [
  { name: "Início", path: "/", end: true, icon: icone("M3 11l9-8 9 8M5 10v10h14V10") },
  { name: "Registrar", path: "/registrar", end: false, icon: icone("M12 5v14M5 12h14") },
  { name: "Gastos", path: "/listar", end: false, icon: icone("M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01") },
];

export function HotBar() {
  return (
    <>
      {/* Desktop: barra lateral */}
      <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-56 shrink-0 flex-col gap-1 border-r border-surface-border bg-surface-dark p-3 md:flex">
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-yellow text-on-brand" : "text-zinc-300 hover:bg-surface-hover hover:text-white"
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile: barra inferior, fácil de alcançar com o polegar */}
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-surface-border bg-surface-dark/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${isActive ? "text-brand-yellow" : "text-zinc-400"}`
            }
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
