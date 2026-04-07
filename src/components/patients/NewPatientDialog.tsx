import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DiseaseSelector } from '@/components/ui/disease-selector';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, X } from 'lucide-react';

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
  address?: string;
}

interface NewPatientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientCreated?: (patient: Patient) => void;
}

export function NewPatientDialog({ isOpen, onClose, onPatientCreated }: NewPatientDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [allowFreeTextDiseases, setAllowFreeTextDiseases] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dni: '',
    gender: '',
    birth_date: '',
    years: null as number | null,
    months: null as number | null,
    days: null as number | null,
    blood_type: '',
    phone: '',
    email: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    address: '',
    allergies: [] as string[],
    chronic_conditions: [] as string[]
  });

  const calculateAgeDetails = (birthDate: string) => {
    if (!birthDate) return { years: null, months: null, days: null };
    
    const today = new Date();
    const birth = new Date(birthDate);
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    return { years, months, days };
  };

  const calculateEdadTotal = (years?: number | null, months?: number | null, days?: number | null): string => {
    const parts = [];
    if (years && years > 0) parts.push(`${years} año${years > 1 ? 's' : ''}`);
    if (months && months > 0) parts.push(`${months} mes${months > 1 ? 'es' : ''}`);
    if (days && days > 0) parts.push(`${days} día${days > 1 ? 's' : ''}`);
    return parts.join(' ') || 'No especificado';
  };

  const genders = ['Masculino', 'Femenino', 'Otro'];
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      dni: '',
      gender: '',
      birth_date: '',
      years: null,
      months: null,
      days: null,
      blood_type: '',
      phone: '',
      email: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      address: '',
      allergies: [],
      chronic_conditions: []
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.last_name || !formData.dni) {
      toast({
        title: 'Error',
        description: 'Por favor completa los campos obligatorios (Nombres, Apellidos, DNI)',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Generar código de paciente
      const patientCode = `P${Date.now().toString().slice(-6)}`;
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('patients')
        .insert({
          patient_code: patientCode,
          first_name: formData.first_name,
          last_name: formData.last_name,
          dni: formData.dni,
          gender: formData.gender || null,
          birth_date: formData.birth_date || null,
          years: formData.years,
          months: formData.months,
          days: formData.days,
          blood_type: formData.blood_type || null,
          phone: formData.phone || null,
          email: formData.email || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          address: formData.address || null,
          allergies: formData.allergies || [],
          chronic_conditions: formData.chronic_conditions || [],
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Paciente registrado',
        description: `El paciente ${formData.first_name} ${formData.last_name} ha sido registrado exitosamente.`,
      });

      if (onPatientCreated && data) {
        onPatientCreated(data);
      }

      resetForm();
      onClose();
    } catch (error: any) {
      console.error('Error creating patient:', error);
      toast({
        title: 'Error',
        description: error.message === 'duplicate key value violates unique constraint "patients_dni_key"' 
          ? 'Ya existe un paciente con este DNI' 
          : 'No se pudo registrar el paciente',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Paciente</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Nombres *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                placeholder="Nombres del paciente"
                className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                required
              />
            </div>

            <div>
              <Label htmlFor="last_name">Apellidos *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                placeholder="Apellidos del paciente"
                className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                required
              />
            </div>

            <div>
              <Label htmlFor="dni">DNI *</Label>
              <Input
                id="dni"
                value={formData.dni}
                onChange={(e) => setFormData(prev => ({ ...prev, dni: e.target.value }))}
                placeholder="Número de DNI"
                className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                required
              />
            </div>

            <div>
              <Label>Sexo</Label>
              <Select 
                value={formData.gender} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sexo" />
                </SelectTrigger>
                <SelectContent>
                  {genders.map((gender) => (
                    <SelectItem key={gender} value={gender}>
                      {gender}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => {
                  const newBirthDate = e.target.value;
                  const ageDetails = calculateAgeDetails(newBirthDate);
                  setFormData(prev => ({ 
                    ...prev, 
                    birth_date: newBirthDate,
                    years: ageDetails.years,
                    months: ageDetails.months,
                    days: ageDetails.days
                  }));
                }}
              />
            </div>

            <div>
              <Label htmlFor="years">Años</Label>
              <Input
                id="years"
                type="number"
                value={formData.years ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, years: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="Años"
              />
            </div>

            <div>
              <Label htmlFor="months">Meses</Label>
              <Input
                id="months"
                type="number"
                value={formData.months ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, months: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="Meses"
                min="0"
                max="11"
              />
            </div>

            <div>
              <Label htmlFor="days">Días</Label>
              <Input
                id="days"
                type="number"
                value={formData.days ?? ''}
                onChange={(e) => setFormData(prev => ({ ...prev, days: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="Días"
                min="0"
                max="30"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="edad_total">Edad Total</Label>
              <Input
                id="edad_total"
                value={calculateEdadTotal(formData.years, formData.months, formData.days)}
                disabled
                placeholder="Se calcula automáticamente"
                className="bg-muted font-medium"
              />
            </div>

            <div>
              <Label>Grupo Sanguíneo</Label>
              <Select 
                value={formData.blood_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, blood_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar grupo sanguíneo" />
                </SelectTrigger>
                <SelectContent>
                  {bloodTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Número de teléfono"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Correo electrónico"
              />
            </div>

            <div>
              <Label htmlFor="emergency_contact_name">Contacto de Emergencia</Label>
              <Input
                id="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                placeholder="Nombre del contacto de emergencia"
              />
            </div>

            <div>
              <Label htmlFor="emergency_contact_phone">Teléfono de Emergencia</Label>
              <Input
                id="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                placeholder="Teléfono del contacto"
              />
            </div>

          </div>

          <div>
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Dirección completa"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Enfermedades</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="free-text-toggle" className="text-sm font-normal">
                  Otras Enfermedades
                </Label>
                <Switch
                  id="free-text-toggle"
                  checked={allowFreeTextDiseases}
                  onCheckedChange={setAllowFreeTextDiseases}
                />
              </div>
            </div>
            <DiseaseSelector
              selectedDiseases={formData.chronic_conditions}
              onDiseasesChange={(diseases) => setFormData(prev => ({ ...prev, chronic_conditions: diseases }))}
              allowFreeText={allowFreeTextDiseases}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Registrando...' : 'Registrar'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}