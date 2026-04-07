
import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HeaderEditorProps {
  headerConfig: {
    logo_url?: string;
    title?: string;
    record_number_prefix?: string;
    record_number_zeros?: number;
    is_correlative?: boolean;
    start_number?: number;
  };
  onChange: (config: { 
    logo_url?: string; 
    title?: string;
    record_number_prefix?: string;
    record_number_zeros?: number;
    is_correlative?: boolean;
    start_number?: number;
  }) => void;
}

export function HeaderEditor({ headerConfig, onChange }: HeaderEditorProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('template-images')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('template-images')
        .getPublicUrl(fileName);

      onChange({ ...headerConfig, logo_url: publicUrl });
      
      toast({
        title: "Logo subido",
        description: "El logo se ha subido correctamente",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    onChange({ ...headerConfig, logo_url: undefined });
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleLogoClick = () => {
    logoInputRef.current?.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Encabezado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="logo">Logo</Label>
          <div className="mt-2">
            {headerConfig.logo_url ? (
              <div className="flex items-center gap-2">
                <div className="w-40 h-40 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                  <img 
                    src={headerConfig.logo_url} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={removeLogo}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  id="logo"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button variant="outline" size="sm" onClick={handleLogoClick} disabled={uploading}>
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? 'Subiendo...' : 'Subir Logo'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={headerConfig.title || ''}
            onChange={(e) => onChange({ ...headerConfig, title: e.target.value })}
            placeholder="Título del encabezado"
          />
        </div>

        <div className="space-y-4 border-t pt-4">
          <Label className="text-base font-semibold">Configuración del Nro de Historia Clínica</Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="record_prefix">Prefijo (2 letras)</Label>
              <Input
                id="record_prefix"
                value={headerConfig.record_number_prefix || 'HC'}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().slice(0, 2);
                  onChange({ ...headerConfig, record_number_prefix: value });
                }}
                placeholder="HC"
                maxLength={2}
              />
            </div>
            
            <div>
              <Label htmlFor="record_zeros">Cantidad de ceros</Label>
              <Select 
                value={headerConfig.record_number_zeros?.toString() || '6'} 
                onValueChange={(value) => onChange({ ...headerConfig, record_number_zeros: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cantidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 ceros (0001)</SelectItem>
                  <SelectItem value="5">5 ceros (00001)</SelectItem>
                  <SelectItem value="6">6 ceros (000001)</SelectItem>
                  <SelectItem value="7">7 ceros (0000001)</SelectItem>
                  <SelectItem value="8">8 ceros (00000001)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="correlative">Correlativo</Label>
              <p className="text-sm text-muted-foreground">
                Activar numeración correlativa automática
              </p>
            </div>
            <Switch
              id="correlative"
              checked={headerConfig.is_correlative || false}
              onCheckedChange={(checked) => onChange({ ...headerConfig, is_correlative: checked })}
            />
          </div>

          {headerConfig.is_correlative && (
            <div>
              <Label htmlFor="start_number">Iniciar desde</Label>
              <Input
                id="start_number"
                type="number"
                min="1"
                value={headerConfig.start_number || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    onChange({ ...headerConfig, start_number: value });
                  }
                }}
                placeholder="1"
              />
            </div>
          )}
          
          <div className="p-3 bg-gray-50 rounded-lg">
            <Label className="text-sm text-gray-600">Vista previa del formato:</Label>
            <p className="font-mono text-lg">
              {headerConfig.record_number_prefix || 'HC'}-
              {'0'.repeat(headerConfig.record_number_zeros || 6)}
              {headerConfig.is_correlative && headerConfig.start_number ? headerConfig.start_number : '1'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
