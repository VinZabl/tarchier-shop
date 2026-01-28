-- Add icon_url column to payment_methods for payment icon displayed on customer checkout
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_methods' AND column_name = 'icon_url'
  ) THEN
    ALTER TABLE payment_methods ADD COLUMN icon_url text;
  END IF;
END $$;
