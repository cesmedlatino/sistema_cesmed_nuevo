
import { useState, useEffect } from "react";
import { FileText, Eye, Trash2, Plus, Search, CalendarIcon, FileSpreadsheet, Edit } from "lucide-react";
import { TemplateBasedMedicalRecordViewer } from "@/components/medical-records/TemplateBasedMedicalRecordViewer";
import { MedicalRecordsExcelImportDialog } from "@/components/medical-records/MedicalRecordsExcelImportDialog";
import { NewMedicalRecordDialog } from "@/components/medical-records/NewMedicalRecordDialog";
import { PatientMedicalHistory } from "@/components/medical-records/PatientMedicalHistory";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { MonthYearPicker } from "@/components/pharmacy/MonthYearPicker";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

type FilterType = "all" | "today" | "week" | "month" | "custom-month" | "custom-date";

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

interface Template {
  id: string;
  name: string;
}

interface MedicalRecord {
  id: string;
  visit_date: string;
  status: string;
  record_number: string;
  created_at: string;
  form_data: any;
  hms?: string;
  patient: Patient;
  medical_record_templates: {
    id: string;
    name: string;
    header_config: any;
    body_config: any[];
    footer_config: any;
  };
}

// Helper para obtener fecha local Lima (GMT-5)
const getLocalDateString = (date: Date = new Date()): string => {
  const limaOffset = -5 * 60;
  const localOffset = date.getTimezoneOffset();
  const diff = limaOffset - localOffset;
  const limaDate = new Date(date.getTime() + diff * 60 * 1000);
  return limaDate.toISOString().split('T')[0];
};

const getDateRange = (filter: FilterType, customDate?: Date, customMonth?: string): { start: string; end: string } | null => {
  const now = new Date();
  const todayStr = getLocalDateString(now);
  
  switch (filter) {
    case "all":
      return null;
    case "today":
      return { start: todayStr, end: todayStr };
    case "week": {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      return { 
        start: getLocalDateString(weekStart), 
        end: getLocalDateString(weekEnd) 
      };
    }
    case "month": {
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      return { 
        start: getLocalDateString(monthStart), 
        end: getLocalDateString(monthEnd) 
      };
    }
    case "custom-month": {
      if (!customMonth) return null;
      const [year, month] = customMonth.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = endOfMonth(monthStart);
      return { 
        start: getLocalDateString(monthStart), 
        end: getLocalDateString(monthEnd) 
      };
    }
    case "custom-date": {
      if (!customDate) return null;
      const dateStr = getLocalDateString(customDate);
      return { start: dateStr, end: dateStr };
    }
    default:
      return null;
  }
};

