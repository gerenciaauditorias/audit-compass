import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { AuditCard } from '@/components/dashboard/AuditCard';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/lib/organization';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { ClipboardCheck, FileText, AlertTriangle, CheckCircle2, Plus, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

type AuditPlan = Database['public']['Tables']['audit_plans']['Row'];
type AuditFinding = Database['public']['Tables']['audit_findings']['Row'];

export default function Dashboard() {
  const { currentOrg, loading: orgLoading } = useOrganization();
  const [audits, setAudits] = useState<AuditPlan[]>([]);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      
      const [auditsRes, findingsRes, docsRes] = await Promise.all([
        supabase
          .from('audit_plans')
          .select('*')
          .eq('org_id', currentOrg.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('audit_findings')
          .select('*')
          .eq('org_id', currentOrg.id),
        supabase
          .from('documents')
          .select('id', { count: 'exact' })
          .eq('org_id', currentOrg.id),
      ]);

      setAudits(auditsRes.data ?? []);
      setFindings(findingsRes.data ?? []);
      setDocumentsCount(docsRes.count ?? 0);
      setLoading(false);
    };

    fetchData();
  }, [currentOrg]);

  const stats = {
    totalAudits: audits.length,
    completedAudits: audits.filter(a => a.status === 'completed').length,
    totalFindings: findings.length,
    openFindings: findings.filter(f => !f.resolved_at).length,
    criticalFindings: findings.filter(f => f.severity === 'critical' && !f.resolved_at).length,
  };

  if (orgLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!currentOrg) {
    return (
      <AppLayout>
        <div className="px-4 py-8 text-center">
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-display font-bold text-foreground mb-2">
              Bienvenido a ISO Audit Pro
            </h2>
            <p className="text-muted-foreground mb-6">
              Para comenzar, necesitas unirte a una organización o crear una nueva.
            </p>
            <Link to="/organizations">
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Gestionar Organizaciones
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 space-y-6">
        {/* Welcome Section */}
        <div className="pt-2">
          <h1 className="text-xl font-display font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentOrg.name}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="Auditorías"
            value={stats.totalAudits}
            icon={<ClipboardCheck className="h-5 w-5" />}
            variant="default"
          />
          <StatCard
            title="Completadas"
            value={stats.completedAudits}
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="accent"
          />
          <StatCard
            title="Hallazgos Abiertos"
            value={stats.openFindings}
            icon={<AlertTriangle className="h-5 w-5" />}
            variant={stats.criticalFindings > 0 ? 'destructive' : 'warning'}
          />
          <StatCard
            title="Documentos"
            value={documentsCount}
            icon={<FileText className="h-5 w-5" />}
            variant="default"
          />
        </div>

        {/* Recent Audits */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-display font-semibold text-foreground">
              Auditorías Recientes
            </h2>
            <Link to="/audits/new">
              <Button size="sm" className="h-8 gradient-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-1" />
                Nueva
              </Button>
            </Link>
          </div>

          {audits.length === 0 ? (
            <div className="text-center py-8 bg-card rounded-xl border border-border">
              <ClipboardCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No hay auditorías aún
              </p>
              <Link to="/audits/new">
                <Button variant="outline" size="sm" className="mt-3">
                  Crear primera auditoría
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {audits.map((audit) => (
                <AuditCard
                  key={audit.id}
                  id={audit.id}
                  title={audit.title}
                  isoStandard={audit.iso_standard}
                  status={audit.status}
                  plannedDate={audit.planned_start_date ?? undefined}
                  findingsCount={findings.filter(f => f.plan_id === audit.id).length}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
