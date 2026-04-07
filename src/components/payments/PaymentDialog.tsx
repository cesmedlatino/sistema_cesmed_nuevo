import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePaymentMutations } from '@/hooks/usePaymentMutations';
import { Upload, X, FileText, Search, Camera, Plus } from 'lucide-react';
import { CameraCapture } from './CameraCapture';
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

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  specialistId?: string;
  paymentId?: string;
  selectedCuentaId?: string | null;
  onPaymentSaved: (paymentId: string, conceptoNombre?: string) => void;
}

export function PaymentDialog({ isOpen, onClose, patientId, specialistId, paymentId, selectedCuentaId, onPaymentSaved }: PaymentDialogProps) {
  const { toast } = useToast();
  const { createPayment, updatePayment, uploadFile, isCreating, isUpdating } = usePaymentMutations();
  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [modalidades, setModalidades] = useState<Modalidad[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [existingFileUrl, setExistingFileUrl] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConceptoDropdown, setShowConceptoDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [showNewConceptoDialog, setShowNewConceptoDialog] = useState(false);
  const [newConcepto, setNewConcepto] = useState({ nombre: '', descripcion: '', monto: 0, tipo: 'consulta' });
  const [isCreatingConcepto, setIsCreatingConcepto] = useState(false);
  
  const isLoading = isCreating || isUpdating;

  const [formData, setFormData] = useState({
    concepto_id: '',
    monto_pagado: 0,
    modalidad_id: '',
    tipo_confirmacion: '',
    estado_pago: 'Pendiente',
    monto_adelanto: 0,
    saldo: 0,
    confirmado: false,
    observaciones: '',
    tiene_adjunto: false
  });

  // Determinar si los campos deben estar deshabilitados
  const isPaymentPending = formData.estado_pago === 'Pendiente';

  useEffect(() => {
    if (isOpen) {
      // Primero cargar conceptos y modalidades
      const loadData = async () => {
        // Primero resetear el form si es nuevo pago
        if (!paymentId) {
          setIsEditMode(false);
          setFormData({
            concepto_id: '',
            monto_pagado: 0,
            modalidad_id: '',
            tipo_confirmacion: '',
            estado_pago: 'Pendiente',
            monto_adelanto: 0,
            saldo: 0,
            confirmado: false,
            observaciones: '',
            tiene_adjunto: false
          });
          setUploadedFile(null);
          setExistingFileUrl('');
          setShowCameraCapture(false);
          setSearchTerm('');
          setShowConceptoDropdown(false);
        }
        
        // Luego cargar datos
        await fetchConceptos();
        await fetchModalidades();
        
        // Si hay paymentId, cargar los datos del pago
        if (paymentId) {
          setIsEditMode(true);
          await loadPaymentData();
        }
      };
      
      loadData();
    }
  }, [isOpen, paymentId]);

  useEffect(() => {
    // Actualizar monto cuando cambia el concepto (solo para nuevos pagos, no para edición)
    if (!isEditMode) {
      const selectedConcepto = conceptos.find(c => c.id === formData.concepto_id);
      if (selectedConcepto) {
        setFormData(prev => ({ 
          ...prev, 
          monto_pagado: selectedConcepto.monto,
          saldo: prev.estado_pago === 'Adelanto' ? selectedConcepto.monto - prev.monto_adelanto : 0
        }));
      }
    }
  }, [formData.concepto_id, conceptos, isEditMode]);

  // Cerrar dropdown al hacer click fuera
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

  // Actualizar el término de búsqueda cuando se selecciona un concepto
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
      
      // Si es un nuevo pago y no hay concepto seleccionado, establecer "Consulta" por defecto
      if (!paymentId && data && data.length > 0) {
        const consultaConcepto = data.find(c => c.nombre.toLowerCase() === 'consulta');
        if (consultaConcepto) {
          setFormData(prev => ({ ...prev, concepto_id: consultaConcepto.id }));
          setSearchTerm(`${consultaConcepto.nombre} - S/. ${consultaConcepto.monto.toFixed(2)}`);
        }
      }
    } catch (error) {
      console.error('Error fetching conceptos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los conceptos',
        variant: 'destructive',
      });
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
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las modalidades de pago',
        variant: 'destructive',
      });
    }
  };

  const loadPaymentData = async () => {
    if (!paymentId) return;
    
    try {
      const { data, error } = await supabase
        .from('pagos')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      
      setFormData({
        concepto_id: data.concepto_id || '',
        monto_pagado: data.monto_pagado || 0,
        modalidad_id: data.modalidad_id || '',
        tipo_confirmacion: data.tipo_confirmacion || '',
        estado_pago: data.estado_pago || 'Pendiente',
        monto_adelanto: data.monto_adelanto || 0,
        saldo: data.saldo || 0,
        confirmado: data.confirmado || false,
        observaciones: data.observaciones || '',
        tiene_adjunto: data.tiene_adjunto || false
      });

      // Si existe un archivo de confirmación, guardarlo para mostrar
      if (data.archivo_confirmacion) {
        setExistingFileUrl(data.archivo_confirmacion);
      }
    } catch (error) {
      console.error('Error loading payment:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información del pago',
        variant: 'destructive',
      });
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
    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Tipo de archivo no válido',
        description: 'Solo se permiten archivos JPG, PNG o PDF',
        variant: 'destructive',
      });
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'El archivo no debe superar los 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadedFile(file);
    // Cuando se sube un archivo (Voucher o Captura), confirmar automáticamente
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

  const handleCameraCancel = () => {
    setShowCameraCapture(false);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let effectivePatientId = patientId;

    // Validación especial para pagos a cuentas existentes
    if (selectedCuentaId && !effectivePatientId) {
      // Obtener el patient_id de la cuenta seleccionada
      try {
        const { data: existingPayment, error } = await supabase
          .from('pagos')
          .select('patient_id')
          .eq('cuenta_id', selectedCuentaId)
          .limit(1)
          .single();
          
        if (error || !existingPayment) {
          toast({
            title: 'Error',
            description: 'No se pudo obtener la información de la cuenta seleccionada',
            variant: 'destructive',
          });
          return;
        }
        
        // Usar el patient_id de la cuenta existente
        effectivePatientId = existingPayment.patient_id;
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Error al validar la cuenta seleccionada',
          variant: 'destructive',
        });
        return;
      }
    }

    if (!effectivePatientId) {
      toast({
        title: 'Error',
        description: 'No se ha seleccionado un paciente',
        variant: 'destructive',
      });
      return;
    }

    // Validar campos requeridos (modalidad y tipo de confirmación no son requeridos si el estado es Pendiente)
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

    // Validar monto de adelanto si es necesario
    if (formData.estado_pago === 'Adelanto') {
      if (!formData.monto_adelanto || formData.monto_adelanto <= 0) {
        toast({
          title: 'Monto de adelanto requerido',
          description: 'Debe especificar el monto del adelanto',
          variant: 'destructive',
        });
        return;
      }

      if (formData.monto_adelanto >= formData.monto_pagado) {
        toast({
          title: 'Monto de adelanto inválido',
          description: 'El monto del adelanto debe ser menor al monto total',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validar imagen requerida para voucher o captura (solo si el estado NO es Pendiente)
    if (!isPaymentPending && 
        (formData.tipo_confirmacion === 'Voucher' || formData.tipo_confirmacion === 'Captura') && 
        !uploadedFile && !existingFileUrl) {
      toast({
        title: 'Imagen de confirmación requerida',
        description: 'Debe subir una imagen de confirmación para voucher o captura',
        variant: 'destructive',
      });
      return;
    }

    try {
      let archivoUrl = '';

      // Subir archivo si existe, sino mantener el existente
      if (uploadedFile) {
        archivoUrl = await uploadFile(uploadedFile);
      } else if (existingFileUrl) {
        archivoUrl = existingFileUrl;
      }

      // Determinar si el pago debe estar confirmado automáticamente
      let isConfirmed = formData.confirmado;
      
      // Para Pendientes, confirmar automáticamente
      if (formData.estado_pago === 'Pendiente') {
        isConfirmed = true;
      }
      
      // Para Voucher o Captura con archivo subido, confirmar automáticamente
      if ((formData.tipo_confirmacion === 'Voucher' || formData.tipo_confirmacion === 'Captura') && 
          (uploadedFile || existingFileUrl)) {
        isConfirmed = true;
      }

      const paymentData = {
        patient_id: effectivePatientId,
        specialist_id: specialistId || null,
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
        ...(selectedCuentaId && !paymentId ? { cuenta_id: selectedCuentaId } : {})
      };

      let resultPaymentId: string;
      
      if (paymentId) {
        // Actualizar pago existente
        await updatePayment.mutateAsync({ id: paymentId, paymentData });
        resultPaymentId = paymentId;
      } else {
        // Crear nuevo pago
        const result = await createPayment.mutateAsync(paymentData);
        resultPaymentId = result?.id || paymentId || '';
      }

      // Reset form y cerrar dialog
      if (resultPaymentId) {
        // Obtener el nombre del concepto para pasarlo
        const selectedConcepto = conceptos.find(c => c.id === formData.concepto_id);
        onPaymentSaved(resultPaymentId, selectedConcepto?.nombre);
      }
      onClose();
      resetForm();

    } catch (error: any) {
      // Los errores ya se manejan en las mutaciones
      console.error('Error saving payment:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      concepto_id: '',
      monto_pagado: 0,
      modalidad_id: '',
      tipo_confirmacion: '',
      estado_pago: 'Pendiente',
      monto_adelanto: 0,
      saldo: 0,
      confirmado: false,
      observaciones: '',
      tiene_adjunto: false
    });
    setUploadedFile(null);
    setExistingFileUrl('');
    setIsEditMode(false);
    setSearchTerm('');
  };

  const selectedConcepto = conceptos.find(c => c.id === formData.concepto_id);

  // Filtrar conceptos basándose en el término de búsqueda
  const filteredConceptos = conceptos.filter(concepto => 
    concepto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    concepto.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    concepto.monto.toString().includes(searchTerm)
  );

  const handleConceptoSelect = (concepto: Concepto) => {
    setFormData({...formData, concepto_id: concepto.id});
    setSearchTerm(`${concepto.nombre} - S/. ${concepto.monto.toFixed(2)}`);
    setShowConceptoDropdown(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Solo mostrar dropdown si el usuario está escribiendo activamente
    setShowConceptoDropdown(value.length > 0);
    // Si se borra el texto, limpiar la selección
    if (!value) {
      setFormData({...formData, concepto_id: ''});
    }
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

      // Actualizar lista de conceptos y seleccionar el nuevo
      await fetchConceptos();
      if (data) {
        setFormData(prev => ({ ...prev, concepto_id: data.id, monto_pagado: data.monto }));
        setSearchTerm(`${data.nombre} - S/. ${data.monto.toFixed(2)}`);
      }

      // Cerrar dialog y resetear formulario
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

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {paymentId 
              ? 'Editar Pago' 
              : selectedCuentaId 
                ? `Agregar Pago a Cuenta ${selectedCuentaId}` 
                : 'Registrar Pago'
            }
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Label htmlFor="concepto_search">Concepto *</Label>
              <div className="relative flex gap-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    id="concepto_search"
                    type="text"
                    placeholder="Buscar concepto..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onClick={(e) => {
                      // Solo abrir dropdown si no hay concepto seleccionado
                      if (!formData.concepto_id) {
                        setShowConceptoDropdown(true);
                      }
                    }}
                    className="pl-9"
                    required
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
              
              {showConceptoDropdown && filteredConceptos.length > 0 && (
                <div 
                  ref={dropdownRef}
                  className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto"
                >
                  {filteredConceptos.map((concepto) => (
                    <div
                      key={concepto.id}
                      onClick={() => handleConceptoSelect(concepto)}
                      className="px-3 py-2 hover:bg-accent cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{concepto.nombre}</p>
                          {concepto.descripcion && (
                            <p className="text-xs text-muted-foreground">{concepto.descripcion}</p>
                          )}
                        </div>
                        <span className="text-sm font-semibold ml-2 text-primary">
                          S/. {concepto.monto.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {showConceptoDropdown && filteredConceptos.length === 0 && searchTerm && (
                <div 
                  ref={dropdownRef}
                  className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3"
                >
                  <p className="text-sm text-muted-foreground text-center">
                    No se encontraron conceptos
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="monto_pagado">Monto a Pagar *</Label>
              <Input
                id="monto_pagado"
                type="number"
                step="0.01"
                value={formData.monto_pagado}
                onChange={(e) => setFormData({...formData, monto_pagado: parseFloat(e.target.value) || 0})}
                required
                className={!isEditMode ? "bg-muted" : ""}
                readOnly={!isEditMode}
              />
              {selectedConcepto && (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedConcepto.descripcion}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="modalidad_id">Modalidad de Pago *</Label>
              {isPaymentPending ? (
                <Input
                  value="Pago Pendiente"
                  disabled
                  className="bg-muted"
                />
              ) : (
                <Select 
                  value={formData.modalidad_id} 
                  onValueChange={(value) => {
                    // Limpiar tipo de confirmación al cambiar modalidad
                    setFormData({...formData, modalidad_id: value, tipo_confirmacion: ''});
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar modalidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {modalidades.map((modalidad) => (
                      <SelectItem key={modalidad.id} value={modalidad.id}>
                        {modalidad.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label htmlFor="tipo_confirmacion">Tipo de Confirmación *</Label>
              {isPaymentPending ? (
                <Input
                  value="Pago Pendiente"
                  disabled
                  className="bg-muted"
                />
              ) : (
                <Select 
                  value={formData.tipo_confirmacion} 
                  onValueChange={(value) => setFormData({...formData, tipo_confirmacion: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const selectedModalidad = modalidades.find(m => m.id === formData.modalidad_id);
                      const isEfectivo = selectedModalidad?.nombre === 'Efectivo';
                      
                      if (isEfectivo) {
                        return <SelectItem value="Caja">Caja</SelectItem>;
                      } else {
                        return (
                          <>
                            <SelectItem value="Voucher">Voucher</SelectItem>
                            <SelectItem value="Captura">Captura</SelectItem>
                          </>
                        );
                      }
                    })()}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="estado_pago">Estado del Pago *</Label>
            <Select 
              value={formData.estado_pago} 
              onValueChange={(value) => {
                const newFormData = {
                  ...formData, 
                  estado_pago: value, 
                  monto_adelanto: 0,
                  saldo: 0
                };
                
                // Si cambia a Pendiente, limpiar modalidad y tipo de confirmación
                if (value === 'Pendiente') {
                  newFormData.modalidad_id = '';
                  newFormData.tipo_confirmacion = '';
                }
                
                setFormData(newFormData);
              }}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Completo">Completo - Paciente pagó el 100%</SelectItem>
                <SelectItem value="Adelanto">Adelanto - Monto parcial, queda saldo pendiente</SelectItem>
                <SelectItem value="Pendiente">Pendiente - Reserva registrada, aún no abonó</SelectItem>
                <SelectItem value="Crédito">Crédito - Se atiende y paga después</SelectItem>
                <SelectItem value="Anulado">Anulado - Boleta cancelada antes de facturarse</SelectItem>
                <SelectItem value="Reembolsado">Reembolsado - Devolución total del pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.estado_pago === 'Adelanto' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monto_adelanto">Monto de Adelanto *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    S/.
                  </span>
                  <Input
                    id="monto_adelanto"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={formData.monto_pagado - 0.01}
                    value={formData.monto_adelanto || ''}
                    onChange={(e) => {
                      const adelanto = parseFloat(e.target.value) || 0;
                      setFormData({
                        ...formData, 
                        monto_adelanto: adelanto,
                        saldo: formData.monto_pagado - adelanto
                      });
                    }}
                    placeholder="0.00"
                    className="pl-12"
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Monto máximo: S/. {(formData.monto_pagado - 0.01).toFixed(2)}
                </p>
              </div>

              <div>
                <Label htmlFor="saldo">Saldo Pendiente</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    S/.
                  </span>
                  <Input
                    id="saldo"
                    type="text"
                    value={formData.saldo.toFixed(2)}
                    className="pl-12 bg-muted"
                    readOnly
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Calculado automáticamente
                </p>
              </div>
            </div>
          )}

          {/* Archivo de Confirmación solo visible si NO es tipo Caja y NO es estado Pendiente */}
          {!isPaymentPending && formData.tipo_confirmacion !== 'Caja' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Archivo de Confirmación</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCameraCapture(true)}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Capturar con Cámara
                  </Button>
                </div>
              </div>

              {showCameraCapture ? (
                <CameraCapture 
                  onCapture={handleCameraCapture}
                  onCancel={handleCameraCancel}
                />
              ) : (
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {uploadedFile ? (
                    <div className="space-y-3">
                      {uploadedFile.type.startsWith('image/') ? (
                        <div className="relative rounded-lg overflow-hidden border border-border">
                          <img 
                            src={URL.createObjectURL(uploadedFile)} 
                            alt="Vista previa"
                            className="w-full h-auto max-h-80 object-contain bg-muted"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm flex-1">{uploadedFile.name}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(2)} KB)
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUploadedFile(null);
                            setFormData(prev => ({ ...prev, tiene_adjunto: false }));
                          }}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ) : existingFileUrl ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">Archivo de confirmación existente</span>
                        <a 
                          href={existingFileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Ver archivo
                        </a>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setExistingFileUrl('');
                          setFormData(prev => ({ ...prev, tiene_adjunto: false }));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Arrastra y suelta un archivo aquí, o haz clic para seleccionar
                      </p>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        onChange={handleFileInputChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>Seleccionar archivo</span>
                        </Button>
                      </label>
                      <p className="text-xs text-muted-foreground mt-2">
                        JPG, PNG o PDF (máx. 5MB)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={formData.observaciones}
              onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
              placeholder="Observaciones adicionales sobre el pago"
              rows={3}
            />
          </div>

          {/* Checkbox Confirmar Pago solo visible cuando tipo de confirmación es Caja */}
          {formData.tipo_confirmacion === 'Caja' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirmado"
                checked={formData.confirmado}
                onCheckedChange={(checked) => setFormData({...formData, confirmado: !!checked})}
              />
              <Label htmlFor="confirmado" className="font-medium">
                Confirmar Pago
              </Label>
            </div>
          )}

          <div className="flex gap-4 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : (paymentId ? 'Actualizar Pago' : 'Registrar Pago')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

      {/* Dialog para crear nuevo concepto */}
      <Dialog open={showNewConceptoDialog} onOpenChange={setShowNewConceptoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Concepto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new_concepto_nombre">Nombre *</Label>
              <Input
                id="new_concepto_nombre"
                value={newConcepto.nombre}
                onChange={(e) => setNewConcepto({ ...newConcepto, nombre: e.target.value })}
                placeholder="Ej: Consulta Especializada"
              />
            </div>
            <div>
              <Label htmlFor="new_concepto_monto">Monto (S/.) *</Label>
              <Input
                id="new_concepto_monto"
                type="number"
                step="0.01"
                value={newConcepto.monto || ''}
                onChange={(e) => setNewConcepto({ ...newConcepto, monto: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="new_concepto_descripcion">Descripción</Label>
              <Input
                id="new_concepto_descripcion"
                value={newConcepto.descripcion}
                onChange={(e) => setNewConcepto({ ...newConcepto, descripcion: e.target.value })}
                placeholder="Descripción opcional"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowNewConceptoDialog(false);
                  setNewConcepto({ nombre: '', descripcion: '', monto: 0, tipo: 'consulta' });
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleCreateConcepto}
                disabled={isCreatingConcepto}
              >
                {isCreatingConcepto ? 'Creando...' : 'Crear Concepto'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}