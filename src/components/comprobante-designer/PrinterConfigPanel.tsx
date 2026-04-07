import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComprobanteConfig } from './ComprobanteDesigner';
import { Printer, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PrinterConfigPanelProps {
  config: ComprobanteConfig;
  onChange: (config: ComprobanteConfig) => void;
}

export function PrinterConfigPanel({ config, onChange }: PrinterConfigPanelProps) {
  const { toast } = useToast();
  const [printers, setPrinters] = useState<string[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);

  useEffect(() => {
    loadPrinters();
  }, []);

  const loadPrinters = async () => {
    setLoadingPrinters(true);
    try {
      // Intentar obtener la lista de impresoras usando la API web
      // Nota: Esto requiere que el navegador tenga acceso a la API de impresión
      // @ts-ignore - La API de Print puede no estar disponible en todos los navegadores
      if ('getPrinters' in window) {
        // @ts-ignore
        const printerList = await window.getPrinters();
        setPrinters(printerList.map((p: any) => p.name));
      } else {
        // Lista de impresoras comunes para POS si no se puede obtener del sistema
        setPrinters([
          'POS-D TP300 PRO',
          'Microsoft Print to PDF',
          'Impresora predeterminada del sistema',
        ]);
      }
    } catch (error) {
      console.error('Error al cargar impresoras:', error);
      // Fallback con impresoras comunes
      setPrinters([
        'POS-D TP300 PRO',
        'Microsoft Print to PDF',
        'Impresora predeterminada del sistema',
      ]);
    } finally {
      setLoadingPrinters(false);
    }
  };

  const handleChange = (field: keyof ComprobanteConfig, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const handleNumberChange = (field: keyof ComprobanteConfig, value: string) => {
    const numValue = parseFloat(value) || 0;
    handleChange(field, numValue);
  };

  const paperPresets = [
    { name: 'POS 80mm (Estándar)', width: 80, height: 297 },
    { name: 'POS 58mm', width: 58, height: 297 },
    { name: 'A4 (210mm x 297mm)', width: 210, height: 297 },
    { name: 'Carta (216mm x 279mm)', width: 216, height: 279 },
  ];

  const applyPreset = (preset: typeof paperPresets[0]) => {
    onChange({
      ...config,
      paper_width: preset.width,
      paper_height: preset.height,
    });
    toast({
      title: 'Preset aplicado',
      description: `Papel configurado a ${preset.name}`,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Configuración de Impresora
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default_printer">Impresora por Defecto</Label>
            <Select
              value={config.default_printer}
              onValueChange={(value) => handleChange('default_printer', value)}
            >
              <SelectTrigger id="default_printer">
                <SelectValue placeholder="Seleccionar impresora" />
              </SelectTrigger>
              <SelectContent>
                {loadingPrinters ? (
                  <SelectItem value="__loading__" disabled>Cargando impresoras...</SelectItem>
                ) : (
                  printers.map((printer) => (
                    <SelectItem key={printer} value={printer}>
                      {printer}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Impresora recomendada para POS: POS-D TP300 PRO
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="font_family">Tipo de Fuente</Label>
            <Select
              value={config.font_family}
              onValueChange={(value) => handleChange('font_family', value)}
            >
              <SelectTrigger id="font_family">
                <SelectValue placeholder="Seleccionar fuente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arial Rounded MT Bold, Arial, sans-serif">Arial Rounded MT Bold</SelectItem>
                <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                <SelectItem value="Tahoma, sans-serif">Tahoma</SelectItem>
                <SelectItem value="monospace">Monospace</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Configuración de Papel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Presets de Papel</Label>
            <div className="grid grid-cols-2 gap-2">
              {paperPresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-2 text-xs border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                >
                  {preset.name}
                  <div className="text-muted-foreground mt-1">
                    {preset.width}mm × {preset.height}mm
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paper_width">Ancho (mm)</Label>
              <Input
                id="paper_width"
                type="number"
                value={config.paper_width}
                onChange={(e) => handleNumberChange('paper_width', e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paper_height">Alto (mm)</Label>
              <Input
                id="paper_height"
                type="number"
                value={config.paper_height}
                onChange={(e) => handleNumberChange('paper_height', e.target.value)}
                min="1"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-semibold">Márgenes (mm)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="margin_top">Superior</Label>
                <Input
                  id="margin_top"
                  type="number"
                  value={config.margin_top}
                  onChange={(e) => handleNumberChange('margin_top', e.target.value)}
                  min="0"
                  step="0.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margin_bottom">Inferior</Label>
                <Input
                  id="margin_bottom"
                  type="number"
                  value={config.margin_bottom}
                  onChange={(e) => handleNumberChange('margin_bottom', e.target.value)}
                  min="0"
                  step="0.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margin_left">Izquierdo</Label>
                <Input
                  id="margin_left"
                  type="number"
                  value={config.margin_left}
                  onChange={(e) => handleNumberChange('margin_left', e.target.value)}
                  min="0"
                  step="0.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="margin_right">Derecho</Label>
                <Input
                  id="margin_right"
                  type="number"
                  value={config.margin_right}
                  onChange={(e) => handleNumberChange('margin_right', e.target.value)}
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg text-xs space-y-1">
            <p className="font-semibold">Configuración actual:</p>
            <p>Papel: {config.paper_width}mm × {config.paper_height}mm</p>
            <p>Márgenes: Superior {config.margin_top}mm, Inferior {config.margin_bottom}mm, Izq. {config.margin_left}mm, Der. {config.margin_right}mm</p>
            <p className="text-muted-foreground mt-2">
              Para impresora POS-D TP300 PRO, se recomienda papel 80mm con márgenes de 2mm.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
