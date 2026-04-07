
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Patient {
  id: string;
  patient_code: string;
  first_name: string;
  last_name: string;
  dni: string;
}

interface MedicalRecord {
  id: string;
  visit_date: string;
  status: string;
  record_number: string;
  created_at: string;
  form_data: any;
  medical_record_templates: {
    name: string;
    header_config: any;
    body_config: any[];
    footer_config: any;
  };
}

interface TemplateBasedMedicalRecordsListProps {
  patient: Patient;
  onAddRecord: () => void;
  onEditRecord: (recordId: string) => void;
  onViewRecord: (record: MedicalRecord) => void;
}

export function TemplateBasedMedicalRecordsList({ 
  patient, 
  onAddRecord, 
  onEditRecord, 
  onViewRecord 
}: TemplateBasedMedicalRecordsListProps) {
  const { toast } = useToast();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedicalRecords();
  }, [patient.id]);

  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      
      // First get the medical records
      const { data: recordsData, error: recordsError } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      if (recordsError) throw recordsError;

      // Then get the templates for each record
      const transformedRecords: MedicalRecord[] = [];
      
      for (const record of recordsData || []) {
        let templateData = null;
        
        // Use bracket notation to access template_id
        const templateId = (record as any).template_id;
        
        if (templateId) {
          const { data: template, error: templateError } = await supabase
            .from('medical_record_templates')
            .select('*')
            .eq('id', templateId)
            .single();
            
          if (!templateError && template) {
            templateData = template;
          }
        }
        
        // Use bracket notation to access the new properties
        const recordNumber = (record as any).record_number;
        const formData = (record as any).form_data;
        
        transformedRecords.push({
          id: record.id,
          visit_date: record.visit_date,
          status: record.status || 'En Progreso',
          record_number: recordNumber || 'Sin número',
          created_at: record.created_at,
          form_data: formData || {},
          medical_record_templates: {
            name: templateData?.name || 'Plantilla no disponible',
            header_config: templateData?.header_config || {},
            body_config: Array.isArray(templateData?.body_config) ? templateData.body_config : [],
            footer_config: templateData?.footer_config || {}
          }
        });
      }
      
      setRecords(transformedRecords);
    } catch (error) {
      console.error('Error fetching medical records:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las historias clínicas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm('¿Está seguro de eliminar esta historia clínica?')) return;

    try {
      const { error } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      toast({
        title: "Historia Eliminada",
        description: "La historia clínica se ha eliminado correctamente",
      });

      fetchMedicalRecords();
    } catch (error) {
      console.error('Error deleting medical record:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la historia clínica",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-lg">Cargando historias clínicas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">
            Historias Clínicas - {patient.first_name} {patient.last_name}
          </h2>
          <p className="text-gray-600">
            DNI: {patient.dni} | Código: {patient.patient_code}
          </p>
        </div>
        <Button onClick={onAddRecord}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Historia
        </Button>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-lg mb-2">No hay historias clínicas registradas</p>
            <p className="text-sm text-gray-500 mb-4">
              Haga clic en "Nueva Historia" para crear la primera historia clínica
            </p>
            <Button onClick={onAddRecord}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Historia
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((record) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">
                      {record.record_number}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {record.medical_record_templates?.name || 'Plantilla no disponible'}
                    </p>
                  </div>
                  <Badge 
                    variant={
                      record.status === 'Completada' ? 'default' :
                      record.status === 'En Progreso' ? 'secondary' : 'outline'
                    }
                  >
                    {record.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Fecha:</strong> {format(new Date(record.visit_date), 'dd/MM/yyyy')}
                  </p>
                  <p>
                    <strong>Creada:</strong> {format(new Date(record.created_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                
                <div className="flex gap-1 mt-4">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onViewRecord(record)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onEditRecord(record.id)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleDelete(record.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
