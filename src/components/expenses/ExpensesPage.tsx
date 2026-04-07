import React, { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  TrendingDown,
  Plus,
  CalendarIcon,
  Sun,
  Moon,
  Filter,
  DollarSign,
  Receipt,
  FolderTree,
  Trash2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEgresos, EgresoFilters, getTurno } from "@/hooks/useEgresos";
import { ExpenseConceptsManager } from "./ExpenseConceptsManager";
import { Textarea } from "@/components/ui/textarea";

export function ExpensesPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [filters, setFilters] = useState<EgresoFilters>({
    fechaDesde: today,
    fechaHasta: today,
    categoriaId: null,
    conceptoId: null,
    turno: null,
    modalidadId: null,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEgreso, setSelectedEgreso] = useState<any>(null);

  // Form state
  const [formConceptoId, setFormConceptoId] = useState("");
  const [formCategoriaId, setFormCategoriaId] = useState("");
  const [formMonto, setFormMonto] = useState("");
  const [formFecha, setFormFecha] = useState<Date>(new Date());
  const [formHora, setFormHora] = useState(format(new Date(), "HH:mm"));
  const [formModalidadId, setFormModalidadId] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formComprobante, setFormComprobante] = useState("");

  const {
    egresos,
    categorias,
    conceptos,
    modalidades,
    summaries,
    isLoading,
    createEgreso,
    updateEgreso,
    deleteEgreso,
  } = useEgresos(filters);

  const resetForm = () => {
    setFormConceptoId("");
    setFormCategoriaId("");
    setFormMonto("");
    setFormFecha(new Date());
    setFormHora(format(new Date(), "HH:mm"));
    setFormModalidadId("");
    setFormDescripcion("");
    setFormComprobante("");
  };

  const handleCreate = async () => {
    if (!formConceptoId || !formCategoriaId || !formMonto || !formModalidadId) return;

    await createEgreso.mutateAsync({
      concepto_id: formConceptoId,
      categoria_id: formCategoriaId,
      monto: parseFloat(formMonto),
      fecha: format(formFecha, "yyyy-MM-dd"),
      hora: formHora,
      modalidad_id: formModalidadId,
      descripcion: formDescripcion || undefined,
      comprobante_referencia: formComprobante || undefined,
    });

    resetForm();
    setNewDialogOpen(false);
  };

  const handleEdit = async () => {
    if (!selectedEgreso) return;

    await updateEgreso.mutateAsync({
      id: selectedEgreso.id,
      concepto_id: formConceptoId || undefined,
      categoria_id: formCategoriaId || undefined,
      monto: formMonto ? parseFloat(formMonto) : undefined,
      fecha: format(formFecha, "yyyy-MM-dd"),
      hora: formHora,
      modalidad_id: formModalidadId || undefined,
      descripcion: formDescripcion || undefined,
      comprobante_referencia: formComprobante || undefined,
    });

    resetForm();
    setEditDialogOpen(false);
    setSelectedEgreso(null);
  };

  const openEditDialog = (egreso: any) => {
    setSelectedEgreso(egreso);
    setFormConceptoId(egreso.concepto_id || "");
    setFormCategoriaId(egreso.categoria_id || "");
    setFormMonto(egreso.monto.toString());
    setFormFecha(new Date(egreso.fecha));
    setFormHora(egreso.hora);
    setFormModalidadId(egreso.modalidad_id || "");
    setFormDescripcion(egreso.descripcion || "");
    setFormComprobante(egreso.comprobante_referencia || "");
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este egreso?")) {
      await deleteEgreso.mutateAsync(id);
    }
  };

  // Filtrar conceptos por categoría seleccionada
  const filteredConceptos = formCategoriaId
    ? conceptos.filter((c) => c.categoria_id === formCategoriaId)
    : conceptos;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-red-500" />
            Egresos
          </h1>
          <p className="text-muted-foreground">
            Registro y control de gastos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExpenseConceptsManager />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-accent")}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Egreso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Egreso</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Categoría</Label>
                    <Select value={formCategoriaId} onValueChange={(v) => { setFormCategoriaId(v); setFormConceptoId(""); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        {categorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Concepto</Label>
                    <Select value={formConceptoId} onValueChange={setFormConceptoId} disabled={!formCategoriaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        {filteredConceptos.map((con) => (
                          <SelectItem key={con.id} value={con.id}>{con.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Monto (S/.)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formMonto}
                      onChange={(e) => setFormMonto(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Método de Pago</Label>
                    <Select value={formModalidadId} onValueChange={setFormModalidadId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        {modalidades.map((mod: any) => (
                          <SelectItem key={mod.id} value={mod.id}>{mod.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Fecha</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formFecha, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background" align="start">
                        <Calendar
                          mode="single"
                          selected={formFecha}
                          onSelect={(d) => d && setFormFecha(d)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Hora</Label>
                    <Input
                      type="time"
                      value={formHora}
                      onChange={(e) => setFormHora(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Turno: {getTurno(formHora)}
                    </p>
                  </div>
                </div>
                <div>
                  <Label>Nro. Comprobante (opcional)</Label>
                  <Input
                    value={formComprobante}
                    onChange={(e) => setFormComprobante(e.target.value)}
                    placeholder="Ej: 001-00123"
                  />
                </div>
                <div>
                  <Label>Descripción (opcional)</Label>
                  <Textarea
                    value={formDescripcion}
                    onChange={(e) => setFormDescripcion(e.target.value)}
                    placeholder="Detalles adicionales..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { resetForm(); setNewDialogOpen(false); }}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!formConceptoId || !formCategoriaId || !formMonto || !formModalidadId || createEgreso.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Registrar Egreso
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div>
                <Label>Desde</Label>
                <Input
                  type="date"
                  value={filters.fechaDesde}
                  onChange={(e) => setFilters({ ...filters, fechaDesde: e.target.value })}
                />
              </div>
              <div>
                <Label>Hasta</Label>
                <Input
                  type="date"
                  value={filters.fechaHasta}
                  onChange={(e) => setFilters({ ...filters, fechaHasta: e.target.value })}
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <Select
                  value={filters.categoriaId || "all"}
                  onValueChange={(v) => setFilters({ ...filters, categoriaId: v === "all" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">Todas</SelectItem>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Concepto</Label>
                <Select
                  value={filters.conceptoId || "all"}
                  onValueChange={(v) => setFilters({ ...filters, conceptoId: v === "all" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">Todos</SelectItem>
                    {conceptos.map((con) => (
                      <SelectItem key={con.id} value={con.id}>{con.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Turno</Label>
                <Select
                  value={filters.turno || "all"}
                  onValueChange={(v) => setFilters({ ...filters, turno: v === "all" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Mañana">Mañana</SelectItem>
                    <SelectItem value="Tarde">Tarde</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Método de Pago</Label>
                <Select
                  value={filters.modalidadId || "all"}
                  onValueChange={(v) => setFilters({ ...filters, modalidadId: v === "all" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">Todos</SelectItem>
                    {modalidades.map((mod: any) => (
                      <SelectItem key={mod.id} value={mod.id}>{mod.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Egresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800">
              S/. {summaries.totalEgresos.toFixed(2)}
            </div>
            <p className="text-xs text-red-600">{summaries.countEgresos} registros</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Turno Mañana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-800">
              S/. {summaries.totalMañana.toFixed(2)}
            </div>
            <p className="text-xs text-amber-600">{summaries.countMañana} registros</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-700 flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Turno Tarde
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-800">
              S/. {summaries.totalTarde.toFixed(2)}
            </div>
            <p className="text-xs text-indigo-600">{summaries.countTarde} registros</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {summaries.byCategoria.slice(0, 3).map((cat) => (
                <div key={cat.nombre} className="flex justify-between text-sm">
                  <span className="truncate text-gray-600">{cat.nombre}</span>
                  <span className="font-medium text-gray-800">S/. {cat.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Registro de Egresos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Método Pago</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {egresos.map((egreso) => (
                  <TableRow key={egreso.id}>
                    <TableCell>{format(new Date(egreso.fecha), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{egreso.hora.substring(0, 5)}</TableCell>
                    <TableCell>
                      <Badge variant={egreso.turno === "Mañana" ? "default" : "secondary"}>
                        {egreso.turno === "Mañana" ? <Sun className="h-3 w-3 mr-1" /> : <Moon className="h-3 w-3 mr-1" />}
                        {egreso.turno}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{egreso.categoria?.nombre || "-"}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{egreso.concepto?.nombre || "-"}</TableCell>
                    <TableCell>{egreso.modalidad?.nombre || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{egreso.comprobante_referencia || "-"}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      S/. {Number(egreso.monto).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(egreso)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(egreso.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {egresos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No hay egresos registrados para el período seleccionado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Egreso</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría</Label>
                <Select value={formCategoriaId} onValueChange={(v) => { setFormCategoriaId(v); setFormConceptoId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Concepto</Label>
                <Select value={formConceptoId} onValueChange={setFormConceptoId} disabled={!formCategoriaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {filteredConceptos.map((con) => (
                      <SelectItem key={con.id} value={con.id}>{con.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monto (S/.)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formMonto}
                  onChange={(e) => setFormMonto(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Método de Pago</Label>
                <Select value={formModalidadId} onValueChange={setFormModalidadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {modalidades.map((mod: any) => (
                      <SelectItem key={mod.id} value={mod.id}>{mod.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formFecha, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background" align="start">
                    <Calendar
                      mode="single"
                      selected={formFecha}
                      onSelect={(d) => d && setFormFecha(d)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={formHora}
                  onChange={(e) => setFormHora(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Turno: {getTurno(formHora)}
                </p>
              </div>
            </div>
            <div>
              <Label>Nro. Comprobante (opcional)</Label>
              <Input
                value={formComprobante}
                onChange={(e) => setFormComprobante(e.target.value)}
                placeholder="Ej: 001-00123"
              />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={formDescripcion}
                onChange={(e) => setFormDescripcion(e.target.value)}
                placeholder="Detalles adicionales..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setEditDialogOpen(false); setSelectedEgreso(null); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={updateEgreso.isPending}
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
