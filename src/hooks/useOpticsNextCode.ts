import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OpticsProductCodeConfig {
  prefix: string;
  padding: number;
  startFrom: number;
}

const DEFAULT_CODE_CONFIG: OpticsProductCodeConfig = {
  prefix: "OP",
  padding: 6,
  startFrom: 0,
};

export function getOpticsCodeConfig(): OpticsProductCodeConfig {
  try {
    const savedConfig = localStorage.getItem("optics_config");
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      return {
        prefix: parsed.productCodePrefix ?? DEFAULT_CODE_CONFIG.prefix,
        padding: parsed.productCodePadding ?? DEFAULT_CODE_CONFIG.padding,
        startFrom: parsed.productCodeStartFrom ?? DEFAULT_CODE_CONFIG.startFrom,
      };
    }
  } catch (error) {
    console.error("Error reading optics code config:", error);
  }
  return DEFAULT_CODE_CONFIG;
}

export function useNextOpticsCode() {
  return useQuery({
    queryKey: ["next-optics-code"],
    queryFn: async () => {
      const config = getOpticsCodeConfig();
      const { prefix, padding, startFrom } = config;

      // Build regex pattern for the configured prefix
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = `^${escapedPrefix}[0-9]+$`;

      const { data, error } = await supabase
        .from("optics_products")
        .select("codigo")
        .not("codigo", "is", null);

      if (error) throw error;

      // Find maximum numeric value from all codes matching the pattern
      const regex = new RegExp(pattern);
      let maxCode = startFrom;

      if (data && data.length > 0) {
        data.forEach((item) => {
          if (item.codigo && regex.test(item.codigo)) {
            const numericPart = item.codigo.substring(prefix.length);
            const numValue = parseInt(numericPart, 10);
            if (!isNaN(numValue) && numValue > maxCode) {
              maxCode = numValue;
            }
          }
        });
      }

      const nextNumber = maxCode + 1;
      const paddedNumber = nextNumber.toString().padStart(padding, "0");
      return `${prefix}${paddedNumber}`;
    },
  });
}
