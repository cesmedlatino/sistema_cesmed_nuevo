import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RefreshCw, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TemplateWithStats {
  id: string;
  name: string;
  correlative_prefix: string | null;
  correlative_zeros: number | null;
  correlative_current: number | null;
  specialty_name: string | null;
  max_hms_number: number;
  continue_from: number;
}

export function TemplateCorrelativesConfig() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  const fetchTemplatesWithStats = async () => {
    setLoading(true);
    try {
      // Fetch all templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('medical_record_templates')
        .select(`
          id,
          name,
          correlative_prefix,
          correlative_zeros,
          correlative_current,
          specialty_id,
          medical_specialties (name)
        `)
        .eq('is_active', true)
        .order('name');

      if (templatesError) throw templatesError;

      // For each template, get the max HMS number from medical_records
      const templatesWithStats = await Promise.all(
        (templatesData || []).map(async (template: any) => {
          const prefix = template.correlative_prefix || 'HC';
          
          // Query to find the max numeric suffix for this prefix
          const { data: recordsData, error: recordsError } = await supabase
            .from('medical_records')
            .select('hms')
            .like('hms', `${prefix}-%`)
            .order('hms', { ascending: false })
            .limit(100);

          let maxNumber = 0;
          if (!recordsError && recordsData && recordsData.length > 0) {
            // Find the maximum number from all HMS values
            for (const record of recordsData) {
              if (record.hms) {
                const parts = record.hms.split('-');
                if (parts.length >= 2) {
                  const numericPart = parseInt(parts[1], 10);
                  if (!isNaN(numericPart) && numericPart > maxNumber) {
                    maxNumber = numericPart;
                  }
                }
              }
            }
          }

          return {
            id: template.id,
            name: template.name,
            correlative_prefix: template.correlative_prefix,
            correlative_zeros: template.correlative_zeros,
            correlative_current: template.correlative_current,
            specialty_name: template.medical_specialties?.name || null,
            max_hms_number: maxNumber,
            continue_from: maxNumber, // Default to current max
          };
        })
      );

      setTemplates(templatesWithStats);
      
      // Initialize edit values with current max numbers
      const initialValues: Record<string, number> = {};
      templatesWithStats.forEach(t => {
        initialValues[t.id] = t.max_hms_number;
      });
      setEditValues(initialValues);

    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las plantillas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplatesWithStats();
  }, []);

  const handleSave = async (template: TemplateWithStats) => {
    const newValue = editValues[template.id];
    if (newValue === undefined || newValue < 0) {
      toast({
        title: "Error",
        description: "El valor debe ser un número válido mayor o igual a 0",
        variant: "destructive",
      });
      return;
    }

    setSaving(template.id);
    try {
      // Update the correlative_current in the template
      const { error } = await supabase
        .from('medical_record_templates')
        .update({ correlative_current: newValue })
        .eq('id', template.id);

      if (error) throw error;

      toast({
        title: "Guardado",
        description: `El correlativo de "${template.name}" se actualizó. El próximo número será ${newValue + 1}.`,
      });

      // Refresh data
      await fetchTemplatesWithStats();

    } catch (error) {
      console.error('Error updating correlative:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el correlativo",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const formatHms = (prefix: string | null, number: number, zeros: number | null) => {
    const p = prefix || 'HC';
    const z = zeros || 6;
    return `${p}-${number.toString().padStart(z, '0')}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <CardTitle>Correlativos de Historias Clínicas</CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTemplatesWithStats}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Configure desde qué número continuará el correlativo de cada plantilla. 
          Esto permite hacer saltos de numeración si es necesario.
        </p>

        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay plantillas de historia clínica configuradas
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plantilla</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead>Prefijo</TableHead>
                  <TableHead className="text-center">Último Nº Creado</TableHead>
                  <TableHead className="text-center">Continuar Desde</TableHead>
                  <TableHead className="text-center">Próximo HMS</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => {
                  const currentEditValue = editValues[template.id] ?? template.max_hms_number;
                  const nextNumber = currentEditValue + 1;
                  const hasChanges = currentEditValue !== template.max_hms_number;

                  return (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        {template.specialty_name ? (
                          <Badge variant="secondary">{template.specialty_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{template.correlative_prefix || 'HC'}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm">
                          {template.max_hms_number > 0 
                            ? formatHms(template.correlative_prefix, template.max_hms_number, template.correlative_zeros)
                            : <span className="text-muted-foreground">Sin registros</span>
                          }
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={currentEditValue}
                            onChange={(e) => setEditValues(prev => ({
                              ...prev,
                              [template.id]: parseInt(e.target.value) || 0
                            }))}
                            className="w-24 text-center"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-mono text-sm ${hasChanges ? 'text-primary font-semibold' : ''}`}>
                          {formatHms(template.correlative_prefix, nextNumber, template.correlative_zeros)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={hasChanges ? "default" : "ghost"}
                          onClick={() => handleSave(template)}
                          disabled={saving === template.id || !hasChanges}
                        >
                          {saving === template.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> El campo "Continuar Desde" muestra dinámicamente el último número creado. 
            Si modifica este valor, el próximo número de historia para esa plantilla comenzará desde el valor ingresado + 1.
            Esto es útil para hacer saltos de numeración cuando sea necesario.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
