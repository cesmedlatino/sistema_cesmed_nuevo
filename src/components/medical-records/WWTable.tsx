import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface WWTableProps {
  formData: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
  section: any;
}

// Normaliza textos a minúsculas, sin acentos ni símbolos
const normalize = (s: string) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const EYE_TOKENS: Record<'od' | 'oi', string[]> = {
  od: ['od', 'ojo derecho', 'derecho'],
  oi: ['oi', 'ojo izquierdo', 'izquierdo'],
};

export function WWTable({ formData, onFieldChange, section }: WWTableProps) {
  const fieldsIndex = useMemo(() => {
    const index: { id: string; norm: string }[] = [];
    (section?.fields || []).forEach((f: any) => {
      index.push({ id: f.id, norm: normalize(f.name) });
    });
    return index;
  }, [section]);

  const getNumeric = (raw: any) => {
    const s = String(raw ?? '').replace(/mm/gi, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isNaN(n) ? 0 : n;
  };

  const formatMm = (n: number) => `${n.toFixed(1)}mm`;

  const findFieldId = (eye: 'od' | 'oi') => {
    const eyeTokens = EYE_TOKENS[eye];
    // Tokens de contexto para W-W (White-to-White)
    const contextTokens = [
      'w-w', 'w w', 'ww', 'wtw', 'white to white', 'white-to-white', 'white2white', 'white 2 white',
      'hvid', 'visible iris diameter', 'diametro horizontal', 'diametro del iris', 'diametro iris', 'diametro', 'diametro corneal',
      'diámetro horizontal', 'diámetro del iris', 'diámetro iris', 'diámetro', 'mm'
    ].map(normalize);

    let match = fieldsIndex.find((f) => {
      const n = f.norm;
      const hasEye = eyeTokens.some((tok) => n.includes(normalize(tok)));
      const hasContext = contextTokens.some((tok) => n.includes(tok));
      return hasEye && hasContext;
    });

    // Fallback: cualquier campo que al menos mencione el ojo
    if (!match) {
      match = fieldsIndex.find((f) => {
        const n = f.norm;
        return eyeTokens.some((tok) => n.includes(normalize(tok)));
      });
    }

    return match?.id;
  };

  const renderCell = (eye: 'od' | 'oi') => {
    const fieldId = findFieldId(eye);
    if (!fieldId) return <span className="text-muted-foreground">-</span>;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const current = getNumeric(formData[fieldId]);
      const delta = e.key === 'ArrowUp' ? 0.1 : -0.1;
      const next = current + delta;
      onFieldChange(fieldId, formatMm(next));
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const raw = e.currentTarget.value.trim();
      if (raw === '') {
        if ((formData[fieldId] ?? '') !== '') onFieldChange(fieldId, '');
        return;
      }
      const num = getNumeric(raw);
      if (!Number.isNaN(num)) {
        const formatted = formatMm(num);
        if (formatted !== formData[fieldId]) onFieldChange(fieldId, formatted);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === '') {
        onFieldChange(fieldId, '');
        return;
      }
      const num = getNumeric(value);
      if (!Number.isNaN(num)) {
        const cleaned = value.replace(/mm/gi, '');
        const withMm = /mm$/i.test(value) ? value : `${cleaned}mm`;
        onFieldChange(fieldId, withMm);
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
        className="millimeter-field h-8 text-center bg-accent/5"
        placeholder="mm"
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
                W-W
              </TableHead>
              <TableHead className="text-center font-semibold">OD (mm)</TableHead>
              <TableHead className="text-center font-semibold">OI (mm)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium"></TableCell>
              <TableCell>{renderCell('od')}</TableCell>
              <TableCell>{renderCell('oi')}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
