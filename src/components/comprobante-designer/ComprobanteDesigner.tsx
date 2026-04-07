import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Save, Settings } from 'lucide-react';
import { ComprobanteEditor } from './ComprobanteEditor';
import { ComprobantePreview } from './ComprobantePreview';
import { PrinterConfigPanel } from './PrinterConfigPanel';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ComprobanteConfig {
  id?: string;
  company_name_line1: string;
  company_name_line2: string;
  company_legal_name: string;
  ruc: string;
  address_line1: string;
  address_line2: string;
  address_line3: string;
  phone: string;
  whatsapp: string;
  document_title: string;
  footer_line1: string;
  footer_line2: string;
  footer_line3: string;
  font_family: string;
  font_size: number;
  line_height: string;
  show_igv: boolean;
  igv_rate: number;
  currency_symbol: string;
  correlative_prefix: string;
  correlative_zeros: number;
  correlative_current: number;
  paper_width: number;
  paper_height: number;
  margin_top: number;
  margin_bottom: number;
  margin_left: number;
  margin_right: number;
  default_printer: string;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_CONFIG: ComprobanteConfig = {
  company_name_line1: 'Centro de Especialidades Médicas',
  company_name_line2: 'Latinoamericano',
  company_legal_name: 'CENTRO DE ESPECIALIDADES MÉDICAS LATINOAMERICANO S.R.L',
  ruc: '20607644315',
  address_line1: 'Domicilio: Mz. G Lote. 17 Coop. Villa',
  address_line2: 'Pornogocha',
  address_line3: 'Paucarpata - Arequipa - Perú',
  phone: '054-407301',
  whatsapp: '950293377',
  document_title: 'BOLETA DE VENTA',
  footer_line1: '¡Gracias por su preferencia!',
  footer_line2: 'Síguenos en redes sociales @cesmed.pe',
  footer_line3: 'www.cesmedlatinoamericano.com',
  font_family: 'Arial Rounded MT Bold, Arial, sans-serif',
  font_size: 8,
  line_height: '1.2',
  show_igv: true,
  igv_rate: 0,
  currency_symbol: 'S/.',
  correlative_prefix: 'NV',
  correlative_zeros: 6,
  correlative_current: 0,
  paper_width: 80,
  paper_height: 297,
  margin_top: 2,
  margin_bottom: 2,
  margin_left: 2,
  margin_right: 2,
  default_printer: '',
};

export function ComprobanteDesigner() {
  const [config, setConfig] = useState<ComprobanteConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comprobante_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig({ ...DEFAULT_CONFIG, ...data });
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la configuración',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const configData = {
        company_name_line1: config.company_name_line1,
        company_name_line2: config.company_name_line2,
        company_legal_name: config.company_legal_name,
        ruc: config.ruc,
        address_line1: config.address_line1,
        address_line2: config.address_line2,
        address_line3: config.address_line3,
        phone: config.phone,
        whatsapp: config.whatsapp,
        document_title: config.document_title,
        footer_line1: config.footer_line1,
        footer_line2: config.footer_line2,
        footer_line3: config.footer_line3,
        font_family: config.font_family,
        font_size: config.font_size,
        line_height: config.line_height,
        show_igv: config.show_igv,
        igv_rate: config.igv_rate,
        currency_symbol: config.currency_symbol,
        correlative_prefix: config.correlative_prefix,
        correlative_zeros: config.correlative_zeros,
        correlative_current: config.correlative_current,
        paper_width: config.paper_width,
        paper_height: config.paper_height,
        margin_top: config.margin_top,
        margin_bottom: config.margin_bottom,
        margin_left: config.margin_left,
        margin_right: config.margin_right,
        default_printer: config.default_printer,
      };

      if (config.id) {
        const { error } = await supabase
          .from('comprobante_config')
          .update(configData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('comprobante_config')
          .insert(configData);

        if (error) throw error;
      }

      toast({
        title: 'Configuración Guardada',
        description: 'La configuración del comprobante se ha guardado correctamente.',
      });

      await loadConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Diseñador de Comprobantes</h1>
          <p className="text-gray-600 mt-2">
            Personaliza los campos y textos de tus comprobantes de pago
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor">
            <Settings className="h-4 w-4 mr-2" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="printer">
            Papel e Impresora
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Vista Previa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-6">
          <ComprobanteEditor config={config} onChange={setConfig} />
        </TabsContent>

        <TabsContent value="printer" className="space-y-6">
          <PrinterConfigPanel config={config} onChange={setConfig} />
        </TabsContent>

        <TabsContent value="preview">
          <ComprobantePreview config={config} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
