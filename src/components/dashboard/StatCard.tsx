import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'accent' | 'warning' | 'destructive';
}

export function StatCard({ title, value, icon, trend, variant = 'default' }: StatCardProps) {
  const iconBgClasses = {
    default: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card className="shadow-card border-0 animate-slide-up">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-display font-bold text-foreground">{value}</p>
            {trend && (
              <p className={cn(
                'text-xs font-medium',
                trend.value >= 0 ? 'text-accent' : 'text-destructive'
              )}>
                {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div className={cn('p-2.5 rounded-xl', iconBgClasses[variant])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
