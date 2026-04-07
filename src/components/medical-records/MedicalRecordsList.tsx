
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Eye, Calendar, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MedicalRecord {
  id: string;
  visit_date: string;
  chief_complaint: string;
  diagnosis: string;
  status: string;
  specialist_name: string;
  created_at: string;
}

interface Patient {
  id: string;
  patient_code: string;
  first_name: string;
  last_name: string;
  dni: string;
  birth_date: string;
  gender: string;
  phone: string;
  email: string;
}

interface MedicalRecordsListProps {
  patient: Patient;
  onAddRecord: () => void;
  onEditRecord: (record: MedicalRecord) => void;
  onViewRecord: (record: MedicalRecord) => void;
}

export function MedicalRecordsList({ 
  patient, 
  onAddRecord, 
  onEditRecord, 
  onViewRecord 
}: MedicalRecordsListProps) {
  const { toast } = useToast();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patient?.id) {
      fetchMedicalRecords();
    }
  }, [patient?.id]);

  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_patient_medical_records', {
        patient_uuid: patient.id
      });

      if (error) throw error;
      setRecords(data || []);
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
        title: "Historia Clínica Eliminada",
        description: "La historia clínica se ha eliminado correctamente.",
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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'abierta':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cerrada':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'en seguimiento':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-lg">Cargando historias clínicas...</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historias Clínicas
          </CardTitle>
          <Button onClick={onAddRecord} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Historia
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">No hay historias clínicas registradas</p>
            <p className="text-sm">Haga clic en "Nueva Historia" para agregar la primera historia clínica</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium">Fecha</th>
                  <th className="text-left p-3 font-medium">Motivo de Consulta</th>
                  <th className="text-left p-3 font-medium">Diagnóstico</th>
                  <th className="text-left p-3 font-medium">Especialista</th>
                  <th className="text-left p-3 font-medium">Estado</th>
                  <th className="text-center p-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium">{formatDate(record.visit_date)}</div>
                      <div className="text-xs text-gray-500">
                        Reg: {formatDate(record.created_at)}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="max-w-xs truncate" title={record.chief_complaint}>
                        {record.chief_complaint || 'No especificado'}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="max-w-xs truncate font-medium" title={record.diagnosis}>
                        {record.diagnosis || 'Sin diagnóstico'}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{record.specialist_name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={`${getStatusColor(record.status)} border`}>
                        {record.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-center">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => onViewRecord(record)}
                          title="Ver historia"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => onEditRecord(record)}
                          title="Editar historia"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDelete(record.id)}
                          title="Eliminar historia"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
