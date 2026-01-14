import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface AuditCardProps {
  id: string;
  title: string;
  isoStandard: string;
  status: 'draft' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
  plannedDate?: string;
  findingsCount?: number;
}

const statusConfig = {
  draft: { label: 'Borrador', class: 'status-draft' },
  planned: { label: 'Planificada', class: 'status-planned' },
  in_progress: { label: 'En progreso', class: 'status-in-progress' },
  completed: { label: 'Completada', class: 'status-completed' },
  cancelled: { label: 'Cancelada', class: 'status-draft' },
};

export function AuditCard({ id, title, isoStandard, status, plannedDate, findingsCount }: AuditCardProps) {
  const statusInfo = statusConfig[status];

  return (
    <Link to={`/audits/${id}`}>
      <Card className="shadow-card border-0 hover:shadow-elevated transition-shadow cursor-pointer animate-slide-up">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <Badge variant="secondary" className="font-medium">
              {isoStandard}
            </Badge>
            <span className={cn('status-badge', statusInfo.class)}>
              {statusInfo.label}
            </span>
          </div>
          
          <h3 className="font-display font-semibold text-foreground mb-2 line-clamp-2">
            {title}
          </h3>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {plannedDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(plannedDate).toLocaleDateString('es-ES', { 
                    day: 'numeric', 
                    month: 'short' 
                  })}
                </span>
              )}
              {findingsCount !== undefined && (
                <span>{findingsCount} hallazgos</span>
              )}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
