import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, GripVertical, Upload, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TemplateSection, TemplateField } from './MedicalRecordTemplateDesigner';

interface BodyEditorProps {
  bodyConfig: TemplateSection[];
  onChange: (config: TemplateSection[]) => void;
}

const fieldTypes = [
  { value: 'text_short', label: 'Texto Corto' },
  { value: 'text_medium', label: 'Texto Mediano' },
  { value: 'text_long', label: 'Texto Largo' },
  { value: 'text_multiline', label: 'Texto Multilínea' },
  { value: 'select', label: 'Lista de Opciones' },
  { value: 'yes_no', label: 'Sí/No' },
  { value: 'date', label: 'Fecha' },
  { value: 'image_drawing', label: 'Dibujo en Imagen' },
  { value: 'preoperatory_exam_table', label: 'Tabla de Exámenes Preoperatorios' },
  { value: 'uniforms_preoperatory_exam_table', label: 'Tabla Uniforms - Exámenes Preoperatorios' }
];

const intToRoman = (num: number): string => {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const numerals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  
  for (let i = 0; i < values.length; i++) {
    while (num >= values[i]) {
      result += numerals[i];
      num -= values[i];
    }
  }
  return result;
};

export function BodyEditor({ bodyConfig, onChange }: BodyEditorProps) {
  const { toast } = useToast();
  const [editingFieldOptions, setEditingFieldOptions] = useState<{
    sectionId: string;
    fieldId: string;
  } | null>(null);
  const [newOption, setNewOption] = useState('');
  const [uploadingImage, setUploadingImage] = useState<{
    sectionId: string;
    fieldId: string;
  } | null>(null);

  const addSection = () => {
    const newSection: TemplateSection = {
      id: crypto.randomUUID(),
      title: `Sección ${intToRoman(bodyConfig.length + 1)}`,
      roman_numeral: intToRoman(bodyConfig.length + 1),
      fields: []
    };
    onChange([...bodyConfig, newSection]);
  };

  const updateSection = (sectionId: string, updates: Partial<TemplateSection>) => {
    onChange(bodyConfig.map(section => 
      section.id === sectionId ? { ...section, ...updates } : section
    ));
  };

  const removeSection = (sectionId: string) => {
    const newConfig = bodyConfig.filter(section => section.id !== sectionId);
    // Actualizar numeración romana
    const updatedConfig = newConfig.map((section, index) => ({
      ...section,
      roman_numeral: intToRoman(index + 1)
    }));
    onChange(updatedConfig);
  };

  const addField = (sectionId: string) => {
    const newField: TemplateField = {
      id: crypto.randomUUID(),
      name: 'Nuevo Campo',
      type: 'text_short',
      required: false,
      width: 300,
      responsive: true
    };
    
    updateSection(sectionId, {
      fields: [...(bodyConfig.find(s => s.id === sectionId)?.fields || []), newField]
    });
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<TemplateField>) => {
    const section = bodyConfig.find(s => s.id === sectionId);
    if (!section) return;

    const updatedFields = section.fields.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    );

    updateSection(sectionId, { fields: updatedFields });
  };

  const removeField = (sectionId: string, fieldId: string) => {
    const section = bodyConfig.find(s => s.id === sectionId);
    if (!section) return;

    const updatedFields = section.fields.filter(field => field.id !== fieldId);
    updateSection(sectionId, { fields: updatedFields });
  };

  const handleImageUpload = async (sectionId: string, fieldId: string, file: File) => {
    try {
      setUploadingImage({ sectionId, fieldId });
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `template-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('template-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('template-images')
        .getPublicUrl(filePath);

      updateField(sectionId, fieldId, { base_image_url: publicUrl });
      
      toast({
        title: "Imagen subida",
        description: "La imagen base se ha subido correctamente.",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "No se pudo subir la imagen",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(null);
    }
  };

  const addOptionToField = (sectionId: string, fieldId: string) => {
    if (!newOption.trim()) return;
    
    const section = bodyConfig.find(s => s.id === sectionId);
    const field = section?.fields.find(f => f.id === fieldId);
    if (!field) return;

    const currentOptions = field.options || [];
    updateField(sectionId, fieldId, {
      options: [...currentOptions, newOption.trim()]
    });
    setNewOption('');
  };

  const removeOptionFromField = (sectionId: string, fieldId: string, optionIndex: number) => {
    const section = bodyConfig.find(s => s.id === sectionId);
    const field = section?.fields.find(f => f.id === fieldId);
    if (!field || !field.options) return;

    const updatedOptions = field.options.filter((_, index) => index !== optionIndex);
    updateField(sectionId, fieldId, { options: updatedOptions });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Cuerpo de la Historia Clínica</CardTitle>
          <Button onClick={addSection} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Sección
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 max-w-none">
        {bodyConfig.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No hay secciones creadas</p>
            <p className="text-sm">Haga clic en "Agregar Sección" para comenzar</p>
          </div>
        ) : (
          bodyConfig.map((section, sectionIndex) => (
            <Card key={section.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  <div className="flex-1 flex items-center gap-4">
                    <div className="flex-1">
                      <Label>Título de la Sección</Label>
                      <Input
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        placeholder="Título de la sección"
                      />
                    </div>
                    <div className="w-24">
                      <Label>Numeración</Label>
                      <Input
                        value={section.roman_numeral}
                        onChange={(e) => updateSection(section.id, { roman_numeral: e.target.value })}
                        placeholder="I, II, III..."
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeSection(section.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Campos</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addField(section.id)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Campo
                  </Button>
                </div>
                
                {section.fields.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No hay campos en esta sección
                  </div>
                ) : (
                  <div className="space-y-2">
                    {section.fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                         <div className="flex items-center gap-2 p-2 border rounded">
                           <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                            <Input
                              value={field.name}
                              onChange={(e) => updateField(section.id, field.id, { name: e.target.value })}
                              placeholder="Nombre del campo"
                            />
                            <Select
                              value={field.type}
                              onValueChange={(value: any) => updateField(section.id, field.id, { type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {fieldTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={field.width || 300}
                                onChange={(e) => updateField(section.id, field.id, { width: parseInt(e.target.value) || 300 })}
                                placeholder="Ancho (px)"
                                className="w-20"
                                min="50"
                                max="1000"
                              />
                              <Label className="text-xs">px</Label>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={field.required}
                                onCheckedChange={(checked) => updateField(section.id, field.id, { required: checked })}
                              />
                              <Label className="text-xs">Requerido</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={field.responsive !== false}
                                onCheckedChange={(checked) => updateField(section.id, field.id, { responsive: Boolean(checked) })}
                              />
                              <Label className="text-xs">Responsivo</Label>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeField(section.id, field.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Options for select fields */}
                        {field.type === 'select' && (
                          <div className="ml-4 p-3 bg-gray-50 rounded border">
                            <Label className="text-sm font-medium">Opciones de la lista</Label>
                            <div className="mt-2 space-y-2">
                              {field.options && field.options.length > 0 && (
                                <div className="space-y-1">
                                  {field.options.map((option, optionIndex) => (
                                    <div key={optionIndex} className="flex items-center gap-2">
                                      <span className="text-sm flex-1 p-1 bg-white rounded border">
                                        {option}
                                      </span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removeOptionFromField(section.id, field.id, optionIndex)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <Input
                                  value={editingFieldOptions?.sectionId === section.id && editingFieldOptions?.fieldId === field.id ? newOption : ''}
                                  onChange={(e) => {
                                    setEditingFieldOptions({ sectionId: section.id, fieldId: field.id });
                                    setNewOption(e.target.value);
                                  }}
                                  placeholder="Nueva opción"
                                  className="text-sm"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      addOptionToField(section.id, field.id);
                                    }
                                  }}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addOptionToField(section.id, field.id)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                         )}

                        {/* Special info for preoperatory exam table */}
                        {field.type === 'preoperatory_exam_table' && (
                          <div className="ml-4 p-3 bg-blue-50 rounded border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm font-medium text-blue-700">Tabla de Exámenes Preoperatorios</span>
                            </div>
                            <div className="text-xs text-blue-600 space-y-1">
                              <p>• Tabla estructurada con 16 parámetros médicos</p>
                              <p>• Columnas para OD (Ojo Derecho) y OI (Ojo Izquierdo)</p>
                              <p>• Integración con tecnología Formily para formularios dinámicos</p>
                              <p>• Los datos se almacenan automáticamente en el formato: parametro_od, parametro_oi</p>
                            </div>
                          </div>
                        )}

                        {/* Special info for uniforms preoperatory exam table */}
                        {field.type === 'uniforms_preoperatory_exam_table' && (
                          <div className="ml-4 p-3 bg-green-50 rounded border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-medium text-green-700">Tabla Uniforms - Exámenes Preoperatorios</span>
                            </div>
                            <div className="text-xs text-green-600 space-y-1">
                              <p>• Implementado con Uniforms para formularios automáticos</p>
                              <p>• JSON Schema validation integrada</p>
                              <p>• 16 parámetros médicos con OD y OI</p>
                              <p>• Configuración optimizada para HC CiruRef</p>
                              <p>• Los datos se almacenan en formato: parametro_od, parametro_oi</p>
                            </div>
                          </div>
                        )}

                        {/* Image upload for image_drawing fields */}
                        {field.type === 'image_drawing' && (
                          <div className="ml-4 p-3 bg-gray-50 rounded border">
                            <Label className="text-sm font-medium">Imagen Base</Label>
                            <div className="mt-2 space-y-2">
                              {field.base_image_url ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Image className="h-4 w-4" />
                                    <span className="text-sm text-green-600">Imagen cargada</span>
                                  </div>
                                  <img 
                                    src={field.base_image_url} 
                                    alt="Imagen base" 
                                    className="w-32 h-32 object-cover border rounded"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateField(section.id, field.id, { base_image_url: undefined })}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Eliminar
                                  </Button>
                                </div>
                              ) : (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                  <p className="text-sm text-gray-600 mb-2">
                                    Sube una imagen base que se usará para el dibujo
                                  </p>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleImageUpload(section.id, field.id, file);
                                      }
                                    }}
                                    className="hidden"
                                    id={`image-upload-${section.id}-${field.id}`}
                                    disabled={uploadingImage?.sectionId === section.id && uploadingImage?.fieldId === field.id}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById(`image-upload-${section.id}-${field.id}`)?.click()}
                                    disabled={uploadingImage?.sectionId === section.id && uploadingImage?.fieldId === field.id}
                                  >
                                    {uploadingImage?.sectionId === section.id && uploadingImage?.fieldId === field.id ? (
                                      'Subiendo...'
                                    ) : (
                                      <>
                                        <Upload className="h-3 w-3 mr-1" />
                                        Subir Imagen
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}
