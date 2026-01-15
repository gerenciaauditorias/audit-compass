import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function Setup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);
  const [step, setStep] = useState<'check' | 'register' | 'promote' | 'done'>('check');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-setup`,
        { method: 'GET' }
      );
      
      const data = await response.json();
      
      if (data.hasAdmin) {
        setSetupComplete(true);
        toast({
          title: 'Setup ya completado',
          description: 'Ya existe un super administrador. Redirigiendo al login...',
        });
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setStep('register');
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
      toast({
        title: 'Error',
        description: 'No se pudo verificar el estado de configuración',
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  };

  const handleRegisterAndPromote = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Register the user
      setStep('register');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });

      if (signUpError) throw signUpError;

      if (!signUpData.session) {
        toast({
          title: 'Verifica tu email',
          description: 'Se ha enviado un enlace de confirmación a tu correo. Una vez confirmado, vuelve a iniciar sesión.',
        });
        setLoading(false);
        return;
      }

      // Step 2: Promote to super admin
      setStep('promote');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-setup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${signUpData.session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al configurar admin');
      }

      setStep('done');
      toast({
        title: '¡Configuración completada!',
        description: 'Tu cuenta ha sido creada como Super Administrador.',
      });

      setTimeout(() => navigate('/dashboard'), 1500);

    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: 'Error en la configuración',
        description: error.message,
        variant: 'destructive',
      });
      setStep('register');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verificando estado de configuración...</p>
        </div>
      </div>
    );
  }

  if (setupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <CheckCircle className="h-12 w-12 mx-auto text-emerald-500" />
          <h2 className="text-xl font-semibold">Setup ya completado</h2>
          <p className="text-muted-foreground">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Configuración Inicial</CardTitle>
          <CardDescription>
            Crea la primera cuenta de Super Administrador para gestionar la plataforma ISO Audit Pro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegisterAndPromote} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Tu nombre"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {step === 'register' && 'Creando cuenta...'}
                  {step === 'promote' && 'Configurando permisos de administrador...'}
                  {step === 'done' && '¡Completado!'}
                </span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Configurando...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Crear cuenta de Super Admin
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium">Importante</p>
                <p className="mt-1">
                  Esta página solo está disponible cuando no existe ningún administrador. 
                  Una vez creado, solo el Super Admin puede invitar a otros usuarios.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
