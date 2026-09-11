import { NavLink } from "react-router";

export function HotBar() {

  const menuItems = [
    { name: "Dashboard", path: "/" },
    { name: "Transactions", path: "/transactions" },
    { name: "Budgets", path: "/budgets" },
    { name: "Reports", path: "/reports" },
  ]

  return (
    <div>
      <aside className="bg-brand-yellow border border-surface-border p-4 flex flex-col w-64 h-full rounded-r-lg">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `p-2 rounded hover:bg-surface-hover font-bold ${isActive ? "bg-surface-hove text-surface-dark" : ""}`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </aside>
    </div>
  );
}