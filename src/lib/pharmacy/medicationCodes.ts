import { supabase } from "@/integrations/supabase/client";

/**
 * Supabase devuelve por defecto hasta 1000 filas; si hay más, hay que paginar.
 * Esta función calcula el siguiente código numérico para prefijos tipo "P123".
 */
export async function getNextPharmacyMedicationCode(
  prefix: string = "P",
  startFrom: number = 0,
  pageSize: number = 1000
): Promise<string> {
  let maxCode = startFrom;
  let from = 0;

  // Orden estable para paginación consistente.
  while (true) {
    const { data, error } = await supabase
      .from("pharmacy_medications")
      .select("codigo")
      .like("codigo", `${prefix}%`)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      const code = (row as { codigo: string | null }).codigo;
      if (!code || !code.startsWith(prefix)) continue;

      const numericPart = code.substring(prefix.length);
      const num = parseInt(numericPart, 10);
      if (!Number.isNaN(num) && num > maxCode) maxCode = num;
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return `${prefix}${maxCode + 1}`;
}
