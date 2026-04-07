import React from 'react';
import { Input } from '@/components/ui/input';

interface BiomicroscopicExamTableProps {
  formData: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
  section: any;
}

export function BiomicroscopicExamTable({ formData, onFieldChange, section }: BiomicroscopicExamTableProps) {
  // Mapeo de campos de la tabla a IDs de base de datos
  const fieldMapping = {
    pioOD: 'ff7e64fa-7471-4485-8bf3-fa448973aa12',
    pioOI: '6631261a-6c5c-4a0c-9a7b-204f8629efa0',
    exaBioMicOD: '90990684-f8e6-4a97-a686-f0a7b138714e',
    exaBioMicOI: 'cb43c61a-f4b9-495b-ac16-97e7213d5dc2',
    fondoOjoOD: 'a21903ff-2e0b-4d77-838d-3fdf72986e25',
    fondoOjoOI: 'b3257f15-1c0b-4cc6-8bb1-0e50a9db5f32'
  };

  // Manejar cambios en los campos y propagar al componente padre
  const handleFieldChange = (fieldName: string, value: string) => {
    const fieldId = fieldMapping[fieldName as keyof typeof fieldMapping];
    if (fieldId) {
      onFieldChange(fieldId, value);
    }
  };

  // Datos de la tabla organizados por filas
  const tableData = [
    {
      label: 'PIO',
      description: 'Presión Intraocular',
      od: { fieldName: 'pioOD', value: formData['ff7e64fa-7471-4485-8bf3-fa448973aa12'] || '' },
      oi: { fieldName: 'pioOI', value: formData['6631261a-6c5c-4a0c-9a7b-204f8629efa0'] || '' }
    },
    {
      label: 'Examen Biomicroscópico',
      description: 'Evaluación estructural anterior',
      od: { fieldName: 'exaBioMicOD', value: formData['90990684-f8e6-4a97-a686-f0a7b138714e'] || '' },
      oi: { fieldName: 'exaBioMicOI', value: formData['cb43c61a-f4b9-495b-ac16-97e7213d5dc2'] || '' }
    },
    {
      label: 'Fondo de Ojo',
      description: 'Evaluación del segmento posterior',
      od: { fieldName: 'fondoOjoOD', value: formData['a21903ff-2e0b-4d77-838d-3fdf72986e25'] || '' },
      oi: { fieldName: 'fondoOjoOI', value: formData['b3257f15-1c0b-4cc6-8bb1-0e50a9db5f32'] || '' }
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm bg-white">
          <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 w-64">
                Examen
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200">
                Ojo Derecho (OD)
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200">
                Ojo Izquierdo (OI)
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr 
                key={index} 
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                }`}
              >
                <td className="px-4 py-4 border-r border-gray-100">
                  <div className="space-y-1">
                    <strong className="text-sm font-medium text-gray-800 block">
                      {row.label}
                    </strong>
                    <span className="text-xs text-gray-500">
                      {row.description}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <Input
                    type="text"
                    value={row.od.value}
                    onChange={(e) => handleFieldChange(row.od.fieldName, e.target.value)}
                    placeholder={
                      row.label === 'PIO' ? 'mmHg' :
                      row.label === 'Examen Biomicroscópico' ? 'Descripción hallazgos' :
                      'Observaciones'
                    }
                    className="text-center text-sm border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </td>
                <td className="px-4 py-4">
                  <Input
                    type="text"
                    value={row.oi.value}
                    onChange={(e) => handleFieldChange(row.oi.fieldName, e.target.value)}
                    placeholder={
                      row.label === 'PIO' ? 'mmHg' :
                      row.label === 'Examen Biomicroscópico' ? 'Descripción hallazgos' :
                      'Observaciones'
                    }
                    className="text-center text-sm border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-500 mt-2">
        <p><strong>Nota:</strong> OD = Ojo Derecho, OI = Ojo Izquierdo, PIO = Presión Intraocular (valores normales: 10-21 mmHg)</p>
      </div>
    </div>
  );
}