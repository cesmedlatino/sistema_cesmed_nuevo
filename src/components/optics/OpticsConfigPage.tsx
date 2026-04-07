import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Settings, 
  Package, 
  AlertTriangle, 
  Printer, 
  Table, 
  FileText, 
  Tag,
  Save,
  RotateCcw,
  Eye,
  Truck,
  BarChart3,
  Receipt
} from "lucide-react";
import { useOpticsProductTypes } from "@/hooks/useOpticsProductTypes";
import { useDefaultLabelTemplate, useOpticsLabelTemplates } from "@/hooks/useOpticsLabelTemplates";

// Column definitions for each table
const PRODUCTS_COLUMNS = [
  { key: "codigo", label: "Código" },
  { key: "nombre", label: "Nombre" },
  { key: "tipo", label: "Tipo" },
  { key: "marca", label: "Marca" },
  { key: "modelo", label: "Modelo" },
  { key: "precio_compra", label: "Precio Compra" },
  { key: "precio_venta", label: "Precio Venta" },
  { key: "stock_actual", label: "Stock Actual" },
  { key: "stock_minimo", label: "Stock Mínimo" },
  { key: "ubicacion", label: "Ubicación" },
  { key: "proveedor", label: "Proveedor" },
];

const INVENTORY_COLUMNS = [
  { key: "fecha", label: "Fecha" },
  { key: "tipo", label: "Tipo Movimiento" },
  { key: "producto", label: "Producto" },
  { key: "cantidad", label: "Cantidad" },
  { key: "referencia", label: "Referencia" },
  { key: "usuario", label: "Usuario" },
  { key: "observaciones", label: "Observaciones" },
];

const ENTRIES_COLUMNS = [
  { key: "fecha", label: "Fecha" },
  { key: "comprobante", label: "Comprobante" },
  { key: "producto", label: "Producto" },
  { key: "cantidad", label: "Cantidad" },
  { key: "costo_unitario", label: "Costo Unitario" },
  { key: "costo_total", label: "Costo Total" },
  { key: "proveedor", label: "Proveedor" },
  { key: "lote", label: "Lote" },
  { key: "observaciones", label: "Observaciones" },
];

const OUTPUTS_COLUMNS = [
  { key: "fecha", label: "Fecha" },
  { key: "comprobante", label: "N° Comprobante" },
  { key: "producto", label: "Producto" },
  { key: "cantidad", label: "Cantidad" },
  { key: "paciente", label: "Paciente" },
  { key: "motivo", label: "Motivo" },
  { key: "usuario", label: "Usuario" },
  { key: "observaciones", label: "Observaciones" },
];

const SUPPLIERS_COLUMNS = [
  { key: "nombre", label: "Nombre" },
  { key: "ruc", label: "RUC" },
  { key: "linea", label: "Línea" },
  { key: "telefono", label: "Teléfono" },
  { key: "email", label: "Email" },
  { key: "direccion", label: "Dirección" },
  { key: "contacto", label: "Contacto" },
];

// Paper sizes for labels
const PAPER_SIZES = [
  { id: "30x20", label: "30 x 20 mm (Térmica estándar)", width: 30, height: 20 },
  { id: "40x30", label: "40 x 30 mm", width: 40, height: 30 },
  { id: "50x25", label: "50 x 25 mm", width: 50, height: 25 },
  { id: "60x40", label: "60 x 40 mm", width: 60, height: 40 },
  { id: "custom", label: "Personalizado", width: 0, height: 0 },
];

// Receipt paper sizes
const RECEIPT_PAPER_SIZES = [
  { id: "58mm", label: "58 mm (Térmica pequeña)", width: 58 },
  { id: "80mm", label: "80 mm (Térmica estándar)", width: 80 },
];

interface OpticsConfig {
  // Stock alerts
  lowStockPercentage: number;
  slowMovingDays: number;
  
  // Label printing
  defaultLabelTemplateId: string | null;
  defaultLabelPaperSize: string;
  labelCustomWidth: number;
  labelCustomHeight: number;
  
  // Receipt printing
  receiptPaperWidth: string;
  receiptCopies: number;
  showReceiptLogo: boolean;
  receiptFooterText: string;
  
  // Table columns visibility
  productsColumns: Record<string, boolean>;
  inventoryColumns: Record<string, boolean>;
  entriesColumns: Record<string, boolean>;
  outputsColumns: Record<string, boolean>;
  suppliersColumns: Record<string, boolean>;
  
  // Reports
  defaultReportType: string;
  includeLogoInReports: boolean;
  
  // General
  autoGenerateProductCode: boolean;
  defaultProductType: string;
  
