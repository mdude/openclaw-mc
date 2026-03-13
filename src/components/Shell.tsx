'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { label: 'Tasks', href: '/', icon: '📋' },
  { label: 'Calendar', href: '/calendar', icon: '📅' },
  { label: 'Cron Jobs', href: '/cron', icon: '⏰' },
  { label: 'Memory', href: '/memory', icon: '🧠' },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => {
    const clean = pathname.replace(/^\/missioncontrol/, '') || '/';
    return clean === href;
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-gray-900 border-r border-gray-800 p-4">
        <h1 className="text-xl font-bold mb-6">🚀 Mission Control</h1>
        <nav className="space-y-1">
          {tabs.map(t => (
            <Link key={t.href} href={t.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                isActive(t.href) ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-gray-800 text-gray-400'
              }`}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-800 flex justify-around py-2 z-50">
        {tabs.map(t => (
          <Link key={t.href} href={t.href}
            className={`flex flex-col items-center text-xs py-1 px-3 ${
              isActive(t.href) ? 'text-blue-400' : 'text-gray-500'
            }`}>
            <span className="text-xl">{t.icon}</span>
            <span>{t.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
