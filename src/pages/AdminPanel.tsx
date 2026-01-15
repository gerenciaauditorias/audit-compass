import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { MemberManagement } from '@/components/admin/MemberManagement';
import { Database } from '@/integrations/supabase/types';
import {
  Plus,
  Building2,
  Users,
  Loader2,
  Trash2,
  Edit2,
  Shield,
  ShieldCheck,
} from 'lucide-react';

type Organization = Database['public']['Tables']['organizations']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  
  // Dialog states
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [editOrgDialogOpen, setEditOrgDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single();

      if (!data?.is_super_admin) {
        toast({
          variant: 'destructive',
          title: 'Acceso denegado',
          description: 'Solo los super administradores pueden acceder a este panel',
        });
        navigate('/dashboard');
        return;
      }

      setIsSuperAdmin(true);
      fetchData();
    };

    checkAccess();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch all organizations (super admin can see all)
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .order('name');

    if (orgsError) {
      console.error('Error fetching orgs:', orgsError);
    } else {
      setOrganizations(orgs || []);
    }

    // Fetch all users - super admin can see all via RLS
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, is_super_admin, created_at, updated_at')
      .order('email');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else {
      setUsers((profiles as Profile[]) || []);
    }

    setLoading(false);
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setSubmitting(true);

    const { data: org, error } = await supabase
      .from('organizations')
      .insert({ name: newOrgName.trim() })
      .select()
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      // Add current user as admin
      await supabase.from('memberships').insert({
        org_id: org.id,
        user_id: user?.id,
        role: 'admin',
      });

      toast({
        title: 'Organización creada',
        description: `${newOrgName} ha sido creada exitosamente`,
      });
      setNewOrgName('');
      setOrgDialogOpen(false);
      fetchData();
    }

    setSubmitting(false);
  };

  const handleUpdateOrg = async () => {
    if (!selectedOrg || !newOrgName.trim()) return;

    setSubmitting(true);

    const { error } = await supabase
      .from('organizations')
      .update({ name: newOrgName.trim() })
      .eq('id', selectedOrg.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Organización actualizada',
        description: 'Los cambios han sido guardados',
      });
      setEditOrgDialogOpen(false);
      setSelectedOrg(null);
      setNewOrgName('');
      fetchData();
    }

    setSubmitting(false);
  };

  const handleDeleteOrg = async (orgId: string) => {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Organización eliminada',
        description: 'La organización ha sido eliminada',
      });
      if (selectedOrg?.id === orgId) {
        setSelectedOrg(null);
      }
      fetchData();
    }
  };

  const toggleSuperAdmin = async (profileId: string, currentStatus: boolean) => {
    if (profileId === user?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No puedes cambiar tu propio estado de super admin',
      });
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_super_admin: !currentStatus })
      .eq('id', profileId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Usuario actualizado',
        description: `El usuario ahora ${!currentStatus ? 'es' : 'no es'} super administrador`,
      });
      fetchData();
    }
  };

  const openEditOrgDialog = (org: Organization) => {
    setSelectedOrg(org);
    setNewOrgName(org.name);
    setEditOrgDialogOpen(true);
  };

  if (!isSuperAdmin || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 space-y-4">
        <div className="pt-2">
          <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Panel de Administración
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestión global de organizaciones y usuarios
          </p>
        </div>

        <Tabs defaultValue="organizations" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="organizations" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organizaciones
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuarios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organizations" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {organizations.length} organizaciones registradas
              </p>
              <Dialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gradient-primary text-primary-foreground">
                    <Plus className="h-4 w-4 mr-1" />
                    Nueva Organización
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-display">Nueva Organización</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateOrg} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Nombre</Label>
                      <Input
                        id="orgName"
                        placeholder="Nombre de la organización"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full gradient-primary text-primary-foreground"
                      disabled={submitting || !newOrgName.trim()}
                    >
                      {submitting ? (
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Organizations List */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-display">Lista de Organizaciones</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {organizations.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No hay organizaciones
                    </p>
                  ) : (
                    <div className="max-h-[400px] overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="w-[100px]">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {organizations.map((org) => (
                            <TableRow
                              key={org.id}
                              className={`cursor-pointer ${selectedOrg?.id === org.id ? 'bg-accent/50' : ''}`}
                              onClick={() => setSelectedOrg(org)}
                            >
                              <TableCell className="font-medium">{org.name}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditOrgDialog(org);
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar organización?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción eliminará "{org.name}" y todos sus datos
                                          asociados. Esta acción no se puede deshacer.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteOrg(org.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Selected Org Members */}
              {selectedOrg ? (
                <MemberManagement
                  orgId={selectedOrg.id}
                  orgName={selectedOrg.name}
                  isAdmin={true}
                />
              ) : (
                <Card className="border-border flex items-center justify-center">
                  <CardContent className="py-8 text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      Selecciona una organización para ver sus miembros
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              {users.length} usuarios registrados
            </p>

            <Card className="border-border">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {profile.full_name || 'Sin nombre'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {profile.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {profile.is_super_admin ? (
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Super Admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Usuario</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {profile.id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSuperAdmin(profile.id, profile.is_super_admin)}
                            >
                              {profile.is_super_admin ? (
                                <Shield className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ShieldCheck className="h-4 w-4 text-primary" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Organization Dialog */}
      <Dialog open={editOrgDialogOpen} onOpenChange={setEditOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Editar Organización</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="editOrgName">Nombre</Label>
              <Input
                id="editOrgName"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
              />
            </div>
            <Button
              onClick={handleUpdateOrg}
              className="w-full gradient-primary text-primary-foreground"
              disabled={submitting || !newOrgName.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
