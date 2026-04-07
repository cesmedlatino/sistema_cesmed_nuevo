import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  QrCode, Barcode, Type, Save, Trash2,
  Eye, Star, ZoomIn, ZoomOut, Pencil, X
} from "lucide-react";
import { Canvas as FabricCanvas, Rect, Text, IText, util } from "fabric";
import { toast } from "sonner";
import { LabelTemplatesList } from "./LabelTemplatesList";
import { LabelPreview } from "./LabelPreview";
import {
  useOpticsLabelTemplates,
  useCreateLabelTemplate,
  useUpdateLabelTemplate,
  useSetDefaultTemplate,
  useDeleteLabelTemplate,
  useTogglePublicTemplate,
  useSetCatalogTarget,
  LabelTemplate,
  CatalogTarget,
} from "@/hooks/useOpticsLabelTemplates";

// Paper sizes in mm
const PAPER_SIZES = {
  small: [
    { id: "25x15", name: "25 × 15 mm", width: 25, height: 15, description: "Etiquetas muy pequeñas (precios o referencias)" },
    { id: "30x20", name: "30 × 20 mm", width: 30, height: 20, description: "Tamaño estándar (3×2 cm)" },
    { id: "30x15", name: "30 × 15 mm", width: 30, height: 15, description: "Tamaño compacto para inventario/productos pequeños" },
    { id: "40x20", name: "40 × 20 mm", width: 40, height: 20, description: "Uno de los tamaños pequeños más usados" },
    { id: "40x30", name: "40 × 30 mm", width: 40, height: 30, description: "Útil para códigos de barras simples" },
    { id: "50x30", name: "50 × 30 mm", width: 50, height: 30, description: "Muy común para etiquetas de precio o producto" },
    { id: "58x43", name: "58 × 43 mm", width: 58, height: 43, description: "Estándar en retail y logística ligera" },
    { id: "60x39", name: "60 × 39 mm", width: 60, height: 39, description: "Alternativa estándar retail" },
  ],
  medium: [
    { id: "50x40", name: "50 × 40 mm", width: 50, height: 40, description: "Equilibrio entre información y tamaño" },
    { id: "70x50", name: "70 × 50 mm", width: 70, height: 50, description: "Etiquetas medianas para producto o almacenamiento" },
    { id: "60x80", name: "60 × 80 mm", width: 60, height: 80, description: "Para códigos de barras largos o texto adicional" },
    { id: "80x80", name: "80 × 80 mm", width: 80, height: 80, description: "Formato cuadrado de uso general" },
  ],
  large: [
    { id: "100x100", name: "100 × 100 mm", width: 100, height: 100, description: "Etiquetas cuadradas grandes" },
    { id: "100x150", name: "100 × 150 mm (4×6\")", width: 100, height: 150, description: "El más usado para envío y logística" },
  ],
};

const ALL_SIZES = [...PAPER_SIZES.small, ...PAPER_SIZES.medium, ...PAPER_SIZES.large];

// Convert mm to pixels (96 DPI standard)
const mmToPixels = (mm: number) => Math.round(mm * 3.7795275591);

// Re-export for compatibility
export type { LabelTemplate };

