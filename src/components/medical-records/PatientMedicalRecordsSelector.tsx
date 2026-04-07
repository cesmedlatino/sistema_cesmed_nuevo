import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MedicalRecord {
  id: string;
  hms: string;
  especialidad: string | null;
  visit_date: string;
  status: string | null;
  specialist_id: string | null;
  specialist?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

interface PatientMedicalRecordsSelectorProps {
  patientId: string;
  selectedRecord: MedicalRecord | null;
  onSelectRecord: (record: MedicalRecord | null) => void;
  onCreateNew?: () => void;
}

export function PatientMedicalRecordsSelector({
  patientId,
  selectedRecord,
  onSelectRecord,
  onCreateNew
}: PatientMedicalRecordsSelectorProps) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<MedicalRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (patientId) {
      fetchRecords();
    }
  }, [patientId]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          id, hms, especialidad, visit_date, status, specialist_id,
          specialist:specialists(id, first_name, last_name)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
      
      // Auto-seleccionar la primera si no hay ninguna seleccionada
      if (data && data.length > 0 && !selectedRecord) {
        onSelectRecord(data[0]);
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, record: MedicalRecord) => {
    e.stopPropagation(); // Prevent selecting the record
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', recordToDelete.id);

      if (error) throw error;

      toast({
        title: 'Historia eliminada',
        description: `Se eliminó la historia ${recordToDelete.hms} correctamente`,
      });

      // Clear selection if deleted record was selected
      if (selectedRecord?.id === recordToDelete.id) {
        onSelectRecord(null);
      }

      // Refresh records list
      await fetchRecords();
    } catch (error: any) {
      console.error('Error deleting medical record:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la historia clínica',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground mb-4">
          Este paciente no tiene historias clínicas registradas
        </p>
        {onCreateNew && (
          <Button
            type="button"
            variant="outline"
            onClick={onCreateNew}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Crear Nueva Historia
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Seleccione una historia clínica ({records.length} disponibles):
        </p>
        <div className="flex flex-wrap gap-2">
          {records.map((record) => (
            <div key={record.id} className="relative group">
              <Badge
                variant={selectedRecord?.id === record.id ? "default" : "outline"}
                className={`cursor-pointer transition-colors px-3 py-1.5 text-sm pr-7 ${
                  selectedRecord?.id === record.id 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                    : "hover:bg-accent border-border"
                }`}
                onClick={() => onSelectRecord(record)}
              >
                <FileText className="h-3 w-3 mr-1.5" />
                {record.hms}
                {record.especialidad && (
                  <span className="ml-1 opacity-80">- {record.especialidad}</span>
                )}
              </Badge>
              <button
                type="button"
                onClick={(e) => handleDeleteClick(e, record)}
                className={`absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                  selectedRecord?.id === record.id
                    ? "hover:bg-primary-foreground/20 text-primary-foreground"
                    : "hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                }`}
                title="Eliminar historia"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar historia clínica?</AlertDialogTitle>
            <AlertDialogDescription>
              Está a punto de eliminar la historia <strong>{recordToDelete?.hms}</strong>.
              Esta acción no se puede deshacer y eliminará permanentemente todos los datos
              de esta historia clínica.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
