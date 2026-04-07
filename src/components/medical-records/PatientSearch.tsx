
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Search, User, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

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

interface MedicalRecordPreview {
  id: string;
  hms: string;
  especialidad: string | null;
}

interface MedicalRecord {
  id: string;
  hms: string;
  especialidad: string | null;
  visit_date: string;
  status: string | null;
}

interface PatientWithRecords extends Patient {
  medical_records?: MedicalRecordPreview[];
}

interface PatientSearchProps {
  onPatientSelect: (patient: Patient) => void;
  selectedPatient: Patient | null;
  onMedicalRecordSelect?: (record: MedicalRecord | null) => void;
  selectedMedicalRecord?: MedicalRecord | null;
  showMedicalRecords?: boolean;
}

export function PatientSearch({ 
  onPatientSelect, 
  selectedPatient,
  onMedicalRecordSelect,
  selectedMedicalRecord,
  showMedicalRecords = true
}: PatientSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<PatientWithRecords[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [patientMedicalRecords, setPatientMedicalRecords] = useState<MedicalRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchPatients(searchTerm);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchTerm]);

  // Cargar historias cuando se selecciona un paciente
  useEffect(() => {
    if (selectedPatient?.id && showMedicalRecords) {
      fetchPatientMedicalRecords(selectedPatient.id);
    } else {
      setPatientMedicalRecords([]);
    }
  }, [selectedPatient?.id, showMedicalRecords]);

  const searchPatients = async (term: string) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_patients', {
        search_term: term
      });

      if (error) throw error;
      
      // Para cada paciente, obtener sus HMS (solo preview: id, hms, especialidad)
      const patientsWithRecords: PatientWithRecords[] = await Promise.all(
        (data || []).map(async (patient: Patient) => {
          const { data: records } = await supabase
            .from('medical_records')
            .select('id, hms, especialidad')
            .eq('patient_id', patient.id)
            .order('created_at', { ascending: false })
            .limit(5);
          
          return {
            ...patient,
            medical_records: (records || []) as MedicalRecordPreview[]
          };
        })
      );
      
      setSearchResults(patientsWithRecords);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching patients:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchPatientMedicalRecords = async (patientId: string) => {
    setLoadingRecords(true);
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select('id, hms, especialidad, visit_date, status')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatientMedicalRecords(data || []);
    } catch (error) {
      console.error('Error fetching medical records:', error);
      setPatientMedicalRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    onPatientSelect(patient);
    setSearchTerm(`${patient.first_name} ${patient.last_name}`);
    setShowResults(false);
    // Reset selected medical record when changing patient
    if (onMedicalRecordSelect) {
      onMedicalRecordSelect(null);
    }
  };

  const handleMedicalRecordSelect = (record: MedicalRecord) => {
    if (onMedicalRecordSelect) {
      onMedicalRecordSelect(record);
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Buscar Paciente</Label>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, apellido, DNI o N° Historia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
            className="pl-10"
          />
        </div>

        {/* Resultados de búsqueda */}
        {showResults && (
          <Card className="absolute z-50 w-full mt-1 border bg-background shadow-lg max-h-80 overflow-y-auto">
            <CardContent className="p-0">
              {isSearching ? (
                <div className="p-3 text-center text-muted-foreground">Buscando...</div>
              ) : searchResults.length > 0 ? (
                <div>
                  {searchResults.map((patient) => (
                    <div
                      key={patient.id}
                      className="border-b last:border-b-0"
                    >
                      <div
                        className="p-3 hover:bg-accent cursor-pointer"
                        onClick={() => handlePatientSelect(patient)}
                      >
                        <div className="flex items-start gap-3">
                          <User className="h-4 w-4 text-muted-foreground mt-1" />
                          <div className="flex-1">
                            <div className="font-medium">
                              {patient.first_name} {patient.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              DNI: {patient.dni} | Código: {patient.patient_code}
                            </div>
                            {/* Mostrar HMS del paciente */}
                            {patient.medical_records && patient.medical_records.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {patient.medical_records.map((record) => (
                                  <Badge 
                                    key={record.id} 
                                    variant="secondary" 
                                    className="text-xs"
                                  >
                                    <FileText className="h-3 w-3 mr-1" />
                                    {record.hms}
                                    {record.especialidad && ` - ${record.especialidad}`}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-center text-muted-foreground">
                  No se encontraron pacientes
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Información del paciente seleccionado */}
      {selectedPatient && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">Código:</span>
                <p className="text-foreground">{selectedPatient.patient_code}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">DNI:</span>
                <p className="text-foreground">{selectedPatient.dni}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Edad:</span>
                <p className="text-foreground">
                  {calculateAge(selectedPatient.birth_date)} años
                </p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Sexo:</span>
                <p className="text-foreground">{selectedPatient.gender}</p>
              </div>
              {selectedPatient.phone && (
                <div>
                  <span className="font-medium text-muted-foreground">Teléfono:</span>
                  <p className="text-foreground">{selectedPatient.phone}</p>
                </div>
              )}
              {selectedPatient.email && (
                <div>
                  <span className="font-medium text-muted-foreground">Email:</span>
                  <p className="text-foreground">{selectedPatient.email}</p>
                </div>
              )}
            </div>

            {/* Historias clínicas del paciente */}
            {showMedicalRecords && patientMedicalRecords.length > 0 && (
              <div className="mt-4 pt-4 border-t border-primary/20">
                <Label className="text-sm font-medium text-primary mb-2 block">
                  Historias Clínicas ({patientMedicalRecords.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {patientMedicalRecords.map((record) => (
                    <Badge
                      key={record.id}
                      variant={selectedMedicalRecord?.id === record.id ? "default" : "outline"}
                      className={`cursor-pointer transition-colors ${
                        selectedMedicalRecord?.id === record.id 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                          : "hover:bg-accent border-border"
                      }`}
                      onClick={() => handleMedicalRecordSelect(record)}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      {record.hms}
                      {record.especialidad && ` - ${record.especialidad}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {showMedicalRecords && loadingRecords && (
              <div className="mt-4 pt-4 border-t border-primary/20">
                <p className="text-sm text-primary">Cargando historias clínicas...</p>
              </div>
            )}

            {showMedicalRecords && !loadingRecords && patientMedicalRecords.length === 0 && (
              <div className="mt-4 pt-4 border-t border-primary/20">
                <p className="text-sm text-muted-foreground">Este paciente no tiene historias clínicas registradas.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
