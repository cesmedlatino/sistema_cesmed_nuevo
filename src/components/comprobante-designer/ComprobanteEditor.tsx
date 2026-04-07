import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ComprobanteConfig } from './ComprobanteDesigner';

interface ComprobanteEditorProps {
  config: ComprobanteConfig;
  onChange: (config: ComprobanteConfig) => void;
}

export function ComprobanteEditor({ config, onChange }: ComprobanteEditorProps) {
  const handleChange = (field: keyof ComprobanteConfig, value: any) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Información de la Empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name_line1">Nombre de la Empresa (Línea 1)</Label>
              <Input
                id="company_name_line1"
                value={config.company_name_line1}
                onChange={(e) => handleChange('company_name_line1', e.target.value)}
                placeholder="Centro de Especialidades Médicas"
              />
            </div>
            <div>
              <Label htmlFor="company_name_line2">Nombre de la Empresa (Línea 2)</Label>
              <Input
                id="company_name_line2"
                value={config.company_name_line2}
                onChange={(e) => handleChange('company_name_line2', e.target.value)}
                placeholder="Latinoamericano"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="company_legal_name">Razón Social</Label>
            <Input
              id="company_legal_name"
              value={config.company_legal_name}
              onChange={(e) => handleChange('company_legal_name', e.target.value)}
              placeholder="CENTRO DE ESPECIALIDADES MÉDICAS LATINOAMERICANO S.R.L"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ruc">RUC</Label>
              <Input
                id="ruc"
                value={config.ruc}
                onChange={(e) => handleChange('ruc', e.target.value)}
                placeholder="20607644315"
              />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={config.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="054-407301"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={config.whatsapp}
              onChange={(e) => handleChange('whatsapp', e.target.value)}
              placeholder="950293377"
            />
          </div>
        </CardContent>
      </Card>

      {/* Dirección */}
      <Card>
        <CardHeader>
          <CardTitle>Dirección</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address_line1">Dirección (Línea 1)</Label>
            <Input
              id="address_line1"
              value={config.address_line1}
              onChange={(e) => handleChange('address_line1', e.target.value)}
              placeholder="Domicilio: Mz. G Lote. 17 Coop. Villa"
            />
          </div>
          <div>
            <Label htmlFor="address_line2">Dirección (Línea 2)</Label>
            <Input
              id="address_line2"
              value={config.address_line2}
              onChange={(e) => handleChange('address_line2', e.target.value)}
              placeholder="Pornogocha"
            />
          </div>
          <div>
            <Label htmlFor="address_line3">Dirección (Línea 3)</Label>
            <Input
              id="address_line3"
              value={config.address_line3}
              onChange={(e) => handleChange('address_line3', e.target.value)}
              placeholder="Paucarpata - Arequipa - Perú"
            />
          </div>
        </CardContent>
      </Card>

      {/* Documento */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración del Documento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="document_title">Título del Documento</Label>
            <Input
              id="document_title"
              value={config.document_title}
              onChange={(e) => handleChange('document_title', e.target.value)}
              placeholder="BOLETA DE VENTA"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="font_size">Tamaño de Fuente</Label>
              <Input
                id="font_size"
                type="number"
                value={config.font_size}
                onChange={(e) => handleChange('font_size', parseInt(e.target.value))}
                min="8"
                max="16"
              />
            </div>
            <div>
              <Label htmlFor="line_height">Alto de Línea</Label>
              <Input
                id="line_height"
                value={config.line_height}
                onChange={(e) => handleChange('line_height', e.target.value)}
                placeholder="1.2"
              />
            </div>
            <div>
              <Label htmlFor="currency_symbol">Símbolo de Moneda</Label>
              <Input
                id="currency_symbol"
                value={config.currency_symbol}
                onChange={(e) => handleChange('currency_symbol', e.target.value)}
                placeholder="S/."
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="show_igv"
              checked={config.show_igv}
              onCheckedChange={(checked) => handleChange('show_igv', checked)}
            />
            <Label htmlFor="show_igv">Mostrar IGV</Label>
          </div>

          {config.show_igv && (
            <div>
              <Label htmlFor="igv_rate">Tasa de IGV (%)</Label>
              <Input
                id="igv_rate"
                type="number"
                value={config.igv_rate}
                onChange={(e) => handleChange('igv_rate', parseFloat(e.target.value))}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pie de Página */}
      <Card>
        <CardHeader>
          <CardTitle>Pie de Página</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="footer_line1">Pie de Página (Línea 1)</Label>
            <Input
              id="footer_line1"
              value={config.footer_line1}
              onChange={(e) => handleChange('footer_line1', e.target.value)}
              placeholder="¡Gracias por su preferencia!"
            />
          </div>
          <div>
            <Label htmlFor="footer_line2">Pie de Página (Línea 2)</Label>
            <Input
              id="footer_line2"
              value={config.footer_line2}
              onChange={(e) => handleChange('footer_line2', e.target.value)}
              placeholder="Síguenos en redes sociales @cesmed.pe"
            />
          </div>
          <div>
            <Label htmlFor="footer_line3">Pie de Página (Línea 3)</Label>
            <Input
              id="footer_line3"
              value={config.footer_line3}
              onChange={(e) => handleChange('footer_line3', e.target.value)}
              placeholder="www.cesmedlatinoamericano.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Correlativo */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Correlativo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="correlative_prefix">Prefijo del Correlativo</Label>
              <Input
                id="correlative_prefix"
                value={config.correlative_prefix}
                onChange={(e) => handleChange('correlative_prefix', e.target.value.toUpperCase())}
                placeholder="NV"
                maxLength={5}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Letras iniciales del número de comprobante (ej: NV, FC, BV)
              </p>
            </div>
            <div>
              <Label htmlFor="correlative_zeros">Cantidad de Ceros</Label>
              <Input
                id="correlative_zeros"
                type="number"
                min="4"
                max="10"
                value={config.correlative_zeros}
                onChange={(e) => handleChange('correlative_zeros', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Número de dígitos para el correlativo (ej: 6 = 000001)
              </p>
            </div>
          </div>
          
          <div>
            <Label htmlFor="correlative_current">Número Actual</Label>
            <Input
              id="correlative_current"
              type="number"
              min="0"
              value={config.correlative_current}
              onChange={(e) => handleChange('correlative_current', parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Último número de comprobante generado
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Vista Previa del Próximo Número:</p>
            <p className="font-mono text-lg">
              {config.correlative_prefix}-{String(config.correlative_current + 1).padStart(config.correlative_zeros, '0')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
