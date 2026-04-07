import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Package, Eye, Table } from "lucide-react";

interface PharmacyConfig {
  lowStockPercentage: number;
  expiryAlertValue: number;
  expiryAlertUnit: "days" | "months" | "years";
  inventoryColumns: Record<string, boolean>;
  entriesColumns: Record<string, boolean>;
  outputsColumns: Record<string, boolean>;
  medicationsColumns: Record<string, boolean>;
}

const INVENTORY_COLUMNS = [
  { key: "ubicacion", label: "Ubicación" },
  { key: "codigo", label: "Código" },
  { key: "descripcion", label: "Descripción" },
  { key: "ff", label: "FF" },
  { key: "lote", label: "Lote" },
  { key: "fv", label: "F.V." },
  { key: "presentacion", label: "Presentación" },
  { key: "stock_inicial", label: "Stock Inicial" },
  { key: "entrada", label: "Entrada" },
  { key: "salida", label: "Salida" },
  { key: "stock_actual", label: "Stock Actual" },
  { key: "precio_venta", label: "Precio Venta" },
];

const ENTRIES_COLUMNS = [
  { key: "acciones", label: "Acciones" },
  { key: "proveedor", label: "Proveedor" },
  { key: "nro_factura", label: "Nro Factura" },
  { key: "fecha", label: "Fecha" },
  { key: "num_cajas", label: "N° Cajas" },
  { key: "cod_producto", label: "Cod. Del Producto" },
  { key: "descripcion", label: "Descripción" },
  { key: "forma_farmaceutica", label: "Forma Farmaceutica" },
  { key: "laboratorio", label: "Laboratorio" },
  { key: "lote", label: "Lote" },
  { key: "nsoc_rs", label: "NSOC/RS" },
  { key: "fecha_venc", label: "Fecha Venc" },
  { key: "presentacion", label: "Presentación" },
  { key: "cant_solicitada", label: "Cant. Solicitada" },
  { key: "cant_recibida", label: "Cant. Recibida" },
  { key: "se_acepta", label: "Se Acepta" },
  { key: "observaciones", label: "Observaciones" },
  { key: "costo_compra", label: "Costo Compra" },
  { key: "credito_contado", label: "Crédito/Contado" },
  { key: "monto_total", label: "Monto Total" },
  { key: "fecha_venc_factura", label: "Fecha Venc Factura" },
  { key: "estado", label: "Estado" },
];

const OUTPUTS_COLUMNS = [
  { key: "fecha", label: "Fecha" },
  { key: "cod_producto", label: "Cod. Del Producto" },
  { key: "descripcion", label: "Descripción" },
  { key: "cantidad", label: "Cantidad" },
  { key: "costo_venta", label: "Costo De Venta Por Und" },
  { key: "total", label: "Total" },
  { key: "comentarios", label: "Comentarios" },
  { key: "acciones", label: "Acciones" },
];

const MEDICATIONS_COLUMNS = [
  { key: "codigo", label: "Código" },
  { key: "descripcion", label: "Descripción" },
  { key: "forma_farmaceutica", label: "Forma Farmacéutica" },
  { key: "laboratorio", label: "Laboratorio" },
  { key: "lote", label: "Lote" },
  { key: "fecha_vencimiento", label: "Fecha Vencimiento" },
  { key: "presentacion", label: "Presentación" },
  { key: "stock_inicial", label: "Stock Inicial" },
  { key: "entrada", label: "Entrada" },
  { key: "salida", label: "Salida" },
  { key: "stock_actual", label: "Stock Actual" },
  { key: "precio_venta", label: "Precio Venta" },
  { key: "comentarios", label: "Comentarios" },
  { key: "acciones", label: "Acciones" },
];

const DEFAULT_CONFIG: PharmacyConfig = {
  lowStockPercentage: 50,
  expiryAlertValue: 30,
  expiryAlertUnit: "days",
  inventoryColumns: Object.fromEntries(INVENTORY_COLUMNS.map(col => [col.key, true])),
  entriesColumns: Object.fromEntries(ENTRIES_COLUMNS.map(col => [col.key, true])),
  outputsColumns: Object.fromEntries(OUTPUTS_COLUMNS.map(col => [col.key, true])),
  medicationsColumns: Object.fromEntries(MEDICATIONS_COLUMNS.map(col => [col.key, true])),
};