  // Product code configuration
  productCodePrefix: string;
  productCodePadding: number;
  productCodeStartFrom: number;
}

const DEFAULT_CONFIG: OpticsConfig = {
  lowStockPercentage: 50,
  slowMovingDays: 30,
  defaultLabelTemplateId: null,
  defaultLabelPaperSize: "30x20",
  labelCustomWidth: 30,
  labelCustomHeight: 20,
  receiptPaperWidth: "80mm",
  receiptCopies: 1,
  showReceiptLogo: true,
  receiptFooterText: "Gracias por su preferencia",
  productsColumns: Object.fromEntries(PRODUCTS_COLUMNS.map(col => [col.key, true])),
  inventoryColumns: Object.fromEntries(INVENTORY_COLUMNS.map(col => [col.key, true])),
  entriesColumns: Object.fromEntries(ENTRIES_COLUMNS.map(col => [col.key, true])),
  outputsColumns: Object.fromEntries(OUTPUTS_COLUMNS.map(col => [col.key, true])),
  suppliersColumns: Object.fromEntries(SUPPLIERS_COLUMNS.map(col => [col.key, true])),
  defaultReportType: "catalog",
  includeLogoInReports: true,
  autoGenerateProductCode: true,
  defaultProductType: "",
  productCodePrefix: "OP",
  productCodePadding: 6,
  productCodeStartFrom: 0,
};

