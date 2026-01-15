import { useState, useEffect } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Database } from '@/integrations/supabase/types';
import { Plus, UserPlus, Trash2, Edit2, Loader2, Users } from 'lucide-react';

type OrgRole = Database['public']['Enums']['org_role'];

interface Member {
  id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  profile: {
    email: string | null;
    full_name: string | null;
  } | null;
}

interface MemberManagementProps {
  orgId: string;
  orgName: string;
  isAdmin: boolean;
}

export function MemberManagement({ orgId, orgName, isAdmin }: MemberManagementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<OrgRole>('member');
  const [submitting, setSubmitting] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('memberships')
      .select(`
        id,
        user_id,
        role,
        created_at,
        profiles:user_id (
          email,
          full_name
        )
      `)
      .eq('org_id', orgId);

    if (error) {
      console.error('Error fetching members:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los miembros',
      });
    } else {
      // Transform data to match our interface
      const transformedData = (data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        created_at: m.created_at,
        profile: m.profiles,
      }));
      setMembers(transformedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [orgId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    setSubmitting(true);

    // Find user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', newMemberEmail.trim().toLowerCase())
      .single();

    if (profileError || !profile) {
      toast({
        variant: 'destructive',
        title: 'Usuario no encontrado',
        description: 'No existe un usuario con ese email. El usuario debe registrarse primero.',
      });
      setSubmitting(false);
      return;
    }

    // Check if already a member
    const existingMember = members.find(m => m.user_id === profile.id);
    if (existingMember) {
      toast({
        variant: 'destructive',
        title: 'Ya es miembro',
        description: 'Este usuario ya pertenece a la organización',
      });
      setSubmitting(false);
      return;
    }

    // Add membership
    const { error: insertError } = await supabase.from('memberships').insert({
      org_id: orgId,
      user_id: profile.id,
      role: newMemberRole,
      invited_by: user?.id,
    });

    if (insertError) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: insertError.message,
      });
    } else {
      toast({
        title: 'Miembro agregado',
        description: `${newMemberEmail} ha sido agregado a ${orgName}`,
      });
      setNewMemberEmail('');
      setNewMemberRole('member');
      setAddDialogOpen(false);
      fetchMembers();
    }

    setSubmitting(false);
  };

  const handleUpdateRole = async () => {
    if (!selectedMember) return;

    setSubmitting(true);

    const { error } = await supabase
      .from('memberships')
      .update({ role: newMemberRole })
      .eq('id', selectedMember.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Rol actualizado',
        description: 'El rol del miembro ha sido actualizado',
      });
      setEditDialogOpen(false);
      setSelectedMember(null);
      fetchMembers();
    }

    setSubmitting(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: 'Miembro eliminado',
        description: 'El miembro ha sido removido de la organización',
      });
      fetchMembers();
    }
  };

  const openEditDialog = (member: Member) => {
    setSelectedMember(member);
    setNewMemberRole(member.role);
    setEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Users className="h-5 w-5" />
          Miembros ({members.length})
        </CardTitle>
        {isAdmin && (
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground">
                <UserPlus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Agregar Miembro</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddMember} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email del usuario</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    El usuario debe estar registrado en la plataforma
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as OrgRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Miembro</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  className="w-full gradient-primary text-primary-foreground"
                  disabled={submitting || !newMemberEmail.trim()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Agregando...
                    </>
                  ) : (
                    'Agregar Miembro'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No hay miembros</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                {isAdmin && <TableHead className="w-[100px]">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {member.profile?.full_name || 'Sin nombre'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.profile?.email || 'Sin email'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                      {member.role === 'admin' ? 'Administrador' : 'Miembro'}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {member.user_id !== user?.id && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(member)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar miembro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará a {member.profile?.full_name || member.profile?.email} 
                                  de la organización. Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Editar Rol</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Usuario</Label>
              <p className="text-sm text-muted-foreground">
                {selectedMember?.profile?.full_name || selectedMember?.profile?.email}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">Nuevo Rol</Label>
              <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as OrgRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Miembro</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleUpdateRole}
              className="w-full gradient-primary text-primary-foreground"
              disabled={submitting}
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
    </Card>
  );
}