export function LabelDesigner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  
  const [selectedSize, setSelectedSize] = useState(ALL_SIZES[1]); // 30x20 default (3×2 cm)
  const [customWidth, setCustomWidth] = useState(30);
  const [customHeight, setCustomHeight] = useState(20);
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [activeTab, setActiveTab] = useState("design");
  const [zoom, setZoom] = useState(3);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  
  // Loaded template state
  const [loadedTemplate, setLoadedTemplate] = useState<LabelTemplate | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Supabase hooks
  const { data: templates = [] } = useOpticsLabelTemplates();
  const createTemplate = useCreateLabelTemplate();
  const updateTemplate = useUpdateLabelTemplate();
  const setDefaultTemplate = useSetDefaultTemplate();
  const deleteTemplate = useDeleteLabelTemplate();
  const togglePublicTemplate = useTogglePublicTemplate();
  const setCatalogTarget = useSetCatalogTarget();

  const currentWidth = useCustomSize ? customWidth : selectedSize.width;
  const currentHeight = useCustomSize ? customHeight : selectedSize.height;

  // Initialize/resize canvas - only runs when dimensions change
  const initCanvas = useCallback(() => {
    if (!canvasRef.current) return null;

    // Dispose existing canvas
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose();
      fabricCanvasRef.current = null;
    }

    const canvasWidth = mmToPixels(currentWidth) * zoom;
    const canvasHeight = mmToPixels(currentHeight) * zoom;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: "#ffffff",
      selection: true,
    });

    canvas.on('selection:created', (e) => setSelectedElement(e.selected?.[0]));
    canvas.on('selection:updated', (e) => setSelectedElement(e.selected?.[0]));
    canvas.on('selection:cleared', () => setSelectedElement(null));

    fabricCanvasRef.current = canvas;
    setCanvasReady(true);
    return canvas;
  }, [currentWidth, currentHeight, zoom]);

  // Initialize canvas on mount and when dimensions change
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initCanvas();
    }, 50);

    return () => {
      clearTimeout(timer);
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [currentWidth, currentHeight, zoom]);

  // Load template elements into canvas
  const loadTemplateElements = useCallback(async (elements: any[]) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      console.error("Canvas not ready for loading elements");
      return false;
    }

    try {
      canvas.clear();
      canvas.backgroundColor = "#ffffff";

      if (!elements || elements.length === 0) {
        canvas.renderAll();
        return true;
      }

      const objects = await util.enlivenObjects(elements);
      objects.forEach((obj: any) => {
        if (obj && typeof obj.set === "function") {
          canvas.add(obj);
        }
      });
      canvas.renderAll();
      return true;
    } catch (error) {
      console.error("Error loading template elements:", error);
      return false;
    }
  }, []);

  // Handle loading a template
  const loadTemplate = useCallback(async (template: LabelTemplate) => {
    // First, update dimensions to match template
    const presetSize = ALL_SIZES.find(s => s.id === template.paperSize.id);
    
    if (presetSize) {
      setUseCustomSize(false);
      setSelectedSize(presetSize);
    } else {
      setUseCustomSize(true);
      setCustomWidth(template.paperSize.width);
      setCustomHeight(template.paperSize.height);
    }

    if (typeof template.zoomUsed === "number") {
      setZoom(template.zoomUsed);
    }

    // Switch to design tab
    setActiveTab("design");
    
    // Store the template to load after canvas reinitializes
    setLoadedTemplate(template);
    setIsEditMode(false);
    setTemplateName(template.name);
  }, []);

  // Effect to load elements once canvas is ready after template selection
  useEffect(() => {
    if (!loadedTemplate || !canvasReady) return;

    // Wait a bit for canvas to be fully ready after dimension changes
    const timer = setTimeout(async () => {
      const success = await loadTemplateElements(loadedTemplate.elements);
      if (success) {
        toast.success(`Plantilla "${loadedTemplate.name}" cargada`);
      } else {
        toast.error("Error al cargar los elementos de la plantilla");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [loadedTemplate, canvasReady, loadTemplateElements]);

  const addQRCode = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const canvasWidth = mmToPixels(currentWidth) * zoom;
    const canvasHeight = mmToPixels(currentHeight) * zoom;
    const size = Math.min(canvasWidth, canvasHeight) * 0.6;
    
    // Position inside the paper area
    const left = Math.min(10 * zoom, canvasWidth - size - 5);
    const top = Math.min(10 * zoom, canvasHeight - size - 5);
    
    const rect = new Rect({
      left: left,
      top: top,
      width: size,
      height: size,
      fill: "transparent",
      stroke: "#000000",
      strokeWidth: 2,
      strokeDashArray: [5, 5],
    });
    
    const text = new Text("QR", {
      left: left + size / 2,
      top: top + size / 2,
      fontSize: 14 * zoom,
      fill: "#666666",
      originX: "center",
      originY: "center",
    });

    canvas.add(rect);
    canvas.add(text);
    canvas.renderAll();
    toast.success("Código QR agregado");
  };

  const addBarcode = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const canvasWidth = mmToPixels(currentWidth) * zoom;
    const canvasHeight = mmToPixels(currentHeight) * zoom;
    const width = Math.min(canvasWidth * 0.8, canvasWidth - 20);
    const height = canvasHeight * 0.3;
    
    const left = 10 * zoom;
    const top = Math.min(canvasHeight * 0.5, canvasHeight - height - 5);
    
    const rect = new Rect({
      left: left,
      top: top,
      width: width,
      height: height,
      fill: "transparent",
      stroke: "#000000",
      strokeWidth: 2,
      strokeDashArray: [5, 5],
    });
    
    const text = new Text("CÓDIGO DE BARRAS", {
      left: left + width / 2,
      top: top + height / 2,
      fontSize: 10 * zoom,
      fill: "#666666",
      originX: "center",
      originY: "center",
    });

    canvas.add(rect);
    canvas.add(text);
    canvas.renderAll();
    toast.success("Código de barras agregado");
  };

  // Available product fields for the label
  const PRODUCT_FIELDS = [
    { id: "codigo", label: "Código", placeholder: "{CODIGO}" },
    { id: "nombre", label: "Nombre", placeholder: "{NOMBRE}" },
    { id: "precio", label: "Precio", placeholder: "{PRECIO}" },
    { id: "marca", label: "Marca", placeholder: "{MARCA}" },
    { id: "modelo", label: "Modelo", placeholder: "{MODELO}" },
    { id: "custom", label: "Texto Personalizado", placeholder: "Texto personalizado" },
  ];

  const addText = (type: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const field = PRODUCT_FIELDS.find(f => f.id === type);
    if (!field) return;

    const baseFontSize = type === "precio" ? 16 : 12;
    const objectCount = canvas.getObjects().length;
    
    const canvasHeight = mmToPixels(currentHeight) * zoom;
    const topPosition = Math.min((10 + objectCount * 20) * zoom, canvasHeight - 20);

    const itext = new IText(field.placeholder, {
      left: 10 * zoom,
      top: topPosition,
      fontSize: baseFontSize * zoom,
      fontWeight: type === "precio" ? "bold" : "normal",
      fill: "#000000",
      fontFamily: "Arial",
    });

    canvas.add(itext);
    canvas.setActiveObject(itext);
    canvas.renderAll();
    toast.success(`Campo "${field.label}" agregado`);
  };

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) {
      canvas.remove(active);
      canvas.renderAll();
      toast.success("Elemento eliminado");
    }
  };

  const clearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.renderAll();
    setLoadedTemplate(null);
    setIsEditMode(false);
    toast.success("Diseño limpiado");
  };

  const saveTemplate = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !templateName.trim()) {
      toast.error("Ingresa un nombre para la plantilla");
      return;
    }

    const paperSize = { 
      width: currentWidth, 
      height: currentHeight, 
      id: useCustomSize ? "custom" : selectedSize.id 
    };
    const elements = canvas.toJSON().objects;

    // If editing an existing template, update it
    if (loadedTemplate && isEditMode) {
      updateTemplate.mutate({
        id: loadedTemplate.id,
        name: templateName,
        paperSize,
        elements,
        zoomUsed: zoom,
        isDefault: loadedTemplate.isDefault,
        isPublic: loadedTemplate.isPublic,
        catalogTarget: loadedTemplate.catalogTarget,
        createdAt: loadedTemplate.createdAt,
        updatedAt: loadedTemplate.updatedAt,
      });
      setLoadedTemplate(null);
      setIsEditMode(false);
    } else {
      createTemplate.mutate({
        name: templateName,
        paperSize,
        elements,
        zoomUsed: zoom,
        isDefault: templates.length === 0,
        isPublic: false,
        catalogTarget: "optica",
      });
    }
    setTemplateName("");
  };

  const enableEditMode = () => {
    setIsEditMode(true);
    toast.info("Modo edición activado - Puedes modificar y guardar los cambios");
  };

  const cancelLoadedTemplate = () => {
    clearCanvas();
    setTemplateName("");
  };

  const handleSetAsDefault = (templateId: string) => {
    setDefaultTemplate.mutate(templateId);
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplate.mutate(templateId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Diseñador de Etiquetas</h1>
          <p className="text-muted-foreground">
            Crea plantillas personalizadas para imprimir etiquetas con códigos QR o de barras
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Vista Previa
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="design">Diseñador</TabsTrigger>
          <TabsTrigger value="templates">Plantillas Guardadas</TabsTrigger>
        </TabsList>

        <TabsContent value="design" className="space-y-4">
          {/* Loaded Template Banner */}
          {loadedTemplate && (
            <div className="flex items-center justify-between p-3 bg-accent border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="gap-1">
                  {loadedTemplate.isDefault && <Star className="h-3 w-3 fill-chart-4 text-chart-4" />}
                  {loadedTemplate.name}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {loadedTemplate.paperSize.width}×{loadedTemplate.paperSize.height}mm
                </span>
                {isEditMode && (
                  <Badge variant="outline" className="bg-accent text-accent-foreground border-border">
                    Editando
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                {!isEditMode && (
                  <Button size="sm" variant="outline" onClick={enableEditMode}>
                    <Pencil className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={cancelLoadedTemplate}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Panel - Tools */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Herramientas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Paper Size Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Tamaño de Papel</Label>
                  <div className="flex items-center gap-2 mb-2">
                    <Switch 
                      checked={useCustomSize} 
                      onCheckedChange={setUseCustomSize}
                      id="custom-size"
                      disabled={!!loadedTemplate && !isEditMode}
                    />
                    <Label htmlFor="custom-size" className="text-xs">Personalizado</Label>
                  </div>
                  
                  {useCustomSize ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Ancho (mm)</Label>
                        <Input 
                          type="number" 
                          value={customWidth}
                          onChange={(e) => setCustomWidth(Number(e.target.value))}
                          min={10}
                          max={200}
                          disabled={!!loadedTemplate && !isEditMode}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Alto (mm)</Label>
                        <Input 
                          type="number" 
                          value={customHeight}
                          onChange={(e) => setCustomHeight(Number(e.target.value))}
                          min={10}
                          max={200}
                          disabled={!!loadedTemplate && !isEditMode}
                        />
                      </div>
                    </div>
                  ) : (
                    <Select 
                      value={selectedSize.id} 
                      onValueChange={(v) => setSelectedSize(ALL_SIZES.find(s => s.id === v)!)}
                      disabled={!!loadedTemplate && !isEditMode}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                          Pequeñas / Productos
                        </div>
                        {PAPER_SIZES.small.map(size => (
                          <SelectItem key={size.id} value={size.id}>
                            <div className="flex flex-col">
                              <span>{size.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">
                          Medianas / Multiuso
                        </div>
                        {PAPER_SIZES.medium.map(size => (
                          <SelectItem key={size.id} value={size.id}>
                            <span>{size.name}</span>
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">
                          Grandes / Envíos
                        </div>
                        {PAPER_SIZES.large.map(size => (
                          <SelectItem key={size.id} value={size.id}>
                            <span>{size.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {!useCustomSize && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedSize.description}
                    </p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <Label className="text-xs font-medium mb-2 block">Agregar Elementos</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={addQRCode}
                      disabled={!!loadedTemplate && !isEditMode}
                    >
                      <QrCode className="mr-1 h-3 w-3" />
                      QR
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={addBarcode}
                      disabled={!!loadedTemplate && !isEditMode}
                    >
                      <Barcode className="mr-1 h-3 w-3" />
                      Barras
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Campos de Producto</Label>
                  <Select
                    onValueChange={(value) => addText(value)}
                    disabled={!!loadedTemplate && !isEditMode}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar campo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_FIELDS.map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          <div className="flex items-center gap-2">
                            <Type className="h-3 w-3 text-muted-foreground" />
                            <span>{field.label}</span>
                            <span className="text-xs text-muted-foreground ml-1">
                              {field.placeholder}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Selecciona un campo para agregarlo a la etiqueta
                  </p>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <Label className="text-xs font-medium">Zoom: {zoom}x</Label>
                  <div className="flex items-center gap-2">
                    <ZoomOut className="h-4 w-4" />
                    <Slider 
                      value={[zoom]} 
                      onValueChange={([v]) => setZoom(v)}
                      min={1}
                      max={5}
                      step={0.5}
                      disabled={!!loadedTemplate && !isEditMode}
                    />
                    <ZoomIn className="h-4 w-4" />
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="w-full"
                    onClick={deleteSelected}
                    disabled={!selectedElement || (!!loadedTemplate && !isEditMode)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Eliminar Selección
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={clearCanvas}
                  >
                    Limpiar Todo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Center - Canvas */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Área de Diseño</span>
                  <Badge variant="outline">
                    {currentWidth} × {currentHeight} mm
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center bg-muted/30 rounded-lg p-8 min-h-[400px]">
                  <div className="border-2 border-dashed border-muted-foreground/30 bg-white shadow-lg">
                    <canvas ref={canvasRef} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Panel - Save */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {loadedTemplate && isEditMode ? "Actualizar Plantilla" : "Guardar Plantilla"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre de la Plantilla</Label>
                  <Input 
                    placeholder="Ej: Etiqueta Producto 50x30"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    disabled={!!loadedTemplate && !isEditMode}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={saveTemplate}
                  disabled={!!loadedTemplate && !isEditMode}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {loadedTemplate && isEditMode ? "Actualizar Plantilla" : "Guardar Plantilla"}
                </Button>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Plantillas Recientes</h4>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {templates.slice(-5).reverse().map(template => (
                        <div 
                          key={template.id}
                          className={`flex items-center justify-between p-2 rounded border hover:bg-muted/50 cursor-pointer ${
                            loadedTemplate?.id === template.id ? "bg-accent border-border" : ""
                          }`}
                          onClick={() => loadTemplate(template)}
                        >
                          <div className="flex items-center gap-2">
                            {template.isDefault && (
                              <Star className="h-3 w-3 text-chart-4 fill-chart-4" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{template.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {template.paperSize.width}×{template.paperSize.height}mm
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {templates.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No hay plantillas guardadas
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <LabelTemplatesList 
            templates={templates}
            onLoad={loadTemplate}
            onSetDefault={handleSetAsDefault}
            onDelete={handleDeleteTemplate}
            onTogglePublic={(id, isPublic) => togglePublicTemplate.mutate({ templateId: id, isPublic })}
            onSetCatalogTarget={(id, target) => setCatalogTarget.mutate({ templateId: id, catalogTarget: target })}
          />
        </TabsContent>
      </Tabs>

      {showPreview && (
        <LabelPreview 
          open={showPreview}
          onOpenChange={setShowPreview}
          canvas={fabricCanvasRef.current}
          width={currentWidth}
          height={currentHeight}
        />
      )}
    </div>
  );
}