export function PharmacyConfigPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<PharmacyConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    // Load config from localStorage
    const savedConfig = localStorage.getItem("pharmacy_config");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        // Merge with default config to ensure all properties exist
        setConfig({
          ...DEFAULT_CONFIG,
          ...parsed,
          inventoryColumns: { ...DEFAULT_CONFIG.inventoryColumns, ...parsed.inventoryColumns },
          entriesColumns: { ...DEFAULT_CONFIG.entriesColumns, ...parsed.entriesColumns },
          outputsColumns: { ...DEFAULT_CONFIG.outputsColumns, ...parsed.outputsColumns },
          medicationsColumns: { ...DEFAULT_CONFIG.medicationsColumns, ...parsed.medicationsColumns },
        });
      } catch (error) {
        console.error("Error loading config:", error);
      }
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem("pharmacy_config", JSON.stringify(config));
      toast({
        title: "Configuración guardada",
        description: "Las configuraciones de alertas se han actualizado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground">Gestiona las configuraciones de alertas para el inventario</p>
      </div>

      <div className="grid gap-6">
        {/* Stock Bajo Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle>Stock Bajo</CardTitle>
            </div>
            <CardDescription>
              Establece el porcentaje mínimo de stock actual respecto al stock mínimo para activar alertas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lowStockPercentage">
                Porcentaje de alerta (%)
              </Label>
              <Input
                id="lowStockPercentage"
                type="number"
                min="0"
                max="100"
                value={config.lowStockPercentage}
                onChange={(e) => setConfig({ ...config, lowStockPercentage: Number(e.target.value) })}
                placeholder="50"
              />
              <p className="text-sm text-muted-foreground">
                Ejemplo: Si un medicamento tiene un stock mínimo de 10 unidades y configuras 50%, 
                se activará una alerta cuando el stock actual sea de 5 o menos unidades.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Por Vencer Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <CardTitle>Por Vencer</CardTitle>
            </div>
            <CardDescription>
              Establece el periodo de anticipación para alertas de medicamentos próximos a vencer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryAlertValue">
                  Tiempo de anticipación
                </Label>
                <Input
                  id="expiryAlertValue"
                  type="number"
                  min="1"
                  value={config.expiryAlertValue}
                  onChange={(e) => setConfig({ ...config, expiryAlertValue: Number(e.target.value) })}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryAlertUnit">
                  Unidad de tiempo
                </Label>
                <Select
                  value={config.expiryAlertUnit}
                  onValueChange={(value: "days" | "months" | "years") => 
                    setConfig({ ...config, expiryAlertUnit: value })
                  }
                >
                  <SelectTrigger id="expiryAlertUnit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Días</SelectItem>
                    <SelectItem value="months">Meses</SelectItem>
                    <SelectItem value="years">Años</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Ejemplo: Si configuras 30 días, se activará una alerta para todos los medicamentos 
              cuya fecha de vencimiento esté a 30 días o menos de la fecha actual.
            </p>
          </CardContent>
        </Card>

        {/* Inventario Columns Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Table className="h-5 w-5 text-primary" />
              <CardTitle>Columnas de Inventario</CardTitle>
            </div>
            <CardDescription>
              Selecciona las columnas que deseas mostrar en la tabla de inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {INVENTORY_COLUMNS.map((column) => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`inventory-${column.key}`}
                    checked={config.inventoryColumns[column.key] ?? true}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        inventoryColumns: {
                          ...config.inventoryColumns,
                          [column.key]: checked === true,
                        },
                      })
                    }
                  />
                  <Label
                    htmlFor={`inventory-${column.key}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Entradas Columns Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Table className="h-5 w-5 text-primary" />
              <CardTitle>Columnas de Entradas</CardTitle>
            </div>
            <CardDescription>
              Selecciona las columnas que deseas mostrar en la tabla de entradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {ENTRIES_COLUMNS.map((column) => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`entries-${column.key}`}
                    checked={config.entriesColumns[column.key] ?? true}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        entriesColumns: {
                          ...config.entriesColumns,
                          [column.key]: checked === true,
                        },
                      })
                    }
                  />
                  <Label
                    htmlFor={`entries-${column.key}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Salidas Columns Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Table className="h-5 w-5 text-primary" />
              <CardTitle>Columnas de Salidas</CardTitle>
            </div>
            <CardDescription>
              Selecciona las columnas que deseas mostrar en la tabla de salidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {OUTPUTS_COLUMNS.map((column) => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`outputs-${column.key}`}
                    checked={config.outputsColumns[column.key] ?? true}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        outputsColumns: {
                          ...config.outputsColumns,
                          [column.key]: checked === true,
                        },
                      })
                    }
                  />
                  <Label
                    htmlFor={`outputs-${column.key}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Medicamentos Columns Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Table className="h-5 w-5 text-primary" />
              <CardTitle>Columnas de Medicamentos</CardTitle>
            </div>
            <CardDescription>
              Selecciona las columnas que deseas mostrar en la tabla de medicamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {MEDICATIONS_COLUMNS.map((column) => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`medications-${column.key}`}
                    checked={config.medicationsColumns[column.key] ?? true}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        medicationsColumns: {
                          ...config.medicationsColumns,
                          [column.key]: checked === true,
                        },
                      })
                    }
                  />
                  <Label
                    htmlFor={`medications-${column.key}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg">
            Guardar Configuración
          </Button>
        </div>
      </div>
    </div>
  );
}
