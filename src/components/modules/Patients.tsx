import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  MoreHorizontal,
  FileSpreadsheet
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { DiseaseSelector } from "@/components/ui/disease-selector";
import { CSVUploader } from "@/components/patients/CSVUploader";
import { PatientsExcelImportDialog } from "@/components/patients/PatientsExcelImportDialog";

interface Patient {
  id: string;
  clinic_id?: string;
  patient_code: string;
  first_name: string;
  last_name: string;
  dni: string;
  hms?: string;
  birth_date?: string;
  gender?: string;
  blood_type?: string;
  phone?: string;
  email?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address?: string;
  allergies?: string[];
  chronic_conditions?: string[];
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  status?: string;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export function Patients() {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPatients, setTotalPatients] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [showCSVUploader, setShowCSVUploader] = useState(false);
  const [showExcelImporter, setShowExcelImporter] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [allowFreeTextDiseases, setAllowFreeTextDiseases] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    dni: "",
    gender: "",
    birth_date: "",
    years: null as number | null,
    months: null as number | null,
    days: null as number | null,
    phone: "",
    email: "",
    address: "",
    blood_type: "",
    allergies: [] as string[],
    chronic_conditions: [] as string[],
    emergency_contact_name: "",
    emergency_contact_phone: ""
  });

  const genders = ["Masculino", "Femenino"];
  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const calculateAge = (birthDate: string): number | null => {
    if (!birthDate) return null;
    
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

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

  // Calcular paginación
  const totalPages = Math.ceil(patients.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPatients = patients.slice(startIndex, endIndex);

  useEffect(() => {
    fetchPatients();
  }, []);

  // Buscar pacientes cuando cambia el término de búsqueda
  useEffect(() => {
    setCurrentPage(1);
    if (searchTerm.length >= 2) {
      searchPatients(searchTerm);
    } else {
      setPatients(allPatients);
    }
  }, [searchTerm, allPatients]);

  const searchPatients = async (term: string) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_patients', {
        search_term: term
      });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error searching patients:', error);
      toast({
        title: "Error",
        description: "No se pudo realizar la búsqueda",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      
      // Primero obtener el conteo total
      const { count, error: countError } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      setTotalPatients(count || 0);

      // Luego obtener todos los datos (sin límite)
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
      setAllPatients(data || []);
      
      console.log(`Cargados ${data?.length || 0} pacientes de ${count || 0} total en la base de datos`);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los pacientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePatientCode = () => {
    return `PAC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (editingPatient) {
        const { error } = await supabase
          .from('patients')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            dni: formData.dni,
            gender: formData.gender || null,
            birth_date: formData.birth_date || null,
            years: formData.years,
            months: formData.months,
            days: formData.days,
            phone: formData.phone || null,
            email: formData.email || null,
            address: formData.address || null,
            blood_type: formData.blood_type || null,
            allergies: formData.allergies || [],
            chronic_conditions: formData.chronic_conditions || [],
            emergency_contact_name: formData.emergency_contact_name || null,
            emergency_contact_phone: formData.emergency_contact_phone || null,
            updated_by: userData?.user?.id || null
          })
          .eq('id', editingPatient.id);

        if (error) throw error;

        toast({
          title: "Paciente Actualizado",
          description: "Los datos del paciente se han actualizado correctamente.",
        });
      } else {
        const { error } = await supabase
          .from('patients')
          .insert({
            patient_code: generatePatientCode(),
            first_name: formData.first_name,
            last_name: formData.last_name,
            dni: formData.dni,
            gender: formData.gender || null,
            birth_date: formData.birth_date || null,
            years: formData.years,
            months: formData.months,
            days: formData.days,
            phone: formData.phone || null,
            email: formData.email || null,
            address: formData.address || null,
            blood_type: formData.blood_type || null,
            allergies: formData.allergies || [],
            chronic_conditions: formData.chronic_conditions || [],
            emergency_contact_name: formData.emergency_contact_name || null,
            emergency_contact_phone: formData.emergency_contact_phone || null,
            created_by: userData?.user?.id || null,
            updated_by: userData?.user?.id || null
          });

        if (error) throw error;

        toast({
          title: "Paciente Registrado",
          description: "El nuevo paciente se ha registrado correctamente.",
        });
      }
      
      resetForm();
      setIsDialogOpen(false);
      fetchPatients();
    } catch (error) {
      console.error('Error saving patient:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el paciente",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    const ageDetails = patient.birth_date ? calculateAgeDetails(patient.birth_date) : { years: null, months: null, days: null };
    setFormData({
      first_name: patient.first_name,
      last_name: patient.last_name,
      dni: patient.dni,
      gender: patient.gender || "",
      birth_date: patient.birth_date || "",
      years: ageDetails.years,
      months: ageDetails.months,
      days: ageDetails.days,
      phone: patient.phone || "",
      email: patient.email || "",
      address: patient.address || "",
      blood_type: patient.blood_type || "",
      allergies: patient.allergies || [],
      chronic_conditions: patient.chronic_conditions || [],
      emergency_contact_name: patient.emergency_contact_name || "",
      emergency_contact_phone: patient.emergency_contact_phone || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Paciente Eliminado",
        description: "El paciente se ha eliminado correctamente.",
      });
      
      fetchPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el paciente",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      dni: "",
      gender: "",
      birth_date: "",
      years: null,
      months: null,
      days: null,
      phone: "",
      email: "",
      address: "",
      blood_type: "",
      allergies: [],
      chronic_conditions: [],
      emergency_contact_name: "",
      emergency_contact_phone: ""
    });
    setEditingPatient(null);
  };

  const handleNewPatient = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleDownloadXLS = () => {
    const dataToExport = patients.map((p) => ({
      "Código": p.patient_code,
      "Nombres": p.first_name,
      "Apellidos": p.last_name,
      "DNI": p.dni,
      "Género": p.gender || "",
      "Fecha Nacimiento": p.birth_date || "",
      "Edad": p.birth_date ? calculateAge(p.birth_date) : "",
      "Teléfono": p.phone || "",
      "Email": p.email || "",
      "Dirección": p.address || "",
      "Grupo Sanguíneo": p.blood_type || "",
      "Contacto Emergencia": p.emergency_contact_name || "",
      "Tel. Emergencia": p.emergency_contact_phone || "",
      "Alergias": (p.allergies || []).join(", "),
      "Condiciones Crónicas": (p.chronic_conditions || []).join(", "),
      "Estado": p.status || "Activo",
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pacientes");
    XLSX.writeFile(wb, `Pacientes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Descarga completada", description: `${dataToExport.length} pacientes exportados.` });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando pacientes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Gestión de Pacientes</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadXLS}
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar XLS
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowExcelImporter(true)}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Importar Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCSVUploader(!showCSVUploader)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <Button onClick={handleNewPatient}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Paciente
          </Button>
        </div>
      </div>

      {/* Excel Importer Dialog */}
      <PatientsExcelImportDialog
        open={showExcelImporter}
        onOpenChange={setShowExcelImporter}
        onSuccess={fetchPatients}
      />

      {/* CSV Uploader */}
      {showCSVUploader && (
        <Card>
          <CardHeader>
            <CardTitle>Importar Pacientes desde CSV</CardTitle>
          </CardHeader>
          <CardContent>
            <CSVUploader onUploadComplete={() => {
              fetchPatients();
              setShowCSVUploader(false);
            }} />
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>
                Pacientes Registrados
              </CardTitle>
              <Badge variant="secondary" className="text-sm font-medium">
                Total: {totalPatients.toLocaleString()}
              </Badge>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, DNI, código, teléfono, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabla */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Nro Historia</TableHead>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Edad</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPatients.map((patient, index) => (
                  <TableRow key={patient.id}>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {startIndex + index + 1}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {patient.patient_code}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {patient.hms || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {patient.first_name} {patient.last_name}
                      </div>
                      {patient.gender && (
                        <div className="text-sm text-muted-foreground">
                          {patient.gender}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">
                      {patient.dni}
                    </TableCell>
                    <TableCell>
                      {patient.birth_date ? 
                        `${calculateAge(patient.birth_date)} años` : 
                        '-'
                      }
                    </TableCell>
                    <TableCell>
                      {patient.phone || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-40 truncate">
                        {patient.email || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="text-xs">
                        Activo
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedPatient(patient)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>
                                Detalles del Paciente
                              </DialogTitle>
                              <DialogDescription>
                                Información completa de {selectedPatient?.first_name} {selectedPatient?.last_name}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedPatient && (
                              <div className="grid grid-cols-2 gap-4 py-4">
                                <div className="space-y-2">
                                  <h4 className="font-semibold">Información Personal</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><span className="font-medium">Código:</span> {selectedPatient.patient_code}</p>
                                    <p><span className="font-medium">DNI:</span> {selectedPatient.dni}</p>
                                    <p><span className="font-medium">Fecha de Nacimiento:</span> {selectedPatient.birth_date || 'No especificada'}</p>
                                    <p><span className="font-medium">Género:</span> {selectedPatient.gender || 'No especificado'}</p>
                                    <p><span className="font-medium">Grupo Sanguíneo:</span> {selectedPatient.blood_type || 'No especificado'}</p>
                                    <p><span className="font-medium">Dirección:</span> {selectedPatient.address || 'No especificada'}</p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="font-semibold">Contacto y Seguro</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><span className="font-medium">Teléfono:</span> {selectedPatient.phone || 'No especificado'}</p>
                                    <p><span className="font-medium">Email:</span> {selectedPatient.email || 'No especificado'}</p>
                                    <p><span className="font-medium">Contacto de Emergencia:</span> {selectedPatient.emergency_contact_name || 'No especificado'}</p>
                                    <p><span className="font-medium">Teléfono de Emergencia:</span> {selectedPatient.emergency_contact_phone || 'No especificado'}</p>
                                  </div>
                                </div>
                                {(selectedPatient.allergies?.length > 0 || selectedPatient.chronic_conditions?.length > 0) && (
                                  <div className="col-span-2 space-y-2">
                                    <h4 className="font-semibold">Información Médica</h4>
                                    {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                                      <div>
                                        <p className="font-medium text-sm">Alergias:</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {selectedPatient.allergies.map((allergy, index) => (
                                            <Badge key={index} variant="destructive" className="text-xs">
                                              {allergy}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {selectedPatient.chronic_conditions && selectedPatient.chronic_conditions.length > 0 && (
                                      <div>
                                        <p className="font-medium text-sm">Enfermedades Crónicas:</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {selectedPatient.chronic_conditions.map((condition, index) => (
                                            <Badge key={index} variant="secondary" className="text-xs">
                                              {condition}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(patient)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente
                                al paciente {patient.first_name} {patient.last_name} del sistema.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(patient.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {patients.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-4">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(endIndex, patients.length)} de {patients.length}
                  {searchTerm ? ' resultados' : ' pacientes'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Por página:</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        return Math.abs(page - currentPage) <= 2 || page === 1 || page === totalPages;
                      })
                      .map((page, index, array) => {
                        const showEllipsis = index > 0 && array[index - 1] < page - 1;
                        return (
                          <div key={page} className="flex items-center">
                            {showEllipsis && <span className="px-2">...</span>}
                            <PaginationItem>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          </div>
                        );
                      })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}

          {patients.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {searchTerm ? "No se encontraron pacientes" : "No hay pacientes registrados"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? "Intenta cambiar los términos de búsqueda" 
                  : "Comienza registrando tu primer paciente"
                }
              </p>
              {!searchTerm && (
                <Button onClick={handleNewPatient}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Primer Paciente
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear/editar paciente */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPatient ? "Editar Paciente" : "Nuevo Paciente"}
            </DialogTitle>
            <DialogDescription>
              {editingPatient 
                ? "Modifica los datos del paciente seleccionado" 
                : "Completa los datos para registrar un nuevo paciente"
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="free-text-toggle-edit" className="text-sm font-normal">
                    Otras Enfermedades
                  </Label>
                  <Switch
                    id="free-text-toggle-edit"
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
              <Button type="submit" className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {editingPatient ? "Actualizar" : "Registrar"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}