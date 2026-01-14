import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LogOut, User, Loader2 } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    setFullName(user?.user_metadata?.full_name ?? '');
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
    }).eq('id', user.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: error.message,
      });
    } else {
      toast({
        title: 'Perfil actualizado',
        description: 'Tu información ha sido actualizada',
      });
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() ?? 'U';
  };

  return (
    <AppLayout>
      <div className="px-4 space-y-4">
        {/* Header */}
        <div className="pt-2">
          <h1 className="text-xl font-display font-bold text-foreground">Ajustes</h1>
          <p className="text-sm text-muted-foreground">Configura tu cuenta</p>
        </div>

        {/* Profile Card */}
        <Card className="border-0 shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <User className="h-5 w-5" />
              Mi Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-accent text-accent-foreground text-lg">
                  {getInitials(user?.user_metadata?.full_name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">
                  {user?.user_metadata?.full_name ?? 'Sin nombre'}
                </p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <Separator />

            {/* Profile Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email ?? ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                />
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="border-0 shadow-card">
          <CardContent className="p-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
