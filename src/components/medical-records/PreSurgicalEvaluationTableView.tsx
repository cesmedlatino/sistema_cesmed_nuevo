import React from 'react';
import { Input } from '@/components/ui/input';

interface PreSurgicalEvaluationTableViewProps {
  formData: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
  fieldMapping: Record<string, string>;
}

export function PreSurgicalEvaluationTableView({ 
  formData, 
  onFieldChange, 
  fieldMapping 
}: PreSurgicalEvaluationTableViewProps) {
  
  const handleFieldChange = (fieldKey: string, value: string) => {
    const fieldId = fieldMapping[fieldKey];
    if (fieldId) {
      onFieldChange(fieldId, value);
    }
  };

  // Datos de la tabla según la estructura solicitada
  const preOperatoryExamData = [
    { label: 'Método de Corrección', odField: 'metodo_correccion_od', oiField: 'metodo_correccion_oi' },
    { label: 'Lensometría / Lentes', odField: 'lensometria_od', oiField: 'lensometria_oi' },
    { label: 'Aberrómetro OSIRIS', odField: 'aberrometro_osiris_od', oiField: 'aberrometro_osiris_oi' },
    { label: 'Refracción Manifiesta', odField: 'ref_manifiesta_od', oiField: 'ref_manifiesta_oi' },
    { label: 'DIP – CDVA', odField: 'dip_cdva_od', oiField: 'dip_cdva_oi' },
    { label: 'Refracción con Ciclopejia', odField: 'ref_ciclopejia_od', oiField: 'ref_ciclopejia_oi' },
    { label: 'Queratometría', odField: 'queratometria_od', oiField: 'queratometria_oi' },
    { label: 'Flat K', odField: 'flat_k_od', oiField: 'flat_k_oi' },
    { label: 'Steep K', odField: 'steep_k_od', oiField: 'steep_k_oi' },
    { label: 'Diámetro Pupilar (escotópica)', odField: 'diametro_pupilar_od', oiField: 'diametro_pupilar_oi' },
    { label: 'Ángulo kappa', odField: 'angulo_kappa_od', oiField: 'angulo_kappa_oi' },
    { label: 'CCT (µm)', odField: 'cct_od', oiField: 'cct_oi' },
    { label: 'Z 4.0', odField: 'z40_od', oiField: 'z40_oi' },
    { label: 'W–W', odField: 'ww_od', oiField: 'ww_oi' },
    { label: 'Anillo de Vacío (ml)', odField: 'anillo_vacio_od', oiField: 'anillo_vacio_oi' },
    { label: 'Refracción Final (según Dr. Reinstein)', odField: 'ref_final_od', oiField: 'ref_final_oi' }
  ];

  return (
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
          {preOperatoryExamData.map((row, index) => (
            <tr key={index} className="hover:bg-muted/50">
              <td className="border border-border px-4 py-3 font-medium">
                {row.label}
              </td>
              <td className="border border-border px-2 py-2">
                <Input
                  value={formData[fieldMapping[row.odField]] || ''}
                  onChange={(e) => handleFieldChange(row.odField, e.target.value)}
                  className="w-full border-0 bg-transparent focus:ring-0 focus:border-0"
                  placeholder=""
                />
              </td>
              <td className="border border-border px-2 py-2">
                <Input
                  value={formData[fieldMapping[row.oiField]] || ''}
                  onChange={(e) => handleFieldChange(row.oiField, e.target.value)}
                  className="w-full border-0 bg-transparent focus:ring-0 focus:border-0"
                  placeholder=""
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}