export default function OpticsConfigPage() {
  const [config, setConfig] = useState<OpticsConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState("alerts");
  
  const { data: productTypes } = useOpticsProductTypes();
  const { data: labelTemplates } = useOpticsLabelTemplates();
  const { data: defaultTemplate } = useDefaultLabelTemplate();

  useEffect(() => {
    const savedConfig = localStorage.getItem("optics_config");
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig({
          ...DEFAULT_CONFIG,
          ...parsed,
          productsColumns: { ...DEFAULT_CONFIG.productsColumns, ...parsed.productsColumns },
          inventoryColumns: { ...DEFAULT_CONFIG.inventoryColumns, ...parsed.inventoryColumns },
          entriesColumns: { ...DEFAULT_CONFIG.entriesColumns, ...parsed.entriesColumns },
          outputsColumns: { ...DEFAULT_CONFIG.outputsColumns, ...parsed.outputsColumns },
          suppliersColumns: { ...DEFAULT_CONFIG.suppliersColumns, ...parsed.suppliersColumns },
        });
      } catch (error) {
        console.error("Error loading optics config:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (defaultTemplate && !config.defaultLabelTemplateId) {
      setConfig(prev => ({ ...prev, defaultLabelTemplateId: defaultTemplate.id }));
    }
  }, [defaultTemplate]);

  const handleSave = () => {
    try {
      localStorage.setItem("optics_config", JSON.stringify(config));
      toast.success("Configuración guardada correctamente");
    } catch (error) {
      toast.error("Error al guardar la configuración");
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem("optics_config");
    toast.success("Configuración restaurada a valores predeterminados");
  };

  const renderColumnCheckboxes = (
    columns: { key: string; label: string }[],
    configKey: keyof Pick<OpticsConfig, 'productsColumns' | 'inventoryColumns' | 'entriesColumns' | 'outputsColumns' | 'suppliersColumns'>,
    title: string,
    icon: React.ReactNode
  ) => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>
          Selecciona las columnas visibles en la tabla
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {columns.map((column) => (
            <div key={column.key} className="flex items-center space-x-2">
              <Checkbox
                id={`${configKey}-${column.key}`}
                checked={config[configKey][column.key] ?? true}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    [configKey]: {
                      ...config[configKey],
                      [column.key]: checked === true,
                    },
                  })
                }
              />
              <Label
                htmlFor={`${configKey}-${column.key}`}
                className="text-sm font-normal cursor-pointer"
              >
                {column.label}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Configuración de Óptica
          </h1>
          <p className="text-muted-foreground">
            Administra las configuraciones del sistema de óptica
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Alertas</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Productos</span>
          </TabsTrigger>
          <TabsTrigger value="labels" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Etiquetas</span>
          </TabsTrigger>
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Comprobantes</span>
          </TabsTrigger>
          <TabsTrigger value="columns" className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            <span className="hidden sm:inline">Columnas</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
        </TabsList>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Configuración de Alertas de Stock</CardTitle>
              </div>
              <CardDescription>
                Define los umbrales para las alertas de inventario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="lowStockPercentage">
                    Porcentaje de Stock Bajo
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="lowStockPercentage"
                      type="number"
                      min={1}
                      max={100}
                      value={config.lowStockPercentage}
                      onChange={(e) =>
                        setConfig({ ...config, lowStockPercentage: parseInt(e.target.value) || 0 })
                      }
                      className="w-24"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Se alertará cuando el stock actual sea menor o igual al {config.lowStockPercentage}% del stock mínimo configurado
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="slowMovingDays">
                    Días sin Movimiento
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="slowMovingDays"
                      type="number"
                      min={1}
                      max={365}
                      value={config.slowMovingDays}
                      onChange={(e) =>
                        setConfig({ ...config, slowMovingDays: parseInt(e.target.value) || 30 })
                      }
                      className="w-24"
                    />
                    <span className="text-muted-foreground">días</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Productos sin movimiento por más de {config.slowMovingDays} días se marcarán como "Lento Movimiento"
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Vista previa de alertas
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="destructive">Crítico: Sin Stock</Badge>
                  <Badge className="bg-warning text-warning-foreground">Advertencia: Stock Bajo ≤ {config.lowStockPercentage}%</Badge>
                  <Badge variant="secondary">Info: Sin movimiento ≥ {config.slowMovingDays} días</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab - Code Configuration */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <CardTitle>Codificación de Productos</CardTitle>
              </div>
              <CardDescription>
                Configura el formato de los códigos automáticos para nuevos productos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-3">
                  <Label htmlFor="productCodePrefix">
                    Prefijo del Código
                  </Label>
                  <Input
                    id="productCodePrefix"
                    value={config.productCodePrefix}
                    onChange={(e) =>
                      setConfig({ ...config, productCodePrefix: e.target.value.toUpperCase() })
                    }
                    placeholder="OP"
                    maxLength={10}
                    className="font-mono"
                  />
                  <p className="text-sm text-muted-foreground">
                    Letras que preceden al número correlativo (ej: OP, OPT, LENT)
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="productCodePadding">
                    Cantidad de Dígitos
                  </Label>
                  <Input
                    id="productCodePadding"
                    type="number"
                    min={1}
                    max={10}
                    value={config.productCodePadding}
                    onChange={(e) =>
                      setConfig({ ...config, productCodePadding: Math.min(10, Math.max(1, parseInt(e.target.value) || 6)) })
                    }
                    className="w-24"
                  />
                  <p className="text-sm text-muted-foreground">
                    Cantidad de ceros para el correlativo (ej: 6 → 000001)
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="productCodeStartFrom">
                    Iniciar Desde
                  </Label>
                  <Input
                    id="productCodeStartFrom"
                    type="number"
                    min={0}
                    value={config.productCodeStartFrom}
                    onChange={(e) =>
                      setConfig({ ...config, productCodeStartFrom: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">
                    Número desde el cual empezar a contar (0 = desde 1)
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Vista previa del código
                </h4>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="font-mono text-lg px-4 py-2">
                    {config.productCodePrefix}{(config.productCodeStartFrom + 1).toString().padStart(config.productCodePadding, "0")}
                  </Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="outline" className="font-mono text-lg px-4 py-2">
                    {config.productCodePrefix}{(config.productCodeStartFrom + 2).toString().padStart(config.productCodePadding, "0")}
                  </Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="outline" className="font-mono text-lg px-4 py-2">
                    {config.productCodePrefix}{(config.productCodeStartFrom + 3).toString().padStart(config.productCodePadding, "0")}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle>Opciones Generales de Productos</CardTitle>
              </div>
              <CardDescription>
                Configuraciones adicionales para la gestión de productos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoGenerateProductCode"
                    checked={config.autoGenerateProductCode}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, autoGenerateProductCode: checked === true })
                    }
                  />
                  <Label htmlFor="autoGenerateProductCode" className="cursor-pointer">
                    Generar código de producto automáticamente
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  Si está activado, el sistema generará códigos únicos para nuevos productos
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="defaultProductType">
                  Tipo de Producto Predeterminado
                </Label>
                <Select
                  value={config.defaultProductType || "__none__"}
                  onValueChange={(value) =>
                    setConfig({ ...config, defaultProductType: value === "__none__" ? "" : value })
                  }
                >
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Ninguno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Ninguno</SelectItem>
                    {productTypes?.map((type) => (
                      <SelectItem key={type.id} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Tipo que se seleccionará por defecto al crear nuevos productos
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Labels Tab */}
        <TabsContent value="labels" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                <CardTitle>Configuración de Etiquetas</CardTitle>
              </div>
              <CardDescription>
                Configura las opciones de impresión de etiquetas para productos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="defaultLabelTemplate">
                    Plantilla Predeterminada
                  </Label>
                  <Select
                    value={config.defaultLabelTemplateId || ""}
                    onValueChange={(value) =>
                      setConfig({ ...config, defaultLabelTemplateId: value || null })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar plantilla..." />
                    </SelectTrigger>
                    <SelectContent>
                      {labelTemplates?.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} {template.isDefault && "(Actual)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Plantilla que se usará por defecto al imprimir etiquetas
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="defaultLabelPaperSize">
                    Tamaño de Papel
                  </Label>
                  <Select
                    value={config.defaultLabelPaperSize}
                    onValueChange={(value) =>
                      setConfig({ ...config, defaultLabelPaperSize: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAPER_SIZES.map((size) => (
                        <SelectItem key={size.id} value={size.id}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {config.defaultLabelPaperSize === "custom" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Ancho Personalizado (mm)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={200}
                      value={config.labelCustomWidth}
                      onChange={(e) =>
                        setConfig({ ...config, labelCustomWidth: parseInt(e.target.value) || 30 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alto Personalizado (mm)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={200}
                      value={config.labelCustomHeight}
                      onChange={(e) =>
                        setConfig({ ...config, labelCustomHeight: parseInt(e.target.value) || 20 })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Información de impresión
                </h4>
                <p className="text-sm text-muted-foreground">
                  Las etiquetas están optimizadas para impresoras térmicas como HL3200. 
                  El tamaño recomendado es 30x20mm para etiquetas de productos estándar.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipts Tab */}
        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <CardTitle>Configuración de Comprobantes</CardTitle>
              </div>
              <CardDescription>
                Configura el formato y opciones de impresión de comprobantes de salida
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="receiptPaperWidth">
                    Ancho de Papel
                  </Label>
                  <Select
                    value={config.receiptPaperWidth}
                    onValueChange={(value) =>
                      setConfig({ ...config, receiptPaperWidth: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECEIPT_PAPER_SIZES.map((size) => (
                        <SelectItem key={size.id} value={size.id}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="receiptCopies">
                    Número de Copias
                  </Label>
                  <Input
                    id="receiptCopies"
                    type="number"
                    min={1}
                    max={5}
                    value={config.receiptCopies}
                    onChange={(e) =>
                      setConfig({ ...config, receiptCopies: parseInt(e.target.value) || 1 })
                    }
                    className="w-24"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showReceiptLogo"
                    checked={config.showReceiptLogo}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, showReceiptLogo: checked === true })
                    }
                  />
                  <Label htmlFor="showReceiptLogo" className="cursor-pointer">
                    Mostrar logo en comprobantes
                  </Label>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="receiptFooterText">
                  Texto de Pie de Comprobante
                </Label>
                <Input
                  id="receiptFooterText"
                  value={config.receiptFooterText}
                  onChange={(e) =>
                    setConfig({ ...config, receiptFooterText: e.target.value })
                  }
                  placeholder="Gracias por su preferencia"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Columns Tab */}
        <TabsContent value="columns" className="space-y-4">
          {renderColumnCheckboxes(
            PRODUCTS_COLUMNS,
            "productsColumns",
            "Columnas de Catálogo de Productos",
            <Package className="h-5 w-5 text-primary" />
          )}
          {renderColumnCheckboxes(
            INVENTORY_COLUMNS,
            "inventoryColumns",
            "Columnas de Historial de Inventario",
            <BarChart3 className="h-5 w-5 text-primary" />
          )}
          {renderColumnCheckboxes(
            ENTRIES_COLUMNS,
            "entriesColumns",
            "Columnas de Entradas",
            <Package className="h-5 w-5 text-primary" />
          )}
          {renderColumnCheckboxes(
            OUTPUTS_COLUMNS,
            "outputsColumns",
            "Columnas de Salidas",
            <Package className="h-5 w-5 text-destructive" />
          )}
          {renderColumnCheckboxes(
            SUPPLIERS_COLUMNS,
            "suppliersColumns",
            "Columnas de Proveedores",
            <Truck className="h-5 w-5 text-primary" />
          )}
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Configuración de Reportes</CardTitle>
              </div>
              <CardDescription>
                Opciones para la generación de reportes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="defaultReportType">
                    Tipo de Reporte Predeterminado
                  </Label>
                  <Select
                    value={config.defaultReportType}
                    onValueChange={(value) =>
                      setConfig({ ...config, defaultReportType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="catalog">Catálogo</SelectItem>
                      <SelectItem value="inventory">Inventario</SelectItem>
                      <SelectItem value="entries">Entradas</SelectItem>
                      <SelectItem value="outputs">Salidas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 flex items-end">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeLogoInReports"
                      checked={config.includeLogoInReports}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, includeLogoInReports: checked === true })
                      }
                    />
                    <Label htmlFor="includeLogoInReports" className="cursor-pointer">
                      Incluir logo corporativo en reportes PDF
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
