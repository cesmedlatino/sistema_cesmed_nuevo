-- Agregar columnas de configuración de fuente, papel e impresora a comprobante_config
ALTER TABLE public.comprobante_config
ADD COLUMN IF NOT EXISTS font_family TEXT NOT NULL DEFAULT 'Arial Rounded MT Bold, Arial, sans-serif',
ADD COLUMN IF NOT EXISTS paper_width NUMERIC NOT NULL DEFAULT 80,
ADD COLUMN IF NOT EXISTS paper_height NUMERIC NOT NULL DEFAULT 297,
ADD COLUMN IF NOT EXISTS margin_top NUMERIC NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS margin_bottom NUMERIC NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS margin_left NUMERIC NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS margin_right NUMERIC NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS default_printer TEXT NOT NULL DEFAULT '';

-- Comentarios para documentar las columnas
COMMENT ON COLUMN public.comprobante_config.font_family IS 'Tipo de fuente para el comprobante';
COMMENT ON COLUMN public.comprobante_config.paper_width IS 'Ancho del papel en milímetros';
COMMENT ON COLUMN public.comprobante_config.paper_height IS 'Alto del papel en milímetros';
COMMENT ON COLUMN public.comprobante_config.margin_top IS 'Margen superior en milímetros';
COMMENT ON COLUMN public.comprobante_config.margin_bottom IS 'Margen inferior en milímetros';
COMMENT ON COLUMN public.comprobante_config.margin_left IS 'Margen izquierdo en milímetros';
COMMENT ON COLUMN public.comprobante_config.margin_right IS 'Margen derecho en milímetros';
COMMENT ON COLUMN public.comprobante_config.default_printer IS 'Impresora por defecto seleccionada';