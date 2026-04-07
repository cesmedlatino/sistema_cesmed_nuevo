import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Pill, Save, Loader2 } from 'lucide-react';
import { MedicationAutocomplete } from '@/components/pharmacy/MedicationAutocomplete';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Medication {
  id: string;
  codigo: string;
  descripcion: string;
  precio_venta?: number;
  stock_actual: number;
  presentation: string;
}

interface MedicationItem {
  medication: Medication;
  dosis: string;
  frecuencia: string;
  duracion: string;
  viaAdministracion: string;
  indicaciones: string;
}

interface EditPrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescriptionId: string;
  prescriptionNumber: string;
  onPrescriptionUpdated?: () => void;
}

const frequencies = [
  "Cada 4 horas",
  "Cada 6 horas",
  "Cada 8 horas",
  "Cada 12 horas",
  "Una vez al día",
  "Dos veces al día",
  "Tres veces al día",
  "Según necesidad"
];

const administrationRoutes = [
  "Oral",
  "Oftálmica",
  "Tópica",
  "Intramuscular",
  "Intravenosa",
  "Sublingual"
];

export function EditPrescriptionDialog({
  open,
  onOpenChange,
  prescriptionId,
  prescriptionNumber,
  onPrescriptionUpdated
}: EditPrescriptionDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [currentMedication, setCurrentMedication] = useState<Medication | null>(null);
  const [currentDosis, setCurrentDosis] = useState('');
  const [currentFrecuencia, setCurrentFrecuencia] = useState('');
  const [currentDuracion, setCurrentDuracion] = useState('');
  const [currentVia, setCurrentVia] = useState('Oral');
  const [currentIndicaciones, setCurrentIndicaciones] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    if (open && prescriptionId) {
      loadPrescriptionData();
    }
  }, [open, prescriptionId]);

  const loadPrescriptionData = async () => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('id', prescriptionId)
        .single();

      if (error) throw error;

      setObservaciones(data.instructions || '');
      setStatus(data.status || 'active');

      // Parse medications from JSON
      const medsData = Array.isArray(data.medications) ? data.medications : [];
      const parsedMeds: MedicationItem[] = medsData.map((med: any) => ({
        medication: {
          id: med.codigo || '',
          codigo: med.codigo || '',
          descripcion: med.medicamento || med.medication?.descripcion || '',
          stock_actual: 0,
          presentation: med.presentacion || med.medication?.presentation || ''
        },
        dosis: med.dosis || '',
        frecuencia: med.frecuencia || '',
        duracion: med.duracion || '',
        viaAdministracion: med.via || med.viaAdministracion || 'Oral',
        indicaciones: med.indicaciones || ''
      }));

      setMedications(parsedMeds);
    } catch (error) {
      console.error('Error loading prescription:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la receta",
        variant: "destructive"
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddMedication = () => {
    if (!currentMedication) {
      toast({
        title: "Error",
        description: "Seleccione un medicamento",
        variant: "destructive"
      });
      return;
    }

    if (!currentDosis || !currentFrecuencia || !currentDuracion) {
      toast({
        title: "Error",
        description: "Complete los campos de dosis, frecuencia y duración",
        variant: "destructive"
      });
      return;
    }

    setMedications(prev => [...prev, {
      medication: currentMedication,
      dosis: currentDosis,
      frecuencia: currentFrecuencia,
      duracion: currentDuracion,
      viaAdministracion: currentVia,
      indicaciones: currentIndicaciones
    }]);

    // Reset form
    setCurrentMedication(null);
    setCurrentDosis('');
    setCurrentFrecuencia('');
    setCurrentDuracion('');
    setCurrentVia('Oral');
    setCurrentIndicaciones('');
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (medications.length === 0) {
      toast({
        title: "Error",
        description: "Agregue al menos un medicamento a la receta",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const medicationsJson = medications.map(m => ({
        medicamento: m.medication.descripcion,
        codigo: m.medication.codigo,
        presentacion: m.medication.presentation,
        dosis: m.dosis,
        frecuencia: m.frecuencia,
        duracion: m.duracion,
        via: m.viaAdministracion,
        indicaciones: m.indicaciones
      }));

      const { error } = await supabase
        .from('prescriptions')
        .update({
          medications: medicationsJson,
          instructions: observaciones,
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', prescriptionId);

      if (error) throw error;

      toast({
        title: "Receta actualizada",
        description: `La receta ${prescriptionNumber} se ha actualizado correctamente`,
      });

      onPrescriptionUpdated?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating prescription:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la receta",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMedications([]);
    setCurrentMedication(null);
    setCurrentDosis('');
    setCurrentFrecuencia('');
    setCurrentDuracion('');
    setCurrentVia('Oral');
    setCurrentIndicaciones('');
    setObservaciones('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Editar Receta: {prescriptionNumber}
          </DialogTitle>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status */}
            <div className="space-y-2">
              <Label>Estado de la receta</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="used">Usada</SelectItem>
                  <SelectItem value="expired">Vencida</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Add medication form */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <h4 className="font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Agregar Medicamento
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Medicamento</Label>
                  <MedicationAutocomplete
                    value={currentMedication}
                    onChange={setCurrentMedication}
                  />
                </div>
                
                <div>
                  <Label>Dosis</Label>
                  <Input
                    placeholder="Ej: 500mg"
                    value={currentDosis}
                    onChange={(e) => setCurrentDosis(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label>Frecuencia</Label>
                  <Select value={currentFrecuencia} onValueChange={setCurrentFrecuencia}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar frecuencia" />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencies.map(freq => (
                        <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Duración</Label>
                  <Input
                    placeholder="Ej: 7 días"
                    value={currentDuracion}
                    onChange={(e) => setCurrentDuracion(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label>Vía de administración</Label>
                  <Select value={currentVia} onValueChange={setCurrentVia}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {administrationRoutes.map(route => (
                        <SelectItem key={route} value={route}>{route}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="md:col-span-2">
                  <Label>Indicaciones específicas</Label>
                  <Textarea
                    placeholder="Indicaciones adicionales para este medicamento..."
                    value={currentIndicaciones}
                    onChange={(e) => setCurrentIndicaciones(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              
              <Button 
                type="button" 
                onClick={handleAddMedication}
                variant="secondary"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar a la receta
              </Button>
            </div>

            {/* Medications list */}
            {medications.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Medicamentos en la receta ({medications.length})</h4>
                {medications.map((med, index) => (
                  <div 
                    key={index}
                    className="border rounded-lg p-3 bg-background flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          {index + 1}
                        </Badge>
                        <span className="font-medium">{med.medication.descripcion}</span>
                      </div>
                      <div className="text-sm text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-2">
                        <span>Dosis: {med.dosis}</span>
                        <span>Frecuencia: {med.frecuencia}</span>
                        <span>Duración: {med.duracion}</span>
                        <span>Vía: {med.viaAdministracion}</span>
                      </div>
                      {med.indicaciones && (
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          {med.indicaciones}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMedication(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* General observations */}
            <div>
              <Label>Indicaciones generales</Label>
              <Textarea
                placeholder="Observaciones e indicaciones generales para el paciente..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || loadingData || medications.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
