import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface UniformsPreOperatoryTableProps {
  onDataChange?: (data: any) => void;
  initialData?: any;
}

// Configuración de parámetros para la tabla
const examParameters = [
  { key: 'metodo_correccion', label: 'Método de Corrección' },
  { key: 'lensometria_lentes', label: 'Lensometría / Lentes' },
  { key: 'aberrometro_osiris', label: 'Aberrómetro OSIRIS' },
  { key: 'refraccion_manifiesta', label: 'Refracción Manifiesta' },
  { key: 'dip_cdva', label: 'DIP – CDVA' },
  { key: 'refraccion_ciclopejia', label: 'Refracción con Ciclopejia' },
  { key: 'queratometria', label: 'Queratometría' },
  { key: 'flat_k', label: 'Flat K' },
  { key: 'steep_k', label: 'Steep K' },
  { key: 'diametro_pupilar', label: 'Diámetro Pupilar (escotópica)' },
  { key: 'angulo_kappa', label: 'Ángulo kappa' },
  { key: 'cct', label: 'CCT (µm)' },
  { key: 'z40', label: 'Z 4.0' },
  { key: 'ww', label: 'W–W' },
  { key: 'anillo_vacio', label: 'Anillo de Vacío (ml)' },
  { key: 'refraccion_final', label: 'Refracción Final (según Dr. Reinstein)' }
];

export function UniformsPreOperatoryTable({ onDataChange, initialData }: UniformsPreOperatoryTableProps) {
  // Estado para manejar los valores del formulario
  const [formData, setFormData] = useState<Record<string, string>>(initialData || {});

  // Función para manejar cambios en los campos
  const handleFieldChange = (fieldName: string, value: string) => {
    const newFormData = { ...formData, [fieldName]: value };
    setFormData(newFormData);
    onDataChange?.(newFormData);
  };

  // Sincronizar con datos iniciales cuando cambien
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>IV. EXÁMENES PREOPERATORIOS</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border px-4 py-3 text-left font-semibold">Parámetro</th>
                <th className="border border-border px-4 py-3 text-center font-semibold">OD</th>
                <th className="border border-border px-4 py-3 text-center font-semibold">OI</th>
              </tr>
            </thead>
            <tbody>
              {examParameters.map((param, index) => (
                <tr key={param.key} className="hover:bg-muted/50">
                  <td className="border border-border px-4 py-3 font-medium">
                    {param.label}
                  </td>
                  <td className="border border-border px-2 py-2">
                    <Input
                      value={formData[`${param.key}_od`] || ''}
                      onChange={(e) => handleFieldChange(`${param.key}_od`, e.target.value)}
                      className="w-full border-0 bg-transparent focus:ring-0 focus:border-0"
                      placeholder=""
                    />
                  </td>
                  <td className="border border-border px-2 py-2">
                    <Input
                      value={formData[`${param.key}_oi`] || ''}
                      onChange={(e) => handleFieldChange(`${param.key}_oi`, e.target.value)}
                      className="w-full border-0 bg-transparent focus:ring-0 focus:border-0"
                      placeholder=""
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Panel de debug para desarrollo */}
        <div className="mt-4 p-4 bg-muted/50 rounded">
          <details>
            <summary className="cursor-pointer font-medium">Ver datos del formulario Uniforms simplificado</summary>
            <div className="mt-2 text-xs space-y-2">
              <div className="text-sm font-medium text-green-600">Estructura de datos Uniforms para HC CiruRef:</div>
              <pre className="overflow-auto bg-white p-2 rounded border">
                {JSON.stringify(formData, null, 2)}
              </pre>
              <div className="text-xs text-gray-600">
                Implementado con estructura preparada para Uniforms. Los datos se almacenan con el formato: parametro_od, parametro_oi.
              </div>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}