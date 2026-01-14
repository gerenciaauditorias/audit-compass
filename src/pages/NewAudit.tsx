import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganization } from '@/lib/organization';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Calendar } from 'lucide-react';

const ISO_STANDARDS = [
  'ISO 9001:2015',
  'ISO 14001:2015',
  'ISO 27001:2022',
  'ISO 45001:2018',
  'ISO 22000:2018',
  'ISO 50001:2018',
  'ISO 37001:2016',
  'ISO 22301:2019',
];

export default function NewAudit() {
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    iso_standard: '',
    planned_start_date: '',
    planned_end_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentOrg || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes estar en una organización para crear auditorías',
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('audit_plans').insert({
      org_id: currentOrg.id,
      title: formData.title,
      description: formData.description || null,
      iso_standard: formData.iso_standard,
      planned_start_date: formData.planned_start_date || null,
      planned_end_date: formData.planned_end_date || null,
      created_by: user.id,
      status: 'draft',
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error al crear auditoría',
        description: error.message,
      });
    } else {
      toast({
        title: 'Auditoría creada',
        description: 'La auditoría ha sido creada exitosamente',
      });
      navigate('/audits');
    }

    setLoading(false);
  };

  if (!currentOrg) {
    return (
      <AppLayout>
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground">Selecciona una organización primero</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Nueva Auditoría</h1>
            <p className="text-sm text-muted-foreground">{currentOrg.name}</p>
          </div>
        </div>

        <Card className="border-0 shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display">Información General</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título de la auditoría *</Label>
                <Input
                  id="title"
                  placeholder="Ej: Auditoría interna Q1 2024"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="iso_standard">Norma ISO *</Label>
                <Select
                  value={formData.iso_standard}
                  onValueChange={(value) => setFormData({ ...formData, iso_standard: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar norma" />
                  </SelectTrigger>
                  <SelectContent>
                    {ISO_STANDARDS.map((standard) => (
                      <SelectItem key={standard} value={standard}>
                        {standard}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Descripción y alcance de la auditoría..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Fecha inicio</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="start_date"
                      type="date"
                      className="pl-9"
                      value={formData.planned_start_date}
                      onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Fecha fin</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="end_date"
                      type="date"
                      className="pl-9"
                      value={formData.planned_end_date}
                      onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 gradient-primary text-primary-foreground"
                disabled={loading || !formData.title || !formData.iso_standard}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Auditoría'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
