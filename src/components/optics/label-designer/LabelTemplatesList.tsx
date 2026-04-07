import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Star, StarOff, Trash2, QrCode, Calendar, Globe, Lock
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { LabelTemplate, CatalogTarget } from "@/hooks/useOpticsLabelTemplates";
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

interface Props {
  templates: LabelTemplate[];
  onLoad: (template: LabelTemplate) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePublic: (id: string, isPublic: boolean) => void;
  onSetCatalogTarget: (id: string, target: CatalogTarget) => void;
}

export function LabelTemplatesList({ templates, onLoad, onSetDefault, onDelete, onTogglePublic, onSetCatalogTarget }: Props) {
  const getSizeCategory = (width: number, height: number) => {
    const area = width * height;
    if (area < 2000) return { label: "Pequeña", color: "bg-blue-100 text-blue-800" };
    if (area < 5000) return { label: "Mediana", color: "bg-green-100 text-green-800" };
    return { label: "Grande", color: "bg-orange-100 text-orange-800" };
  };

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No hay plantillas guardadas</h3>
          <p className="text-muted-foreground text-center max-w-md mt-2">
            Crea tu primera plantilla en la pestaña "Diseñador" para comenzar a 
            imprimir etiquetas personalizadas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Plantillas Guardadas</h3>
          <p className="text-sm text-muted-foreground">
            {templates.length} plantilla{templates.length !== 1 ? "s" : ""} • 
            La plantilla predeterminada se usará para imprimir desde el catálogo
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => {
          const category = getSizeCategory(template.paperSize.width, template.paperSize.height);
          
          return (
            <Card 
              key={template.id} 
              className={`relative ${template.isDefault ? "ring-2 ring-primary" : ""}`}
            >
              {template.isDefault && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-primary">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Predeterminada
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {template.name}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">
                    {template.paperSize.width} × {template.paperSize.height} mm
                  </Badge>
                  <Badge className={category.color}>
                    {category.label}
                  </Badge>
                  <Badge variant={template.catalogTarget === "general" ? "default" : "secondary"}>
                    {template.catalogTarget === "general" ? "Catálogo General" : "Catálogo Óptica"}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(template.createdAt), "dd MMM yyyy", { locale: es })}
                  </div>
                  <div className="flex items-center gap-1">
                    {template.elements.length} elementos
                  </div>
                </div>

                {/* Preview mini */}
                <div 
                  className="border rounded bg-white aspect-video flex items-center justify-center cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => onLoad(template)}
                >
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Click para cargar
                  </div>
                </div>

                {/* Catalog target selector */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <Label className="text-xs">Catálogo destino</Label>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={template.catalogTarget === "optica" ? "default" : "outline"}
                      className="h-7 text-xs px-2"
                      onClick={() => onSetCatalogTarget(template.id, "optica")}
                    >
                      Óptica
                    </Button>
                    <Button
                      size="sm"
                      variant={template.catalogTarget === "general" ? "default" : "outline"}
                      className="h-7 text-xs px-2"
                      onClick={() => onSetCatalogTarget(template.id, "general")}
                    >
                      General
                    </Button>
                  </div>
                </div>

                {/* Toggle para habilitar para todos los usuarios */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    {template.isPublic ? (
                      <Globe className="h-4 w-4 text-green-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Label htmlFor={`public-${template.id}`} className="text-xs cursor-pointer">
                      {template.isPublic ? "Pública" : "Solo yo"}
                    </Label>
                  </div>
                  <Switch
                    id={`public-${template.id}`}
                    checked={template.isPublic}
                    onCheckedChange={(checked) => onTogglePublic(template.id, checked)}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => onLoad(template)}
                  >
                    Cargar
                  </Button>
                  
                  {!template.isDefault && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => onSetDefault(template.id)}
                      title="Establecer como predeterminada"
                    >
                      <StarOff className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. La plantilla "{template.name}" 
                          será eliminada permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(template.id)}>
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
