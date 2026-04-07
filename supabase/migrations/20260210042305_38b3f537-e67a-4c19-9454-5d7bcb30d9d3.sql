-- Drop existing FK constraints and re-add with CASCADE
ALTER TABLE optics_entries DROP CONSTRAINT optics_entries_product_id_fkey;
ALTER TABLE optics_entries ADD CONSTRAINT optics_entries_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES optics_products(id) ON DELETE CASCADE;

ALTER TABLE optics_outputs DROP CONSTRAINT optics_outputs_product_id_fkey;
ALTER TABLE optics_outputs ADD CONSTRAINT optics_outputs_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES optics_products(id) ON DELETE CASCADE;

ALTER TABLE optics_inventory_movements DROP CONSTRAINT optics_inventory_movements_product_id_fkey;
ALTER TABLE optics_inventory_movements ADD CONSTRAINT optics_inventory_movements_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES optics_products(id) ON DELETE CASCADE;