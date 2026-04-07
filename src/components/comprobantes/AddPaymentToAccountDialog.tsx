import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, FileText, Search, Camera, Plus } from 'lucide-react';
import { CameraCapture } from '@/components/payments/CameraCapture';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Concepto {
  id: string;
  nombre: string;
  descripcion: string;
  monto: number;
  tipo: string;
}

interface Modalidad {
  id: string;
  nombre: string;
  descripcion: string;
}

interface AddPaymentToAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cuentaId: string;
  patientId: string;
  patientName: string;
  onPaymentAdded: () => void;
}

export function AddPaymentToAccountDialog({ 
  isOpen, 
  onClose, 
  cuentaId, 
  patientId, 
  patientName,
  onPaymentAdded 
}: AddPaymentToAccountDialogProps) {
  const { toast } = useToast();
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [modalidades, setModalidades] = useState<Modalidad[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConceptoDropdown, setShowConceptoDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewConceptoDialog, setShowNewConceptoDialog] = useState(false);
  const [isCreatingConcepto, setIsCreatingConcepto] = useState(false);
  const [newConcepto, setNewConcepto] = useState({
    nombre: '',
    descripcion: '',
    monto: 0,
    tipo: 'consulta'
  });

  const [formData, setFormData] = useState({
    concepto_id: '',
    monto_pagado: 0,
    modalidad_id: '',
    tipo_confirmacion: '',
    estado_pago: 'Completo',
    monto_adelanto: 0,
    saldo: 0,
    confirmado: false,
    observaciones: '',
    tiene_adjunto: false
  });

  const isPaymentPending = formData.estado_pago === 'Pendiente';

  useEffect(() => {
    if (isOpen) {
      fetchConceptos();
      fetchModalidades();
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    const selectedConcepto = conceptos.find(c => c.id === formData.concepto_id);
    if (selectedConcepto) {
      setFormData(prev => ({ 
        ...prev, 
        monto_pagado: selectedConcepto.monto,
        saldo: prev.estado_pago === 'Adelanto' ? selectedConcepto.monto - prev.monto_adelanto : 0
      }));
    }
  }, [formData.concepto_id, conceptos]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowConceptoDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (formData.concepto_id && conceptos.length > 0) {
      const concepto = conceptos.find(c => c.id === formData.concepto_id);
      if (concepto) {
        setSearchTerm(`${concepto.nombre} - S/. ${concepto.monto.toFixed(2)}`);
      }
    } else if (!formData.concepto_id) {
      setSearchTerm('');
    }
  }, [formData.concepto_id, conceptos]);

  const fetchConceptos = async () => {
    try {
      const { data, error } = await supabase
        .from('concepto')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setConceptos(data || []);
    } catch (error) {
      console.error('Error fetching conceptos:', error);
    }
  };

  const fetchModalidades = async () => {
    try {
      const { data, error } = await supabase
        .from('modalidad')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setModalidades(data || []);
    } catch (error) {
      console.error('Error fetching modalidades:', error);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Tipo de archivo no válido',
        description: 'Solo se permiten archivos JPG, PNG o PDF',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'El archivo no debe superar los 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadedFile(file);
    setFormData(prev => ({ ...prev, tiene_adjunto: true, confirmado: true }));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleCameraCapture = (file: File) => {
    handleFileSelect(file);
    setShowCameraCapture(false);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `payment-confirmations/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('template-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('template-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.concepto_id || !formData.estado_pago) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor complete todos los campos obligatorios',
        variant: 'destructive',
      });
      return;
    }

    if (!isPaymentPending && (!formData.modalidad_id || !formData.tipo_confirmacion)) {
      toast({
        title: 'Campos requeridos',
        description: 'Para estados diferentes a "Pendiente", debe especificar la modalidad de pago y tipo de confirmación',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      let archivoUrl = '';

      if (uploadedFile) {
        archivoUrl = await uploadFile(uploadedFile);
      }

      let isConfirmed = formData.confirmado;
      if (formData.estado_pago === 'Pendiente') {
        isConfirmed = true;
      }
      if ((formData.tipo_confirmacion === 'Voucher' || formData.tipo_confirmacion === 'Captura') && uploadedFile) {
        isConfirmed = true;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('pagos')
        .insert({
          patient_id: patientId,
          cuenta_id: cuentaId,
          concepto_id: formData.concepto_id,
          monto_pagado: formData.monto_pagado,
          modalidad_id: (isPaymentPending || !formData.modalidad_id) ? null : formData.modalidad_id,
          tipo_confirmacion: (isPaymentPending || !formData.tipo_confirmacion) ? null : formData.tipo_confirmacion,
          estado_pago: formData.estado_pago,
          monto_adelanto: formData.estado_pago === 'Adelanto' ? formData.monto_adelanto : null,
          saldo: formData.estado_pago === 'Adelanto' ? formData.saldo : null,
          tiene_adjunto: formData.tiene_adjunto,
          archivo_confirmacion: archivoUrl || null,
          confirmado: isConfirmed,
          observaciones: formData.observaciones || '',
          created_by: user?.id,
          updated_by: user?.id
        });

      if (error) throw error;

      toast({
        title: 'Pago agregado',
        description: 'El pago se ha agregado a la cuenta correctamente',
      });
      
      onPaymentAdded();
      onClose();
      
    } catch (error: any) {
      console.error('Error saving payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo agregar el pago',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      concepto_id: '',
      monto_pagado: 0,
      modalidad_id: '',
      tipo_confirmacion: '',
      estado_pago: 'Completo',
      monto_adelanto: 0,
      saldo: 0,
      confirmado: false,
      observaciones: '',
      tiene_adjunto: false
    });
    setUploadedFile(null);
    setSearchTerm('');
  };

  const handleCreateConcepto = async () => {
    if (!newConcepto.nombre || newConcepto.monto <= 0) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor ingrese nombre y monto del concepto',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingConcepto(true);
    try {
      const { data, error } = await supabase
        .from('concepto')
        .insert([{
          nombre: newConcepto.nombre,
          descripcion: newConcepto.descripcion,
          monto: newConcepto.monto,
          tipo: newConcepto.tipo,
          activo: true
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Concepto creado',
        description: `Se creó el concepto "${newConcepto.nombre}"`,
      });

      await fetchConceptos();
      if (data) {
        setFormData(prev => ({ ...prev, concepto_id: data.id, monto_pagado: data.monto }));
        setSearchTerm(`${data.nombre} - S/. ${data.monto.toFixed(2)}`);
      }

      setShowNewConceptoDialog(false);
      setNewConcepto({ nombre: '', descripcion: '', monto: 0, tipo: 'consulta' });
    } catch (error) {
      console.error('Error creating concepto:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el concepto',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingConcepto(false);
    }
  };

  const filteredConceptos = conceptos.filter(concepto => 
    concepto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    concepto.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    concepto.monto.toString().includes(searchTerm)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Pago a Cuenta</DialogTitle>
        </DialogHeader>
        
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-muted-foreground">Paciente</p>
          <p className="font-semibold">{patientName}</p>
          <p className="text-xs text-muted-foreground mt-1">Cuenta: {cuentaId.substring(0, 12)}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Concepto Search */}
          <div className="space-y-2">
            <Label>Concepto *</Label>
            <div className="relative">
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Buscar concepto..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowConceptoDropdown(true);
                      if (e.target.value === '') {
                        setFormData(prev => ({ ...prev, concepto_id: '' }));
                      }
                    }}
                    onFocus={() => setShowConceptoDropdown(true)}
                    className="pl-9"
                  />
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => setShowNewConceptoDialog(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Agregar concepto</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {showConceptoDropdown && (
                <div ref={dropdownRef} className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredConceptos.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No se encontraron conceptos
                    </div>
                  ) : (
                    filteredConceptos.map((concepto) => (
                      <div
                        key={concepto.id}
                        className={`p-2 hover:bg-accent cursor-pointer ${
                          formData.concepto_id === concepto.id ? 'bg-accent' : ''
                        }`}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, concepto_id: concepto.id }));
                          setShowConceptoDropdown(false);
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{concepto.nombre}</span>
                          <span className="text-sm text-primary font-semibold">S/. {concepto.monto.toFixed(2)}</span>
                        </div>
                        {concepto.descripcion && (
                          <p className="text-xs text-muted-foreground">{concepto.descripcion}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Monto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monto S/.</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.monto_pagado}
                onChange={(e) => setFormData(prev => ({ ...prev, monto_pagado: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado de Pago *</Label>
              <Select
                value={formData.estado_pago}
                onValueChange={(value) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    estado_pago: value,
                    monto_adelanto: value !== 'Adelanto' ? 0 : prev.monto_adelanto,
                    saldo: value !== 'Adelanto' ? 0 : prev.saldo
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Completo">Cancelado</SelectItem>
                  <SelectItem value="Adelanto">Adelanto</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Adelanto fields */}
          {formData.estado_pago === 'Adelanto' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto Adelanto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.monto_adelanto}
                  onChange={(e) => {
                    const adelanto = parseFloat(e.target.value) || 0;
                    setFormData(prev => ({
                      ...prev,
                      monto_adelanto: adelanto,
                      saldo: prev.monto_pagado - adelanto
                    }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Saldo Pendiente</Label>
                <Input
                  type="number"
                  value={formData.saldo}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          )}

          {/* Modalidad y Tipo Confirmación */}
          {!isPaymentPending && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modalidad de Pago *</Label>
                <Select
                  value={formData.modalidad_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, modalidad_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {modalidades.map((mod) => (
                      <SelectItem key={mod.id} value={mod.id}>{mod.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Confirmación *</Label>
                <Select
                  value={formData.tipo_confirmacion}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_confirmacion: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Caja">Caja</SelectItem>
                    <SelectItem value="Voucher">Voucher</SelectItem>
                    <SelectItem value="Captura">Captura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* File upload */}
          {!isPaymentPending && (formData.tipo_confirmacion === 'Voucher' || formData.tipo_confirmacion === 'Captura') && (
            <div className="space-y-2">
              <Label>Archivo de Confirmación</Label>
              
              {showCameraCapture ? (
                <CameraCapture
                  onCapture={handleCameraCapture}
                  onCancel={() => setShowCameraCapture(false)}
                />
              ) : (
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {uploadedFile ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="text-sm">{uploadedFile.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setUploadedFile(null);
                          setFormData(prev => ({ ...prev, tiene_adjunto: false }));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-center gap-2">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Arrastra un archivo o
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('file-input-add')?.click()}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Subir
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCameraCapture(true)}
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          Cámara
                        </Button>
                      </div>
                      <input
                        id="file-input-add"
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={handleFileInputChange}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Confirmación manual para Caja */}
          {!isPaymentPending && formData.tipo_confirmacion === 'Caja' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirmado"
                checked={formData.confirmado}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, confirmado: !!checked }))}
              />
              <Label htmlFor="confirmado" className="text-sm">Confirmar pago</Label>
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={formData.observaciones}
              onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
              placeholder="Notas adicionales..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Guardando...' : 'Agregar Pago'}
            </Button>
          </div>
        </form>

        {/* Dialog para crear nuevo concepto */}
        <Dialog open={showNewConceptoDialog} onOpenChange={setShowNewConceptoDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Concepto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={newConcepto.nombre}
                  onChange={(e) => setNewConcepto(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Nombre del concepto"
                />
              </div>
              <div className="space-y-2">
                <Label>Monto S/. *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newConcepto.monto}
                  onChange={(e) => setNewConcepto(prev => ({ ...prev, monto: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newConcepto.tipo}
                  onValueChange={(value) => setNewConcepto(prev => ({ ...prev, tipo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consulta">Consulta</SelectItem>
                    <SelectItem value="procedimiento">Procedimiento</SelectItem>
                    <SelectItem value="cirugia">Cirugía</SelectItem>
                    <SelectItem value="examen">Examen</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={newConcepto.descripcion}
                  onChange={(e) => setNewConcepto(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Descripción opcional..."
                  rows={2}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewConceptoDialog(false)} 
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="button"
                  onClick={handleCreateConcepto}
                  disabled={isCreatingConcepto}
                  className="flex-1"
                >
                  {isCreatingConcepto ? 'Guardando...' : 'Crear Concepto'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
