import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuditCard } from '@/components/dashboard/AuditCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganization } from '@/lib/organization';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Plus, Search, Loader2, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

type AuditPlan = Database['public']['Tables']['audit_plans']['Row'];

export default function Audits() {
  const { currentOrg } = useOrganization();
  const [audits, setAudits] = useState<AuditPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }

    const fetchAudits = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('audit_plans')
        .select('*')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAudits(data);
      }
      setLoading(false);
    };

    fetchAudits();
  }, [currentOrg]);

  const filteredAudits = audits.filter(audit => {
    const matchesSearch = audit.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.iso_standard.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || audit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!currentOrg) {
    return (
      <AppLayout>
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground">Selecciona una organización</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Auditorías</h1>
            <p className="text-sm text-muted-foreground">{audits.length} total</p>
          </div>
          <Link to="/audits/new">
            <Button size="sm" className="h-9 gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-1" />
              Nueva
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar auditorías..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Status Filter */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="w-full h-10 p-1">
            <TabsTrigger value="all" className="flex-1 text-xs">Todas</TabsTrigger>
            <TabsTrigger value="draft" className="flex-1 text-xs">Borrador</TabsTrigger>
            <TabsTrigger value="in_progress" className="flex-1 text-xs">Progreso</TabsTrigger>
            <TabsTrigger value="completed" className="flex-1 text-xs">Completas</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Audit List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAudits.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-3">
              {searchQuery || statusFilter !== 'all' 
                ? 'No se encontraron auditorías' 
                : 'No hay auditorías creadas'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link to="/audits/new">
                <Button variant="outline" size="sm">
                  Crear primera auditoría
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAudits.map((audit) => (
              <AuditCard
                key={audit.id}
                id={audit.id}
                title={audit.title}
                isoStandard={audit.iso_standard}
                status={audit.status}
                plannedDate={audit.planned_start_date ?? undefined}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
