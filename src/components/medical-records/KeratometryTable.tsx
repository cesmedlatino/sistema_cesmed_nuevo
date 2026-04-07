import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface KeratometryTableProps {
  formData: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
  section: any;
}

// Utilidad para normalizar textos (sin acentos, minúsculas y sin símbolos)
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const ROW_KEYS = [
  { key: 'flat_k', match: ['flat k', 'k plano', 'plano'] },
  { key: 'steep_k', match: ['steep k', 'k curvo', 'curvo'] },
] as const;

const EYE_TOKENS: Record<'od'|'oi', string[]> = {
  od: ['od', 'ojo derecho', 'derecho'],
  oi: ['oi', 'ojo izquierdo', 'izquierdo'],
};

export function KeratometryTable({ formData, onFieldChange, section }: KeratometryTableProps) {
  // Construir índice por nombre normalizado para búsqueda flexible
  const fieldsIndex = useMemo(() => {
    const index: { id: string; name: string; norm: string }[] = [];
    (section?.fields || []).forEach((f: any) => {
      const name = String(f.name || '');
      index.push({ id: f.id, name, norm: normalize(name) });
    });
    return index;
  }, [section]);

  const getNumeric = (raw: any) => {
    const s = String(raw ?? '').replace(/d/gi, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isNaN(n) ? 0 : n;
  };

  const formatDiopter = (n: number) => `${n.toFixed(2)}D`;

  const findFieldId = (rowKey: typeof ROW_KEYS[number]['key'], eye: 'od'|'oi') => {
    const row = ROW_KEYS.find(r => r.key === rowKey)!;
    const eyeTokens = EYE_TOKENS[eye];

    const match = fieldsIndex.find(f => {
      const n = f.norm;
      const hasRow = row.match.some(tok => n.includes(normalize(tok)));
      const hasEye = eyeTokens.some(tok => n.includes(normalize(tok)));
      return hasRow && hasEye;
    });

    return match?.id;
  };

  const renderCell = (rowKey: typeof ROW_KEYS[number]['key'], eye: 'od'|'oi') => {
    const fieldId = findFieldId(rowKey, eye);
    if (!fieldId) return <span className="text-muted-foreground">-</span>;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const raw = formData[fieldId];
      const current = getNumeric(raw);
      const delta = e.key === 'ArrowUp' ? 0.01 : -0.01;
      const next = current + delta;
      onFieldChange(fieldId, formatDiopter(next));
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const num = getNumeric(e.currentTarget.value);
      if (!Number.isNaN(num)) {
        const formatted = formatDiopter(num);
        if (formatted !== formData[fieldId]) onFieldChange(fieldId, formatted);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Extraer número e inmediatamente aplicar máscara con D
      const num = getNumeric(value);
      if (value === '') {
        onFieldChange(fieldId, '');
        return;
      }
      if (!Number.isNaN(num)) {
        // Mantener lo que el usuario escribe pero asegurando sufijo D
        const cleaned = value.replace(/d/gi, '');
        const withD = cleaned.endsWith('D') || cleaned.endsWith('d') ? cleaned : `${cleaned}D`;
        onFieldChange(fieldId, withD);
      } else {
        onFieldChange(fieldId, value);
      }
    };

    return (
      <Input
        value={formData[fieldId] || ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        inputMode="decimal"
        className="diopter-field h-8 text-center bg-primary/5"
        placeholder="D"
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="font-semibold align-middle" style={{ width: 240 }} rowSpan={1}>
                QUERATOMETRÍA
              </TableHead>
              <TableHead className="text-center font-semibold">OD</TableHead>
              <TableHead className="text-center font-semibold">OI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">FLAT K</TableCell>
              <TableCell>{renderCell('flat_k', 'od')}</TableCell>
              <TableCell>{renderCell('flat_k', 'oi')}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">STEEP K</TableCell>
              <TableCell>{renderCell('steep_k', 'od')}</TableCell>
              <TableCell>{renderCell('steep_k', 'oi')}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
