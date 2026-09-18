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
      {/* Mobile Top Header (Sticky) */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card/80 backdrop-blur-md border-b border-border flex items-center px-4 z-50">
        <img src="/logo.png" alt="Planner Logo" className="w-8 h-8 mr-2 object-contain" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">Planner</h1>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4">
        <div className="flex items-center mb-8 mt-4 px-2">
          <img src="/logo.png" alt="Planner Logo" className="w-8 h-8 mr-3 object-contain" />
          <h1 className="text-2xl font-bold tracking-tight">Planner</h1>
        </div>
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
      <main className="flex-1 flex flex-col h-full relative overflow-y-auto overflow-x-hidden pt-14 md:pt-0">
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
