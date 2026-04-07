import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface FinalRefractionCorrectionTableProps {
  formData: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
  section: any;
}

// Normalizador: minúsculas, sin acentos ni símbolos
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

const PARAM_TOKENS: Record<'esfera' | 'cilindro' | 'eje', string[]> = {
  esfera: ['esfera', 'esf'],
  cilindro: ['cilindro', 'cil'],
  eje: ['eje'],
};

export function FinalRefractionCorrectionTable({ formData, onFieldChange, section }: FinalRefractionCorrectionTableProps) {
  const fieldsIndex = useMemo(() => {
    const index: { id: string; norm: string }[] = [];
    (section?.fields || []).forEach((f: any) => {
      index.push({ id: f.id, norm: normalize(f.name) });
    });
    return index;
  }, [section]);

  // Helpers formateo
  const formatSigned = (value: number) => {
    if (Number.isNaN(value)) return '';
    if (value > 0) return '+' + value.toFixed(2);
    if (value < 0) return value.toFixed(2);
    return '0.00';
  };
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
  const parseDegrees = (value: any) => {
    const s = String(value ?? '').replace(/[^\d]/g, '');
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? 0 : n;
  };
  const formatDegrees = (n: number) => `${clamp(Math.round(n), 0, 180)}°`;

  const findFieldId = (eye: 'od' | 'oi', param: keyof typeof PARAM_TOKENS) => {
    const eyeTokens = EYE_TOKENS[eye];
    const paramTokens = PARAM_TOKENS[param];
    const contextTokens = [
      'refraccion final a corregir', 'refraccion final', 'refracción final', 'a corregir', 'corregir',
      'final a corregir', 'final', 'rxfinal', 'rx final', 'rx a corregir'
    ].map(normalize);

    // Preferir coincidencia con contexto + ojo + parámetro
    let match = fieldsIndex.find((f) => {
      const n = f.norm;
      const hasEye = eyeTokens.some((tok) => n.includes(normalize(tok)));
      const hasParam = paramTokens.some((tok) => n.includes(normalize(tok)));
      const hasContext = contextTokens.some((tok) => n.includes(tok));
      return hasEye && hasParam && hasContext;
    });

    // Fallback: ojo + parámetro
    if (!match) {
      match = fieldsIndex.find((f) => {
        const n = f.norm;
        const hasEye = eyeTokens.some((tok) => n.includes(normalize(tok)));
        const hasParam = paramTokens.some((tok) => n.includes(normalize(tok)));
        return hasEye && hasParam;
      });
    }

    return match?.id;
  };

  const renderCell = (eye: 'od' | 'oi', param: keyof typeof PARAM_TOKENS) => {
    const fieldId = findFieldId(eye, param);
    if (!fieldId) return <span className="text-muted-foreground">-</span>;

    const isSphereCylinder = param === 'esfera' || param === 'cilindro';
    const isAxis = param === 'eje';

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();

      if (isSphereCylinder) {
        const raw = formData[fieldId];
        const currentValue = parseFloat((typeof raw === 'string' ? raw : String(raw)).replace(',', '.')) || 0;
        const delta = e.key === 'ArrowUp' ? 0.25 : -0.25;
        const next = currentValue + delta;
        onFieldChange(fieldId, formatSigned(next));
        return;
      }

      if (isAxis) {
        const raw = formData[fieldId];
        const currentValue = parseDegrees(raw);
        const delta = e.key === 'ArrowUp' ? 1 : -1;
        const next = clamp(currentValue + delta, 0, 180);
        onFieldChange(fieldId, formatDegrees(next));
        return;
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (isSphereCylinder) {
        const v = parseFloat(e.currentTarget.value.replace(',', '.'));
        if (!Number.isNaN(v)) {
          const formatted = formatSigned(v);
          if (formatted !== formData[fieldId]) onFieldChange(fieldId, formatted);
        }
      }
      if (isAxis) {
        const v = parseDegrees(e.currentTarget.value);
        const formatted = formatDegrees(v);
        if (formatted !== formData[fieldId]) onFieldChange(fieldId, formatted);
      }
    };

    const placeholder = param === 'eje' ? '°' : '+/-';

    return (
      <Input
        value={formData[fieldId] || ''}
        onChange={(e) => onFieldChange(fieldId, e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        inputMode="decimal"
        className={`h-8 text-center ${isSphereCylinder ? 'sphere-cylinder bg-primary/5' : ''}`}
        placeholder={placeholder}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="font-semibold align-middle" style={{ width: 280 }} rowSpan={2}>
                REFRACCIÓN FINAL A CORREGIR
              </TableHead>
              <TableHead className="text-center font-semibold" colSpan={3}>OD</TableHead>
              <TableHead className="text-center font-semibold" colSpan={3}>OI</TableHead>
            </TableRow>
            <TableRow className="bg-muted/70">
              <TableHead className="text-center font-semibold">ESFERA</TableHead>
              <TableHead className="text-center font-semibold">CILINDRO</TableHead>
              <TableHead className="text-center font-semibold">EJE</TableHead>
              <TableHead className="text-center font-semibold">ESFERA</TableHead>
              <TableHead className="text-center font-semibold">CILINDRO</TableHead>
              <TableHead className="text-center font-semibold">EJE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Valores</TableCell>
              <TableCell>{renderCell('od', 'esfera')}</TableCell>
              <TableCell>{renderCell('od', 'cilindro')}</TableCell>
              <TableCell>{renderCell('od', 'eje')}</TableCell>
              <TableCell>{renderCell('oi', 'esfera')}</TableCell>
              <TableCell>{renderCell('oi', 'cilindro')}</TableCell>
              <TableCell>{renderCell('oi', 'eje')}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
