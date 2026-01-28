-- Allow admin dashboard (public/anon) to add, update, delete admin payment groups and payment methods.
-- If RLS is enabled on admin_payment_groups but no policy existed, all operations would fail.

-- Ensure admin_payment_groups allows full access for admin UI (same as payment_methods)
ALTER TABLE admin_payment_groups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_payment_groups'
      AND policyname = 'Public can manage admin payment groups'
  ) THEN
    CREATE POLICY "Public can manage admin payment groups"
    ON admin_payment_groups
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;
