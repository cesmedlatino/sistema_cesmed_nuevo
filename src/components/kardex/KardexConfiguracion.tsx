import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Bell, 
  Palette, 
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function KardexConfiguracion() {
  const { toast } = useToast();
  const [alertConfig, setAlertConfig] = useState({
    lowStockThreshold: 10,
    enableEmailAlerts: false,
    enableDailyReport: true,
    includeValueReport: true,
  });

  const handleSaveConfig = () => {
    localStorage.setItem('kardex-config', JSON.stringify(alertConfig));
    toast({
      title: "Configuración guardada",
      description: "Los cambios se han guardado correctamente.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-amber-700">
          Configuración de Kardex
        </h2>
        <p className="text-muted-foreground">
          Personaliza el comportamiento del sistema de Kardex
        </p>
      </div>

      <Tabs defaultValue="alertas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alertas" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="reportes" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Reportes
          </TabsTrigger>
          <TabsTrigger value="visualizacion" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Visualización
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alertas">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Alertas</CardTitle>
              <CardDescription>
                Define los umbrales y notificaciones del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lowStock">Umbral de Stock Bajo</Label>
                  <Input
                    id="lowStock"
                    type="number"
                    value={alertConfig.lowStockThreshold}
                    onChange={(e) => setAlertConfig({
                      ...alertConfig,
                      lowStockThreshold: parseInt(e.target.value) || 0
                    })}
                    placeholder="10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Productos con stock menor o igual serán marcados como bajo stock
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Alertas por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Recibir notificaciones de stock bajo por correo
                    </p>
                  </div>
                  <Switch
                    checked={alertConfig.enableEmailAlerts}
                    onCheckedChange={(checked) => setAlertConfig({
                      ...alertConfig,
                      enableEmailAlerts: checked
                    })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Reporte Diario Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Generar un resumen diario de movimientos
                    </p>
                  </div>
                  <Switch
                    checked={alertConfig.enableDailyReport}
                    onCheckedChange={(checked) => setAlertConfig({
                      ...alertConfig,
                      enableDailyReport: checked
                    })}
                  />
                </div>
              </div>

              <Button onClick={handleSaveConfig} className="bg-amber-600 hover:bg-amber-700">
                <Save className="h-4 w-4 mr-2" />
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reportes">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Reportes</CardTitle>
              <CardDescription>
                Personaliza el contenido de los reportes generados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Incluir Valoración de Inventario</Label>
                    <p className="text-sm text-muted-foreground">
                      Mostrar valores monetarios en los reportes
                    </p>
                  </div>
                  <Switch
                    checked={alertConfig.includeValueReport}
                    onCheckedChange={(checked) => setAlertConfig({
                      ...alertConfig,
                      includeValueReport: checked
                    })}
                  />
                </div>
              </div>

              <Button onClick={handleSaveConfig} className="bg-amber-600 hover:bg-amber-700">
                <Save className="h-4 w-4 mr-2" />
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visualizacion">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de Visualización</CardTitle>
              <CardDescription>
                Ajusta la apariencia del sistema de Kardex
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-2 border-amber-200 bg-amber-50">
                    <CardContent className="pt-4 text-center">
                      <div className="h-4 w-full bg-amber-500 rounded mb-2" />
                      <p className="text-sm font-medium">Tema Ámbar (Actual)</p>
                    </CardContent>
                  </Card>
                  <Card className="border cursor-pointer hover:border-gray-400">
                    <CardContent className="pt-4 text-center">
                      <div className="h-4 w-full bg-blue-500 rounded mb-2" />
                      <p className="text-sm font-medium">Tema Azul</p>
                    </CardContent>
                  </Card>
                  <Card className="border cursor-pointer hover:border-gray-400">
                    <CardContent className="pt-4 text-center">
                      <div className="h-4 w-full bg-slate-700 rounded mb-2" />
                      <p className="text-sm font-medium">Tema Oscuro</p>
                    </CardContent>
                  </Card>
                </div>
                <p className="text-xs text-muted-foreground">
                  Los temas adicionales estarán disponibles próximamente
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
