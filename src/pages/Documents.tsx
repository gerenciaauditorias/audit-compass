import { useEffect, useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useOrganization } from '@/lib/organization';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Search, Loader2, FileText, File, FileImage, 
  FileSpreadsheet, Trash2, Download, Upload
} from 'lucide-react';

type Document = Database['public']['Tables']['documents']['Row'];

const getFileIcon = (fileType?: string | null) => {
  if (!fileType) return File;
  if (fileType.includes('image')) return FileImage;
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet;
  if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
  return File;
};

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export default function Documents() {
  const { currentOrg, currentMembership } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = currentMembership?.role === 'admin';

  useEffect(() => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }

    const fetchDocuments = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setDocuments(data);
      }
      setLoading(false);
    };

    fetchDocuments();
  }, [currentOrg]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !currentOrg || !user) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const fileName = `${currentOrg.id}/${Date.now()}-${file.name}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('audit-docs')
        .upload(fileName, file);

      if (uploadError) {
        toast({
          variant: 'destructive',
          title: 'Error al subir archivo',
          description: uploadError.message,
        });
        continue;
      }

      // Create document record
      const { error: insertError } = await supabase.from('documents').insert({
        org_id: currentOrg.id,
        storage_path: fileName,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user.id,
      });

      if (insertError) {
        toast({
          variant: 'destructive',
          title: 'Error al registrar documento',
          description: insertError.message,
        });
      }
    }

    // Refresh documents list
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false });
    
    if (data) setDocuments(data);
    
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    toast({
      title: 'Archivos subidos',
      description: 'Los documentos han sido subidos exitosamente',
    });
  };

  const handleDownload = async (doc: Document) => {
    const { data, error } = await supabase.storage
      .from('audit-docs')
      .download(doc.storage_path);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error al descargar',
        description: error.message,
      });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;

    // Delete from storage
    await supabase.storage.from('audit-docs').remove([doc.storage_path]);

    // Delete record
    const { error } = await supabase.from('documents').delete().eq('id', doc.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: error.message,
      });
    } else {
      setDocuments(documents.filter(d => d.id !== doc.id));
      toast({
        title: 'Documento eliminado',
      });
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <h1 className="text-xl font-display font-bold text-foreground">Documentos</h1>
            <p className="text-sm text-muted-foreground">{documents.length} archivos</p>
          </div>
          {isAdmin && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                size="sm"
                className="h-9 gradient-primary text-primary-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1" />
                    Subir
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-3">
              {searchQuery ? 'No se encontraron documentos' : 'No hay documentos subidos'}
            </p>
            {isAdmin && !searchQuery && (
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                Subir primer documento
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map((doc) => {
              const FileIcon = getFileIcon(doc.file_type);
              return (
                <Card key={doc.id} className="shadow-card border-0">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {doc.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
