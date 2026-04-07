import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, PencilBrush, Circle, Rect, Line, FabricImage } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Pencil, 
  Square, 
  Circle as CircleIcon, 
  Minus, 
  MousePointer, 
  Eraser,
  Undo2,
  Save,
  X,
  Palette,
  RotateCcw,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageEditorProps {
  baseImageUrl: string;
  initialAnnotations?: string;
  onSave: (annotatedImageData: string) => void;
  onCancel: () => void;
}

type Tool = 'select' | 'pencil' | 'rectangle' | 'circle' | 'line' | 'eraser';

const colors = [
  { color: '#FF0000', name: 'Rojo' },
  { color: '#00FF00', name: 'Verde' },
  { color: '#0000FF', name: 'Azul' },
  { color: '#FFFF00', name: 'Amarillo' },
  { color: '#FF00FF', name: 'Magenta' },
  { color: '#00FFFF', name: 'Cian' },
  { color: '#FFA500', name: 'Naranja' },
  { color: '#800080', name: 'Morado' },
  { color: '#000000', name: 'Negro' },
  { color: '#FFFFFF', name: 'Blanco' }
];

export function ImageEditor({ baseImageUrl, initialAnnotations, onSave, onCancel }: ImageEditorProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [activeColor, setActiveColor] = useState('#FF0000');
  const [brushWidth, setBrushWidth] = useState([3]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    console.log('ImageEditor: Inicializando canvas');
    
    try {
      const canvas = new FabricCanvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
      });

      // Configurar el pincel
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = brushWidth[0];

      setFabricCanvas(canvas);

      // Cargar imagen base
      if (baseImageUrl && baseImageUrl.trim() !== '') {
        loadBaseImage(canvas, baseImageUrl);
      } else {
        setIsLoading(false);
        toast({
          title: "Información",
          description: "No se encontró imagen base. Puede dibujar en lienzo en blanco.",
        });
      }

      return () => {
        console.log('ImageEditor: Limpiando canvas');
        canvas.dispose();
      };
    } catch (error) {
      console.error('ImageEditor: Error inicializando canvas:', error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "No se pudo inicializar el editor de imágenes",
        variant: "destructive",
      });
    }
  }, []);

  const loadBaseImage = async (canvas: FabricCanvas, imageUrl: string) => {
    try {
      console.log('ImageEditor: Cargando imagen base:', imageUrl);
      
      const img = await FabricImage.fromURL(imageUrl, {
        crossOrigin: 'anonymous'
      });
      
      console.log('ImageEditor: Imagen cargada exitosamente');
      
      // Calcular escala para ajustar al canvas
      const maxWidth = 800;
      const maxHeight = 600;
      const scale = Math.min(maxWidth / (img.width || 1), maxHeight / (img.height || 1));
      
      // Ajustar tamaño del canvas
      const newWidth = (img.width || 800) * scale;
      const newHeight = (img.height || 600) * scale;
      
      canvas.setWidth(newWidth);
      canvas.setHeight(newHeight);
      
      // Configurar imagen como fondo
      img.set({
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
      });
      
      canvas.backgroundImage = img;
      canvas.renderAll();
      
      // Cargar anotaciones iniciales si existen
      if (initialAnnotations) {
        try {
          await canvas.loadFromJSON(initialAnnotations);
          canvas.renderAll();
        } catch (error) {
          console.error('Error cargando anotaciones:', error);
        }
      }
      
      setIsLoading(false);
      toast({
        title: "Imagen cargada",
        description: "La imagen se ha cargado correctamente en el editor.",
      });
    } catch (error) {
      console.error('ImageEditor: Error cargando imagen:', error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "No se pudo cargar la imagen. Puede continuar con un lienzo en blanco.",
        variant: "destructive",
      });
    }
  };

  // Configurar herramientas
  useEffect(() => {
    if (!fabricCanvas) return;

    // Configurar modo de dibujo
    fabricCanvas.isDrawingMode = activeTool === 'pencil' || activeTool === 'eraser';
    
    if (fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = activeTool === 'eraser' ? '#ffffff' : activeColor;
      fabricCanvas.freeDrawingBrush.width = brushWidth[0];
    }

    // Configurar selección
    fabricCanvas.selection = activeTool === 'select';
    
    // Limpiar eventos previos
    fabricCanvas.off('mouse:down');
    fabricCanvas.off('mouse:move');
    fabricCanvas.off('mouse:up');

    // Configurar eventos para formas
    if (activeTool === 'rectangle' || activeTool === 'circle' || activeTool === 'line') {
      setupShapeDrawing();
    }
  }, [activeTool, activeColor, brushWidth, fabricCanvas]);

  const setupShapeDrawing = () => {
    if (!fabricCanvas) return;

    let currentShape: any = null;

    const handleMouseDown = (e: any) => {
      if (activeTool === 'select' || activeTool === 'pencil' || activeTool === 'eraser') return;
      
      setIsDrawing(true);
      const pointer = fabricCanvas.getPointer(e.e);
      setStartPoint({ x: pointer.x, y: pointer.y });

      if (activeTool === 'rectangle') {
        currentShape = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: activeColor,
          strokeWidth: brushWidth[0],
        });
      } else if (activeTool === 'circle') {
        currentShape = new Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 0,
          fill: 'transparent',
          stroke: activeColor,
          strokeWidth: brushWidth[0],
        });
      } else if (activeTool === 'line') {
        currentShape = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: activeColor,
          strokeWidth: brushWidth[0],
        });
      }

      if (currentShape) {
        fabricCanvas.add(currentShape);
      }
    };

    const handleMouseMove = (e: any) => {
      if (!isDrawing || !startPoint || !currentShape) return;

      const pointer = fabricCanvas.getPointer(e.e);

      if (activeTool === 'rectangle') {
        const width = pointer.x - startPoint.x;
        const height = pointer.y - startPoint.y;
        currentShape.set({
          width: Math.abs(width),
          height: Math.abs(height),
          left: width < 0 ? pointer.x : startPoint.x,
          top: height < 0 ? pointer.y : startPoint.y,
        });
      } else if (activeTool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(pointer.x - startPoint.x, 2) + Math.pow(pointer.y - startPoint.y, 2)
        ) / 2;
        currentShape.set({ radius });
      } else if (activeTool === 'line') {
        currentShape.set({
          x2: pointer.x,
          y2: pointer.y,
        });
      }

      fabricCanvas.renderAll();
    };

    const handleMouseUp = () => {
      setIsDrawing(false);
      setStartPoint(null);
      currentShape = null;
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:up', handleMouseUp);
  };

  const handleUndo = () => {
    if (!fabricCanvas) return;
    const objects = fabricCanvas.getObjects();
    if (objects.length > 0) {
      const lastObject = objects[objects.length - 1];
      fabricCanvas.remove(lastObject);
      fabricCanvas.renderAll();
    }
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    
    // Limpiar objetos pero mantener imagen de fondo
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => fabricCanvas.remove(obj));
    fabricCanvas.renderAll();
  };

  const handleSave = () => {
    if (!fabricCanvas) return;
    
    console.log('ImageEditor: Guardando imagen anotada');
    
    try {
      const imageDataUrl = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1,
      });

      console.log('ImageEditor: Imagen guardada exitosamente');
      onSave(imageDataUrl);
      
      toast({
        title: "Imagen guardada",
        description: "Las anotaciones se han guardado correctamente.",
      });
    } catch (error) {
      console.error('ImageEditor: Error guardando imagen:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la imagen anotada",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!fabricCanvas) return;
    
    try {
      const dataUrl = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1,
      });
      
      const link = document.createElement('a');
      link.download = `anotacion-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Descarga iniciada",
        description: "La imagen se está descargando.",
      });
    } catch (error) {
      console.error('Error descargando imagen:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar la imagen",
        variant: "destructive",
      });
    }
  };

  const tools = [
    { id: 'select' as Tool, icon: MousePointer, label: 'Seleccionar', description: 'Seleccionar y mover elementos' },
    { id: 'pencil' as Tool, icon: Pencil, label: 'Lápiz', description: 'Dibujo libre' },
    { id: 'rectangle' as Tool, icon: Square, label: 'Rectángulo', description: 'Dibujar rectángulos' },
    { id: 'circle' as Tool, icon: CircleIcon, label: 'Círculo', description: 'Dibujar círculos' },
    { id: 'line' as Tool, icon: Minus, label: 'Línea', description: 'Dibujar líneas rectas' },
    { id: 'eraser' as Tool, icon: Eraser, label: 'Borrador', description: 'Borrar anotaciones' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse mx-auto"></div>
          <div className="text-lg font-medium text-gray-700">Cargando editor de imagen...</div>
          <div className="text-sm text-gray-500">Preparando herramientas de anotación</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Editor de Anotaciones Médicas</h3>
                <p className="text-blue-100 text-sm">Realice anotaciones sobre la imagen médica</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={onCancel} className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Toolbar mejorada */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            {/* Herramientas */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MousePointer className="h-4 w-4" />
                Herramientas
              </h4>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {tools.map((tool) => (
                  <Button
                    key={tool.id}
                    variant={activeTool === tool.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTool(tool.id)}
                    title={tool.description}
                    className={`flex flex-col items-center gap-1 h-auto py-3 ${
                      activeTool === tool.id 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <tool.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{tool.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Paleta de colores */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Colores
              </h4>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {colors.map(({ color, name }) => (
                  <button
                    key={color}
                    className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                      activeColor === color 
                        ? 'border-gray-800 shadow-lg ring-2 ring-blue-400' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setActiveColor(color)}
                    title={name}
                  />
                ))}
              </div>
            </div>

            <Separator />

            {/* Grosor del trazo */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Grosor del trazo</h4>
              <div className="flex items-center gap-4">
                <Slider
                  value={brushWidth}
                  onValueChange={setBrushWidth}
                  max={20}
                  min={1}
                  step={1}
                  className="flex-1"
                />
                <Badge variant="outline" className="min-w-[60px] text-center font-medium">
                  {brushWidth[0]}px
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Acciones */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Acciones</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button variant="outline" size="sm" onClick={handleUndo} className="hover:bg-orange-50 hover:border-orange-300">
                  <Undo2 className="h-4 w-4 mr-2" />
                  Deshacer
                </Button>
                <Button variant="outline" size="sm" onClick={handleClear} className="hover:bg-red-50 hover:border-red-300">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload} className="hover:bg-green-50 hover:border-green-300">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
                <Button onClick={handleSave} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex justify-center">
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-xl bg-white">
              <canvas ref={canvasRef} className="max-w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}