import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, CreditCard, Image, DollarSign, FileText, Upload, Settings, Search, X } from "lucide-react";
import { useConceptos, useCreateConcepto, useUpdateConcepto, useDeleteConcepto, type Concepto } from "@/hooks/useConceptos";
import { useModalidades, useCreateModalidad, useUpdateModalidad, useDeleteModalidad, type Modalidad } from "@/hooks/useModalidades";
import { useMedicalSpecialties } from "@/hooks/useMedicalSpecialties";
import { ConceptosExcelImportDialog } from "./ConceptosExcelImportDialog";
import { ConceptoTiposManager, loadConceptoTipos, type ConceptoTipo } from "./ConceptoTiposManager";
import { useToast } from "@/hooks/use-toast";

interface ConceptoFormData {
  nombre: string;
  descripcion: string;
  tipo: string;
  monto: number;
  activo: boolean;
  especialidad_id: string;
}

interface ModalidadFormData {
  nombre: string;
  descripcion: string;
  icono: string;
  activo: boolean;
}

export function PaymentsConfig() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("conceptos");
  const [conceptoDialog, setConceptoDialog] = useState(false);
  const [modalidadDialog, setModalidadDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [tiposManagerOpen, setTiposManagerOpen] = useState(false);
  const [editingConcepto, setEditingConcepto] = useState<Concepto | null>(null);
  const [editingModalidad, setEditingModalidad] = useState<Modalidad | null>(null);
  const [conceptoTipos, setConceptoTipos] = useState<ConceptoTipo[]>(() => loadConceptoTipos());
  const [searchNombre, setSearchNombre] = useState("");
  const [searchTipo, setSearchTipo] = useState("");
  const [searchEspecialidad, setSearchEspecialidad] = useState("");
  
  // Bulk selection state
  const [selectedConceptoIds, setSelectedConceptoIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const [conceptoForm, setConceptoForm] = useState<ConceptoFormData>({
    nombre: "",
    descripcion: "",
    tipo: "consulta",
    monto: 0,
    activo: true,
    especialidad_id: "",
  });

  const [modalidadForm, setModalidadForm] = useState<ModalidadFormData>({
    nombre: "",
    descripcion: "",
    icono: "",
    activo: true,
  });

  const { data: conceptos, isLoading: loadingConceptos } = useConceptos();
  const { data: modalidades, isLoading: loadingModalidades } = useModalidades();
  const { data: specialties, fetchData: fetchSpecialties } = useMedicalSpecialties();
  const createConcepto = useCreateConcepto();
  const updateConcepto = useUpdateConcepto();
  const deleteConcepto = useDeleteConcepto();
  const createModalidad = useCreateModalidad();
  const updateModalidad = useUpdateModalidad();
  const deleteModalidad = useDeleteModalidad();

  useEffect(() => {
    fetchSpecialties();
  }, []);

  // Lógica de filtrado de conceptos
  const filteredConceptos = conceptos?.filter((concepto) => {
    const matchNombre = !searchNombre || concepto.nombre.toLowerCase().includes(searchNombre.toLowerCase());
    const matchTipo = !searchTipo || searchTipo === "all" || concepto.tipo === searchTipo;
    const matchEspecialidad = 
      !searchEspecialidad || 
      searchEspecialidad === "all" || 
      (searchEspecialidad === "none" && !concepto.especialidad_id) ||
      concepto.especialidad_id === searchEspecialidad;
    return matchNombre && matchTipo && matchEspecialidad;
  }) || [];

  // Bulk selection handlers
  const handleSelectAllConceptos = (checked: boolean) => {
    if (checked) {
      setSelectedConceptoIds(new Set(filteredConceptos.map(c => c.id)));
    } else {
      setSelectedConceptoIds(new Set());
    }
  };

  const handleSelectConcepto = (conceptoId: string, checked: boolean) => {
    const newSelected = new Set(selectedConceptoIds);
    if (checked) {
      newSelected.add(conceptoId);
    } else {
      newSelected.delete(conceptoId);
    }
    setSelectedConceptoIds(newSelected);
  };

  const confirmBulkDeleteConceptos = async () => {
    try {
      let deletedCount = 0;
      for (const id of selectedConceptoIds) {
        await deleteConcepto.mutateAsync(id);
        deletedCount++;
      }
      toast({
        title: "Conceptos eliminados",
        description: `Se eliminaron ${deletedCount} conceptos correctamente.`,
      });
      setShowBulkDeleteDialog(false);
      setSelectedConceptoIds(new Set());
    } catch (error) {
      console.error("Error deleting conceptos:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar los conceptos.",
        variant: "destructive",
      });
    }
  };

  const allFilteredSelected = filteredConceptos.length > 0 && filteredConceptos.every(c => selectedConceptoIds.has(c.id));
  const someFilteredSelected = filteredConceptos.some(c => selectedConceptoIds.has(c.id));

  const resetConceptoForm = () => {
    setConceptoForm({
      nombre: "",
      descripcion: "",
      tipo: "consulta",
      monto: 0,
      activo: true,
      especialidad_id: "",
    });
    setEditingConcepto(null);
  };

  const resetModalidadForm = () => {
    setModalidadForm({
      nombre: "",
      descripcion: "",
      icono: "",
      activo: true,
    });
    setEditingModalidad(null);
  };

  const handleCreateConcepto = async () => {
    const payload = {
      ...conceptoForm,
      especialidad_id: conceptoForm.especialidad_id || null,
    };
    await createConcepto.mutateAsync(payload);
    setConceptoDialog(false);
    resetConceptoForm();
  };

  const handleUpdateConcepto = async () => {
    if (!editingConcepto) return;
    const payload = {
      id: editingConcepto.id,
      ...conceptoForm,
      especialidad_id: conceptoForm.especialidad_id || null,
    };
    await updateConcepto.mutateAsync(payload);
    setConceptoDialog(false);
    resetConceptoForm();
  };

  const handleEditConcepto = (concepto: Concepto) => {
    setEditingConcepto(concepto);
    setConceptoForm({
      nombre: concepto.nombre,
      descripcion: concepto.descripcion || "",
      tipo: concepto.tipo,
      monto: concepto.monto,
      activo: concepto.activo,
      especialidad_id: concepto.especialidad_id || "",
    });
    setConceptoDialog(true);
  };

  const handleCreateModalidad = async () => {
    await createModalidad.mutateAsync(modalidadForm);
    setModalidadDialog(false);
    resetModalidadForm();
  };

  const handleUpdateModalidad = async () => {
    if (!editingModalidad) return;
    await updateModalidad.mutateAsync({ id: editingModalidad.id, ...modalidadForm });
    setModalidadDialog(false);
    resetModalidadForm();
  };

  const handleEditModalidad = (modalidad: Modalidad) => {
    setEditingModalidad(modalidad);
    setModalidadForm({
      nombre: modalidad.nombre,
      descripcion: modalidad.descripcion || "",
      icono: modalidad.icono || "",
      activo: modalidad.activo,
    });
    setModalidadDialog(true);
  };

  const handleIconoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setModalidadForm(prev => ({ ...prev, icono: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card className="border-teal-200">
      <CardHeader className="bg-gradient-to-r from-teal-50 to-blue-50">
        <CardTitle className="text-teal-800 flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Configuración de Pagos
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="conceptos" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Conceptos
            </TabsTrigger>
            <TabsTrigger value="modalidades" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Modalidades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conceptos" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Gestión de Conceptos</h3>
                <Badge variant="secondary" className="text-xs">
                  {conceptos?.length || 0} registros
                </Badge>
              </div>
              <div className="flex gap-2">
                {selectedConceptoIds.size > 0 && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowBulkDeleteDialog(true)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar seleccionados ({selectedConceptoIds.size})
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setImportDialog(true)}
                  className="border-teal-300 text-teal-700 hover:bg-teal-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Excel
                </Button>
                <Dialog open={conceptoDialog} onOpenChange={setConceptoDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={resetConceptoForm} className="bg-teal-600 hover:bg-teal-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Concepto
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingConcepto ? "Editar Concepto" : "Nuevo Concepto"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingConcepto ? "Modifica los datos del concepto" : "Completa los datos del nuevo concepto"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="concepto-nombre">Nombre *</Label>
                      <Input
                        id="concepto-nombre"
                        value={conceptoForm.nombre}
                        onChange={(e) => setConceptoForm(prev => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Nombre del concepto"
                      />
                    </div>
                    <div>
                      <Label htmlFor="concepto-descripcion">Descripción</Label>
                      <Textarea
                        id="concepto-descripcion"
                        value={conceptoForm.descripcion}
                        onChange={(e) => setConceptoForm(prev => ({ ...prev, descripcion: e.target.value }))}
                        placeholder="Descripción del concepto"
                        rows={3}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="concepto-tipo">Tipo *</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => setTiposManagerOpen(true)}
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Select value={conceptoForm.tipo} onValueChange={(value) => setConceptoForm(prev => ({ ...prev, tipo: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {conceptoTipos
                            .filter((t) => t.activo)
                            .map((tipo) => (
                              <SelectItem key={tipo.id} value={tipo.id}>
                                {tipo.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="concepto-especialidad">Especialidad</Label>
                      <Select 
                        value={conceptoForm.especialidad_id} 
                        onValueChange={(value) => setConceptoForm(prev => ({ ...prev, especialidad_id: value === "none" ? "" : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar especialidad (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin especialidad</SelectItem>
                          {specialties.map((specialty) => (
                            <SelectItem key={specialty.id} value={specialty.id}>
                              {specialty.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="concepto-monto">Monto *</Label>
                      <Input
                        id="concepto-monto"
                        type="number"
                        min="0"
                        step="0.01"
                        value={conceptoForm.monto}
                        onChange={(e) => setConceptoForm(prev => ({ ...prev, monto: parseFloat(e.target.value) }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="concepto-activo"
                        checked={conceptoForm.activo}
                        onCheckedChange={(checked) => setConceptoForm(prev => ({ ...prev, activo: checked }))}
                      />
                      <Label htmlFor="concepto-activo">Activo</Label>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={editingConcepto ? handleUpdateConcepto : handleCreateConcepto}
                        disabled={createConcepto.isPending || updateConcepto.isPending}
                        className="flex-1"
                      >
                        {editingConcepto ? "Actualizar" : "Crear"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setConceptoDialog(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            </div>

            {/* Buscador múltiple */}
            <div className="flex flex-wrap gap-2 items-center bg-muted/30 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Buscar:</span>
              </div>
              <Input
                placeholder="Nombre..."
                value={searchNombre}
                onChange={(e) => setSearchNombre(e.target.value)}
                className="w-48 h-8"
              />
              <Select value={searchTipo} onValueChange={setSearchTipo}>
                <SelectTrigger className="w-40 h-8">
                  <SelectValue placeholder="Tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {conceptoTipos.filter(t => t.activo).map(tipo => (
                    <SelectItem key={tipo.id} value={tipo.id}>{tipo.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={searchEspecialidad} onValueChange={setSearchEspecialidad}>
                <SelectTrigger className="w-48 h-8">
                  <SelectValue placeholder="Especialidad..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las especialidades</SelectItem>
                  <SelectItem value="none">Sin especialidad</SelectItem>
                  {specialties.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(searchNombre || searchTipo || searchEspecialidad) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchNombre("");
                    setSearchTipo("");
                    setSearchEspecialidad("");
                  }}
                  className="h-8 px-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>

            {/* Contador de resultados filtrados */}
            {(searchNombre || searchTipo || searchEspecialidad) && (
              <p className="text-sm text-muted-foreground">
                Mostrando {filteredConceptos.length} de {conceptos?.length || 0} conceptos
              </p>
            )}

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allFilteredSelected}
                        onCheckedChange={handleSelectAllConceptos}
                        aria-label="Seleccionar todos"
                        className={someFilteredSelected && !allFilteredSelected ? "opacity-50" : ""}
                      />
                    </TableHead>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Especialidad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingConceptos ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">Cargando...</TableCell>
                    </TableRow>
                  ) : filteredConceptos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        {conceptos?.length === 0 ? "No hay conceptos registrados" : "No se encontraron resultados"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredConceptos.map((concepto, index) => (
                      <TableRow key={concepto.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedConceptoIds.has(concepto.id)}
                            onCheckedChange={(checked) => handleSelectConcepto(concepto.id, !!checked)}
                            aria-label={`Seleccionar ${concepto.nombre}`}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm font-mono">{index + 1}</TableCell>
                        <TableCell className="font-medium">{concepto.nombre}</TableCell>
                        <TableCell>
                          {concepto.especialidad_name ? (
                            <Badge variant="outline" className="text-teal-700 border-teal-300">
                              {concepto.especialidad_name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {concepto.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>S/ {concepto.monto.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={concepto.activo ? "default" : "secondary"}>
                            {concepto.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditConcepto(concepto)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteConcepto.mutate(concepto.id)}
                              disabled={deleteConcepto.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Bulk Delete Confirmation Dialog */}
            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar conceptos seleccionados?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Estás a punto de eliminar {selectedConceptoIds.size} concepto(s). Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmBulkDeleteConceptos}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          <TabsContent value="modalidades" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Gestión de Modalidades</h3>
              <Dialog open={modalidadDialog} onOpenChange={setModalidadDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetModalidadForm} className="bg-teal-600 hover:bg-teal-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Modalidad
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingModalidad ? "Editar Modalidad" : "Nueva Modalidad"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingModalidad ? "Modifica los datos de la modalidad" : "Completa los datos de la nueva modalidad"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="modalidad-nombre">Nombre *</Label>
                      <Input
                        id="modalidad-nombre"
                        value={modalidadForm.nombre}
                        onChange={(e) => setModalidadForm(prev => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Nombre de la modalidad"
                      />
                    </div>
                    <div>
                      <Label htmlFor="modalidad-descripcion">Descripción</Label>
                      <Textarea
                        id="modalidad-descripcion"
                        value={modalidadForm.descripcion}
                        onChange={(e) => setModalidadForm(prev => ({ ...prev, descripcion: e.target.value }))}
                        placeholder="Descripción de la modalidad"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="modalidad-icono">Icono</Label>
                      <div className="flex items-center gap-4">
                        {modalidadForm.icono && (
                          <img 
                            src={modalidadForm.icono} 
                            alt="Icono" 
                            className="w-12 h-12 object-cover rounded border"
                          />
                        )}
                        <div className="flex-1">
                          <Input
                            id="modalidad-icono"
                            type="file"
                            accept="image/*"
                            onChange={handleIconoUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('modalidad-icono')?.click()}
                            className="w-full"
                          >
                            <Image className="h-4 w-4 mr-2" />
                            Subir Icono
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="modalidad-activo"
                        checked={modalidadForm.activo}
                        onCheckedChange={(checked) => setModalidadForm(prev => ({ ...prev, activo: checked }))}
                      />
                      <Label htmlFor="modalidad-activo">Activo</Label>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={editingModalidad ? handleUpdateModalidad : handleCreateModalidad}
                        disabled={createModalidad.isPending || updateModalidad.isPending}
                        className="flex-1"
                      >
                        {editingModalidad ? "Actualizar" : "Crear"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setModalidadDialog(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Icono</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingModalidades ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">Cargando...</TableCell>
                    </TableRow>
                  ) : modalidades?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">No hay modalidades registradas</TableCell>
                    </TableRow>
                  ) : (
                    modalidades?.map((modalidad) => (
                      <TableRow key={modalidad.id}>
                        <TableCell>
                          {modalidad.icono ? (
                            <img 
                              src={modalidad.icono} 
                              alt={modalidad.nombre} 
                              className="w-8 h-8 object-cover rounded"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                              <CreditCard className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{modalidad.nombre}</TableCell>
                        <TableCell>{modalidad.descripcion || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={modalidad.activo ? "default" : "secondary"}>
                            {modalidad.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditModalidad(modalidad)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteModalidad.mutate(modalidad.id)}
                              disabled={deleteModalidad.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <ConceptosExcelImportDialog
        open={importDialog}
        onOpenChange={setImportDialog}
        conceptos={conceptos}
      />

      <ConceptoTiposManager
        open={tiposManagerOpen}
        onOpenChange={setTiposManagerOpen}
        tipos={conceptoTipos}
        onTiposChange={setConceptoTipos}
      />
    </Card>
  );
}