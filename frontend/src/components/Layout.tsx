import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CalendarDays, Settings as SettingsIcon, Book, LayoutList } from 'lucide-react';
import clsx from 'clsx';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const navItems = [
    { name: 'Today', path: '/today', icon: LayoutList },
    { name: 'Calendar', path: '/calendar', icon: CalendarDays },
    { name: 'Notes', path: '/notes', icon: Book },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4">
        <h1 className="text-2xl font-bold mb-8 mt-4 tracking-tight px-2">Planner</h1>
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                  isActive ? "bg-secondary text-secondary-foreground font-medium" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )
              }
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-y-auto overflow-x-hidden">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around items-center p-2 pb-safe z-50">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={clsx(
                "flex flex-col items-center p-2 rounded-lg transition-colors",
                isActive ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <item.icon size={24} className={clsx("mb-1", isActive ? "stroke-[2.5px]" : "stroke-2")} />
              <span className="text-[10px]">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
