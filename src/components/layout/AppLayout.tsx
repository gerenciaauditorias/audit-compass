import { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { MobileNav } from './MobileNav';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="pb-20 pt-2">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
