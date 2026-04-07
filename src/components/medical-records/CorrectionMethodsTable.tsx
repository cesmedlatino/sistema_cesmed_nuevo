import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CorrectionMethodsTableProps {
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

const METHOD_KEYS = [
  { key: 'lensometria', match: ['lensometria', 'lenso', 'lentes'] },
  { key: 'aberrometro_osiris', match: ['aberrometro', 'osiris'] },
  { key: 'refraccion_manifiesta', match: ['refraccion manifiesta', 'manifiesta'] },
  { key: 'refraccion_ciclopejia', match: ['refraccion con ciclopejia', 'ciclopejia', 'cicloplejia'] },
] as const;

const PARAM_TOKENS: Record<'esfera'|'cilindro'|'eje'|'av', string[]> = {
  esfera: ['esfera', 'esf'],
  cilindro: ['cilindro', 'cil'],
  eje: ['eje'],
  av: ['av', 'agudeza visual'],
};

const EYE_TOKENS: Record<'od'|'oi', string[]> = {
  od: ['od', 'ojo derecho', 'derecho'],
  oi: ['oi', 'ojo izquierdo', 'izquierdo'],
};

export function CorrectionMethodsTable({ formData, onFieldChange, section }: CorrectionMethodsTableProps) {
  // Helpers para formato e incremento de Esfera/Cilindro
  const formatSigned = (value: number) => {
    if (Number.isNaN(value)) return '';
    if (value > 0) return '+' + value.toFixed(2);
    if (value < 0) return value.toFixed(2);
    return '0.00';
  };
  const isSphereOrCylinder = (p: keyof typeof PARAM_TOKENS) => p === 'esfera' || p === 'cilindro';
  const isAxis = (p: keyof typeof PARAM_TOKENS) => p === 'eje';

  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
  const parseDegrees = (value: any) => {
    const s = String(value ?? '').replace(/[^\d]/g, '');
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? 0 : n;
  };
  const formatDegrees = (n: number) => `${clamp(Math.round(n), 0, 180)}°`;

  // Escala de Agudeza Visual (Snellen y decimal)
  const AV_SCALE = [
    { value: 0.1, snellen: '20/200', desc: 'Umbral de ceguera legal en varios países' },
    { value: 0.2, snellen: '20/100', desc: 'Baja visión' },
    { value: 0.25, snellen: '20/80', desc: 'Visión bastante reducida' },
    { value: 0.33, snellen: '20/60', desc: 'Dificultad moderada' },
    { value: 0.4, snellen: '20/50', desc: 'Baja visión funcional' },
    { value: 0.5, snellen: '20/40', desc: 'Límite legal para conducir en varios países' },
    { value: 0.67, snellen: '20/30', desc: 'Visión moderadamente reducida' },
    { value: 0.8, snellen: '20/25', desc: 'Ligeramente por debajo de lo normal' },
    { value: 1.0, snellen: '20/20', desc: 'Visión normal' },
    { value: 1.5, snellen: '20/15', desc: 'Muy buena visión' },
    { value: 2.0, snellen: '20/10', desc: 'Visión superior al promedio' },
  ] as const;

  const parseAVIndex = (raw: any): number => {
    const s = String(raw ?? '').trim().toLowerCase();
    if (!s) return AV_SCALE.findIndex(e => e.value === 1.0);
    const snellenMatch = s.match(/20\s*\/\s*(\d{2,3})/);
    if (snellenMatch) {
      const denom = snellenMatch[1];
      const idx = AV_SCALE.findIndex(e => e.snellen.endsWith('/' + denom));
      if (idx >= 0) return idx;
    }
    const dec = parseFloat(s.replace(',', '.'));
    if (!Number.isNaN(dec)) {
      let best = 0;
      let bestDiff = Infinity;
      AV_SCALE.forEach((e, i) => {
        const d = Math.abs(e.value - dec);
        if (d < bestDiff) {
          best = i;
          bestDiff = d;
        }
      });
      return best;
    }
    return AV_SCALE.findIndex(e => e.value === 1.0);
  };

  const formatAVByIndex = (idx: number) => {
    const i = clamp(idx, 0, AV_SCALE.length - 1);
    return AV_SCALE[i].snellen;
  };

  const getAVPlaceholder = (raw: any) => {
    const idx = parseAVIndex(raw);
    return AV_SCALE[idx]?.desc || 'Agudeza visual';
  };

  // Construir índice por nombre normalizado para búsqueda flexible
  const fieldsIndex = useMemo(() => {
    const index: { id: string; name: string; norm: string }[] = [];
    (section?.fields || []).forEach((f: any) => {
      const name = String(f.name || '');
      index.push({ id: f.id, name, norm: normalize(name) });
    });
    return index;
  }, [section]);

  const findFieldId = (methodKey: typeof METHOD_KEYS[number]['key'], eye: 'od'|'oi', param: keyof typeof PARAM_TOKENS) => {
    const method = METHOD_KEYS.find(m => m.key === methodKey)!;
    const eyeTokens = EYE_TOKENS[eye];
    const paramTokens = PARAM_TOKENS[param];

    // Buscar el primer campo cuyo nombre normalizado contenga: método + ojo + parámetro
    const match = fieldsIndex.find(f => {
      const n = f.norm;
      const hasMethod = method.match.some(tok => n.includes(normalize(tok)));
      const hasEye = eyeTokens.some(tok => n.includes(normalize(tok)));
      const hasParam = paramTokens.some(tok => n.includes(normalize(tok)));
      return hasMethod && hasEye && hasParam;
    });

    return match?.id;
  };

  const renderCell = (methodKey: typeof METHOD_KEYS[number]['key'], eye: 'od'|'oi', param: keyof typeof PARAM_TOKENS) => {
    const fieldId = findFieldId(methodKey, eye, param);
    if (!fieldId) return <span className="text-muted-foreground">-</span>;

    const sphereCylinder = isSphereOrCylinder(param);
    const axisParam = isAxis(param);
    const avParam = param === 'av';

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();

      if (sphereCylinder) {
        const raw = formData[fieldId];
        const currentValue = parseFloat((typeof raw === 'string' ? raw : String(raw)).replace(',', '.')) || 0;
        const delta = e.key === 'ArrowUp' ? 0.25 : -0.25;
        const next = currentValue + delta;
        onFieldChange(fieldId, formatSigned(next));
        return;
      }

      if (axisParam) {
        const raw = formData[fieldId];
        const currentValue = parseDegrees(raw);
        const delta = e.key === 'ArrowUp' ? 1 : -1;
        const next = clamp(currentValue + delta, 0, 180);
        onFieldChange(fieldId, formatDegrees(next));
        return;
      }

      if (avParam) {
        const raw = formData[fieldId];
        const idx = parseAVIndex(raw);
        const delta = e.key === 'ArrowUp' ? 1 : -1;
        const nextIdx = clamp(idx + delta, 0, AV_SCALE.length - 1);
        onFieldChange(fieldId, formatAVByIndex(nextIdx));
        return;
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (sphereCylinder) {
        const v = parseFloat(e.currentTarget.value.replace(',', '.'));
        if (!Number.isNaN(v)) {
          const formatted = formatSigned(v);
          if (formatted !== formData[fieldId]) onFieldChange(fieldId, formatted);
        }
      }

      if (axisParam) {
        const v = parseDegrees(e.currentTarget.value);
        const formatted = formatDegrees(v);
        if (formatted !== formData[fieldId]) onFieldChange(fieldId, formatted);
      }

      if (avParam) {
        const raw = e.currentTarget.value.trim();
        if (raw === '') {
          if ((formData[fieldId] ?? '') !== '') onFieldChange(fieldId, '');
          return;
        }
        const idx = parseAVIndex(raw);
        const formatted = formatAVByIndex(idx);
        if (formatted !== formData[fieldId]) onFieldChange(fieldId, formatted);
      }
    };

    const placeholder = param === 'eje' ? '°' : avParam ? '20/' : '+/-';

    return (
      <Input
        value={formData[fieldId] || ''}
        onChange={(e) => onFieldChange(fieldId, e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        inputMode="decimal"
        className={`h-8 text-center ${sphereCylinder ? 'sphere-cylinder bg-primary/5' : ''}`}
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
              <TableHead className="font-semibold align-middle" style={{ width: 240 }} rowSpan={2}>
                Método de Corrección
              </TableHead>
              <TableHead className="text-center font-semibold" colSpan={4}>OD</TableHead>
              <TableHead className="text-center font-semibold" colSpan={4}>OI</TableHead>
            </TableRow>
            <TableRow className="bg-muted/70">
              <TableHead className="text-center font-semibold">ESFERA</TableHead>
              <TableHead className="text-center font-semibold">CILINDRO</TableHead>
              <TableHead className="text-center font-semibold">EJE</TableHead>
              <TableHead className="text-center font-semibold">AV</TableHead>
              <TableHead className="text-center font-semibold">ESFERA</TableHead>
              <TableHead className="text-center font-semibold">CILINDRO</TableHead>
              <TableHead className="text-center font-semibold">EJE</TableHead>
              <TableHead className="text-center font-semibold">AV</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">LENSOMETRÍA</TableCell>
              <TableCell>{renderCell('lensometria', 'od', 'esfera')}</TableCell>
              <TableCell>{renderCell('lensometria', 'od', 'cilindro')}</TableCell>
              <TableCell>{renderCell('lensometria', 'od', 'eje')}</TableCell>
              <TableCell>{renderCell('lensometria', 'od', 'av')}</TableCell>
              <TableCell>{renderCell('lensometria', 'oi', 'esfera')}</TableCell>
              <TableCell>{renderCell('lensometria', 'oi', 'cilindro')}</TableCell>
              <TableCell>{renderCell('lensometria', 'oi', 'eje')}</TableCell>
              <TableCell>{renderCell('lensometria', 'oi', 'av')}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">ABERRÓMETRO OSIRIS</TableCell>
              <TableCell>{renderCell('aberrometro_osiris', 'od', 'esfera')}</TableCell>
              <TableCell>{renderCell('aberrometro_osiris', 'od', 'cilindro')}</TableCell>
              <TableCell>{renderCell('aberrometro_osiris', 'od', 'eje')}</TableCell>
              <TableCell>{renderCell('aberrometro_osiris', 'od', 'av')}</TableCell>
              <TableCell>{renderCell('aberrometro_osiris', 'oi', 'esfera')}</TableCell>
              <TableCell>{renderCell('aberrometro_osiris', 'oi', 'cilindro')}</TableCell>
              <TableCell>{renderCell('aberrometro_osiris', 'oi', 'eje')}</TableCell>
              <TableCell>{renderCell('aberrometro_osiris', 'oi', 'av')}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">REFRACCIÓN MANIFIESTA</TableCell>
              <TableCell>{renderCell('refraccion_manifiesta', 'od', 'esfera')}</TableCell>
              <TableCell>{renderCell('refraccion_manifiesta', 'od', 'cilindro')}</TableCell>
              <TableCell>{renderCell('refraccion_manifiesta', 'od', 'eje')}</TableCell>
              <TableCell>{renderCell('refraccion_manifiesta', 'od', 'av')}</TableCell>
              <TableCell>{renderCell('refraccion_manifiesta', 'oi', 'esfera')}</TableCell>
              <TableCell>{renderCell('refraccion_manifiesta', 'oi', 'cilindro')}</TableCell>
              <TableCell>{renderCell('refraccion_manifiesta', 'oi', 'eje')}</TableCell>
              <TableCell>{renderCell('refraccion_manifiesta', 'oi', 'av')}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">REFRACCIÓN CON CICLOPLEJÍA</TableCell>
              <TableCell>{renderCell('refraccion_ciclopejia', 'od', 'esfera')}</TableCell>
              <TableCell>{renderCell('refraccion_ciclopejia', 'od', 'cilindro')}</TableCell>
              <TableCell>{renderCell('refraccion_ciclopejia', 'od', 'eje')}</TableCell>
              <TableCell>{renderCell('refraccion_ciclopejia', 'od', 'av')}</TableCell>
              <TableCell>{renderCell('refraccion_ciclopejia', 'oi', 'esfera')}</TableCell>
              <TableCell>{renderCell('refraccion_ciclopejia', 'oi', 'cilindro')}</TableCell>
              <TableCell>{renderCell('refraccion_ciclopejia', 'oi', 'eje')}</TableCell>
              <TableCell>{renderCell('refraccion_ciclopejia', 'oi', 'av')}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
