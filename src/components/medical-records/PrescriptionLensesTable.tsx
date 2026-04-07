import React from 'react';
import { Input } from '@/components/ui/input';

interface PrescriptionLensesTableProps {
  formData: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
  section: any;
}

export function PrescriptionLensesTable({ formData, onFieldChange, section }: PrescriptionLensesTableProps) {
  // Mapeo de campos de la tabla a IDs de base de datos
  const fieldMapping = {
    lejosODEsfera: '86c12ebf-dad8-4861-bf5b-3047755a3db5',
    lejosODCilindro: 'c1bb1eab-d818-4c37-88af-61d44109a829',
    lejosODEje: 'e45bad80-e535-4df1-b9d7-99b9b260b10a',
    lejosODDip: '8edeee3c-6ddb-47d2-a04a-5b2591d9d285',
    lejosOIEsfera: 'b332c97a-0dc4-49b8-9198-1ba3c387e398',
    lejosOICilindro: '522a35bb-a172-4c40-b1c7-d3e8b7852240',
    lejosOIEje: '6b01f36e-20f3-4c88-90ac-9307c4542444',
    lejosOIDip: '4be263f4-5d78-4454-baa2-b535f4639e71',
    cercaEsfera: '4da6b5dd-27db-4ddd-873a-e2f147c6a483',
    cercaCilindro: '4a60473f-b28e-42b9-a81f-df032360a9b0',
    cercaEje: '171d2dfe-781b-47e2-bf9d-e8756c023b9b',
    cercaDip: 'e05e0f1d-54bd-407d-80db-4b495d74fb68'
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
      label: 'Lejos OD',
      esfera: { fieldName: 'lejosODEsfera', value: formData['86c12ebf-dad8-4861-bf5b-3047755a3db5'] || '' },
      cilindro: { fieldName: 'lejosODCilindro', value: formData['c1bb1eab-d818-4c37-88af-61d44109a829'] || '' },
      eje: { fieldName: 'lejosODEje', value: formData['e45bad80-e535-4df1-b9d7-99b9b260b10a'] || '' },
      dip: { fieldName: 'lejosODDip', value: formData['8edeee3c-6ddb-47d2-a04a-5b2591d9d285'] || '' }
    },
    {
      label: 'Lejos OI',
      esfera: { fieldName: 'lejosOIEsfera', value: formData['b332c97a-0dc4-49b8-9198-1ba3c387e398'] || '' },
      cilindro: { fieldName: 'lejosOICilindro', value: formData['522a35bb-a172-4c40-b1c7-d3e8b7852240'] || '' },
      eje: { fieldName: 'lejosOIEje', value: formData['6b01f36e-20f3-4c88-90ac-9307c4542444'] || '' },
      dip: { fieldName: 'lejosOIDip', value: formData['4be263f4-5d78-4454-baa2-b535f4639e71'] || '' }
    },
    {
      label: 'Cerca ADD',
      esfera: { fieldName: 'cercaEsfera', value: formData['4da6b5dd-27db-4ddd-873a-e2f147c6a483'] || '' },
      cilindro: { fieldName: 'cercaCilindro', value: formData['4a60473f-b28e-42b9-a81f-df032360a9b0'] || '' },
      eje: { fieldName: 'cercaEje', value: formData['171d2dfe-781b-47e2-bf9d-e8756c023b9b'] || '' },
      dip: { fieldName: 'cercaDip', value: formData['e05e0f1d-54bd-407d-80db-4b495d74fb68'] || '' }
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm bg-white">
          <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200 w-32">
                Medición
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200">
                Esfera
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200">
                Cilindro
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200">
                Eje
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 border-b border-gray-200">
                DIP
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
                <td className="px-4 py-3 border-r border-gray-100">
                  <strong className="text-sm font-medium text-gray-800">
                    {row.label}
                  </strong>
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="text"
                    value={row.esfera.value}
                    onChange={(e) => handleFieldChange(row.esfera.fieldName, e.target.value)}
                    placeholder="±0.00"
                    className="text-center text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="text"
                    value={row.cilindro.value}
                    onChange={(e) => handleFieldChange(row.cilindro.fieldName, e.target.value)}
                    placeholder="±0.00"
                    className="text-center text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="text"
                    value={row.eje.value}
                    onChange={(e) => handleFieldChange(row.eje.fieldName, e.target.value)}
                    placeholder="0°"
                    className="text-center text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="text"
                    value={row.dip.value}
                    onChange={(e) => handleFieldChange(row.dip.fieldName, e.target.value)}
                    placeholder="mm"
                    className="text-center text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-500 mt-2">
        <p><strong>Nota:</strong> OD = Ojo Derecho, OI = Ojo Izquierdo, ADD = Adición para cerca, DIP = Distancia Interpupilar</p>
      </div>
    </div>
  );
}