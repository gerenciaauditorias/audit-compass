import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardCheck, FileText, Settings, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { href: '/audits', icon: ClipboardCheck, label: 'Auditorías' },
  { href: '/documents', icon: FileText, label: 'Documentos' },
  { href: '/organizations', icon: Building2, label: 'Org' },
  { href: '/settings', icon: Settings, label: 'Ajustes' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'mobile-nav-item flex-1',
                isActive && 'mobile-nav-item-active'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive ? 'text-accent' : 'text-muted-foreground')} />
              <span className={cn('text-[10px] font-medium', isActive ? 'text-accent' : 'text-muted-foreground')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
