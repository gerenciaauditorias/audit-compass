import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useOrganization } from '@/lib/organization';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MemberManagement } from '@/components/admin/MemberManagement';
import { Plus, Building2, Users, Loader2, Check, ChevronRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Organizations() {
  const { organizations, currentOrg, setCurrentOrg, refreshOrganizations, currentMembership } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single();
      
      setIsSuperAdmin(data?.is_super_admin ?? false);
    };

    checkSuperAdmin();
  }, [user]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newOrgName.trim()) return;

    setLoading(true);

    // Create organization (only super admins can do this via RLS)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: newOrgName.trim() })
      .select()
      .single();

    if (orgError) {
      toast({
        variant: 'destructive',
        title: 'Error al crear organización',
        description: isSuperAdmin 
          ? orgError.message 
          : 'Solo los super administradores pueden crear organizaciones',
      });
      setLoading(false);
      return;
    }

    // Add user as admin
    const { error: memberError } = await supabase.from('memberships').insert({
      org_id: org.id,
      user_id: user.id,
      role: 'admin',
    });

    if (memberError) {
      toast({
        variant: 'destructive',
        title: 'Error al agregar miembro',
        description: memberError.message,
      });
    } else {
      toast({
        title: 'Organización creada',
        description: `${newOrgName} ha sido creada exitosamente`,
      });
      setNewOrgName('');
      setDialogOpen(false);
      await refreshOrganizations();
    }

    setLoading(false);
  };

  const isCurrentOrgAdmin = currentMembership?.role === 'admin' || isSuperAdmin;

  return (
    <AppLayout>
      <div className="px-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Organizaciones</h1>
            <p className="text-sm text-muted-foreground">{organizations.length} organizaciones</p>
          </div>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <>
                <Link to="/admin">
                  <Button size="sm" variant="outline" className="h-9">
                    <ShieldCheck className="h-4 w-4 mr-1" />
                    Admin
                  </Button>
                </Link>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-9 gradient-primary text-primary-foreground">
                      <Plus className="h-4 w-4 mr-1" />
                      Nueva
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="font-display">Nueva Organización</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateOrg} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="orgName">Nombre de la organización</Label>
                        <Input
                          id="orgName"
                          placeholder="Ej: Mi Empresa S.A."
                          value={newOrgName}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full gradient-primary text-primary-foreground"
                        disabled={loading || !newOrgName.trim()}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creando...
                          </>
                        ) : (
                          'Crear Organización'
                        )}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Organizations List */}
        {organizations.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-3">
              No perteneces a ninguna organización
            </p>
            <p className="text-sm text-muted-foreground">
              Contacta a un administrador para ser invitado
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {organizations.map((org) => (
              <Card
                key={org.id}
                className={`shadow-card border-0 cursor-pointer transition-all ${
                  currentOrg?.id === org.id 
                    ? 'ring-2 ring-accent' 
                    : 'hover:shadow-elevated'
                }`}
                onClick={() => {
                  setCurrentOrg(org);
                  if (currentOrg?.id === org.id) {
                    setShowMembers(!showMembers);
                  } else {
                    setShowMembers(true);
                  }
                }}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-display font-semibold text-foreground">
                      {org.name}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {currentOrg?.id === org.id && currentMembership?.role === 'admin' ? 'Administrador' : 'Miembro'}
                    </p>
                  </div>
                  {currentOrg?.id === org.id ? (
                    <div className="p-1.5 rounded-full bg-accent">
                      <Check className="h-4 w-4 text-accent-foreground" />
                    </div>
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Member Management for current org */}
        {currentOrg && showMembers && (
          <div className="mt-4">
            <MemberManagement
              orgId={currentOrg.id}
              orgName={currentOrg.name}
              isAdmin={isCurrentOrgAdmin}
            />
          </div>
        )}

        {!isSuperAdmin && (
          <p className="text-center text-xs text-muted-foreground">
            Solo los super administradores pueden crear nuevas organizaciones
          </p>
        )}
      </div>
    </AppLayout>
  );
}