export function MedicalRecords() {
  const { toast } = useToast();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Filtros de fecha
  const [dateFilter, setDateFilter] = useState<FilterType>("all");
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [customMonth, setCustomMonth] = useState<string>("");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    fetchAllRecords();
  }, [debouncedSearch, selectedTemplate, dateFilter, customDate, customMonth, currentPage, pageSize]);

  // Reset página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedTemplate, dateFilter, customDate, customMonth, pageSize]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_record_templates')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchAllRecords = async () => {
    try {
      setLoading(true);

      const searchText = debouncedSearch.trim();
      let allRecordIds: string[] = [];
      const dateRange = getDateRange(dateFilter, customDate, customMonth);

      if (searchText) {
        // Buscar por HMS directamente
        const { data: hmsMatches } = await supabase
          .from('medical_records')
          .select('id')
          .ilike('hms', `%${searchText}%`);
        
        if (hmsMatches) {
          allRecordIds.push(...hmsMatches.map(r => r.id));
        }

        // Buscar pacientes por nombre, apellido o DNI
        const { data: matchingPatients } = await supabase
          .from('patients')
          .select('id')
          .or(`first_name.ilike.%${searchText}%,last_name.ilike.%${searchText}%,dni.ilike.%${searchText}%`);
        
        if (matchingPatients && matchingPatients.length > 0) {
          const patientIds = matchingPatients.map(p => p.id);
          
          // Obtener records de esos pacientes
          const { data: patientRecords } = await supabase
            .from('medical_records')
            .select('id')
            .in('patient_id', patientIds);
          
          if (patientRecords) {
            allRecordIds.push(...patientRecords.map(r => r.id));
          }
        }

        // Eliminar duplicados
        allRecordIds = [...new Set(allRecordIds)];
      }

      // Construir query para contar total
      let countQuery = supabase
        .from('medical_records')
        .select('id', { count: 'exact', head: true });
      
      // Aplicar filtros al count
      if (selectedTemplate !== "all") {
        countQuery = countQuery.eq('template_id', selectedTemplate);
      }
      if (dateRange) {
        countQuery = countQuery.gte('visit_date', dateRange.start).lte('visit_date', dateRange.end);
      }
      if (searchText && allRecordIds.length > 0) {
        countQuery = countQuery.in('id', allRecordIds);
      } else if (searchText && allRecordIds.length === 0) {
        setRecords([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Construir query principal desde medical_records con paginación
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('medical_records')
        .select(`
          id,
          hms,
          visit_date,
          status,
          created_at,
          form_data,
          template_id,
          patient_id,
          patients (
            id,
            patient_code,
            first_name,
            last_name,
            dni,
            birth_date,
            gender,
            phone,
            email,
            address
          )
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      // Filtrar por template si está seleccionado
      if (selectedTemplate !== "all") {
        query = query.eq('template_id', selectedTemplate);
      }

      // Filtrar por rango de fechas
      if (dateRange) {
        query = query.gte('visit_date', dateRange.start).lte('visit_date', dateRange.end);
      }

      // Filtrar por IDs encontrados en la búsqueda
      if (searchText && allRecordIds.length > 0) {
        query = query.in('id', allRecordIds);
      }

      const { data: recordsData, error: recordsError } = await query;

      if (recordsError) throw recordsError;

      const transformedRecords: MedicalRecord[] = [];

      // Obtener todos los template_ids únicos para una sola consulta
      const templateIds = [...new Set((recordsData || []).map(r => r.template_id).filter(Boolean))];
      
      let templatesMap: Record<string, any> = {};
      if (templateIds.length > 0) {
        const { data: templatesData } = await supabase
          .from('medical_record_templates')
          .select('*')
          .in('id', templateIds);
        
        if (templatesData) {
          templatesMap = templatesData.reduce((acc, t) => {
            acc[t.id] = t;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      for (const record of recordsData || []) {
        const templateData = record.template_id ? templatesMap[record.template_id] : null;
        const patientData = record.patients;
        
        if (patientData) {
          transformedRecords.push({
            id: record.id,
            visit_date: record.visit_date,
            status: record.status || 'En Progreso',
            record_number: record.hms || 'Sin número',
            created_at: record.created_at,
            form_data: record.form_data || {},
            hms: record.hms || 'N/A',
            patient: patientData,
            medical_record_templates: {
              id: templateData?.id || '',
              name: templateData?.name || 'Plantilla no disponible',
              header_config: templateData?.header_config || {},
              body_config: Array.isArray(templateData?.body_config) ? templateData.body_config : [],
              footer_config: templateData?.footer_config || {}
            }
          });
        }
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

      fetchAllRecords();
    } catch (error) {
      console.error('Error deleting medical record:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la historia clínica",
        variant: "destructive",
      });
    }
  };

  const handleViewRecord = (record: MedicalRecord) => {
    setViewingRecord(record);
  };

  const handleBackToList = () => {
    setViewingRecord(null);
  };

  const handleEditRecord = (record: MedicalRecord) => {
    setEditingRecord(record);
  };

  const handleEditSuccess = () => {
    setEditingRecord(null);
    fetchAllRecords();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Los registros ya vienen filtrados del servidor
  const filteredRecords = records;

  // Full-page edit view - using PatientMedicalHistory for complete editor
  if (editingRecord) {
    const patientName = `${editingRecord.patient.first_name} ${editingRecord.patient.last_name}`;
    return (
      <PatientMedicalHistory
        patientId={editingRecord.patient.id}
        patientName={patientName}
        onClose={handleEditSuccess}
      />
    );
  }

  if (viewingRecord) {
    return (
      <TemplateBasedMedicalRecordViewer
        patient={viewingRecord.patient}
        record={viewingRecord}
        onEdit={(recordId) => {
          const record = records.find(r => r.id === recordId);
          if (record) {
            setViewingRecord(null);
            handleEditRecord(record);
          }
        }}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Historias Clínicas</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowNewDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nueva Historia
          </Button>
          <Button
            onClick={() => setShowExcelImport(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Importar Excel
          </Button>
        </div>
      </div>

      <NewMedicalRecordDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onSuccess={() => {
          fetchAllRecords();
          setShowNewDialog(false);
        }}
      />

      <MedicalRecordsExcelImportDialog
        open={showExcelImport}
        onOpenChange={setShowExcelImport}
        onSuccess={fetchAllRecords}
      />

      {/* Dialog removed - edit view is now full-page */}

      <Card className="mb-4">
        <CardContent className="pt-6 space-y-4">
          {/* Filtros de fecha */}
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as FilterType)}>
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="today">Hoy</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mes Actual</TabsTrigger>
                <TabsTrigger value="custom-month">Mes</TabsTrigger>
                <TabsTrigger value="custom-date">Fecha</TabsTrigger>
              </TabsList>
            </Tabs>

            {dateFilter === "custom-month" && (
              <MonthYearPicker
                value={customMonth}
                onChange={setCustomMonth}
                className="w-[180px]"
              />
            )}

            {dateFilter === "custom-date" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !customDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDate ? format(customDate, "dd/MM/yyyy") : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={setCustomDate}
                    locale={es}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}

            <Badge variant="secondary" className="ml-auto">
              {totalCount} registro{totalCount !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por HMS, Paciente o DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Todas las Historias Clínicas</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtrar por tipo:</span>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las plantillas</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-lg">Cargando historias clínicas...</div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">No hay historias clínicas registradas</p>
              {selectedTemplate !== "all" && (
                <p className="text-sm">con el filtro seleccionado</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HMS</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Fecha Visita</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {(record as any).hms || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {record.medical_record_templates.name}
                    </TableCell>
                    <TableCell>
                      {record.patient.first_name} {record.patient.last_name}
                    </TableCell>
                    <TableCell>{record.patient.dni}</TableCell>
                    <TableCell>
                      {format(new Date(record.visit_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          record.status === 'Completada' ? 'default' :
                          record.status === 'En Progreso' ? 'secondary' : 'outline'
                        }
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleViewRecord(record)}
                          title="Ver historia"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleEditRecord(record)}
                          title="Editar historia"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDelete(record.id)}
                          className="text-destructive hover:text-destructive"
                          title="Eliminar historia"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Paginación */}
          {!loading && totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Mostrar:</span>
                <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">por página</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(currentPage - 1)}
                        className={cn(
                          "cursor-pointer",
                          currentPage === 1 && "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>
                    {getPageNumbers().map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(currentPage + 1)}
                        className={cn(
                          "cursor-pointer",
                          currentPage === totalPages && "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
