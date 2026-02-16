
-- Add term_token column to barbers
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS term_token UUID;

-- RPC: get barber by term token (public, security definer)
CREATE OR REPLACE FUNCTION public.get_barber_by_term_token(p_token UUID)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', b.id,
    'name', b.name,
    'email', b.email,
    'commission_rate', b.commission_rate,
    'company_id', b.company_id,
    'unit_name', u.name
  )
  FROM barbers b
  JOIN units u ON u.id = b.unit_id
  WHERE b.term_token = p_token
$$;

-- RPC: accept barber term (public, security definer)
CREATE OR REPLACE FUNCTION public.accept_barber_term(
  p_token UUID,
  p_term_id UUID,
  p_content_snapshot TEXT,
  p_commission_rate NUMERIC,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barber_id UUID;
BEGIN
  SELECT id INTO v_barber_id FROM barbers WHERE term_token = p_token;
  IF v_barber_id IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO term_acceptances (barber_id, term_id, user_id, content_snapshot, commission_rate_snapshot, ip_address, user_agent)
  VALUES (v_barber_id, p_term_id, '00000000-0000-0000-0000-000000000000', p_content_snapshot, p_commission_rate, p_ip, p_user_agent);

  UPDATE barbers SET term_token = NULL WHERE id = v_barber_id;
  RETURN TRUE;
END;
$$;

-- Allow anon to read active partnership_terms (needed for public acceptance page)
CREATE POLICY "Public can read active partnership terms"
ON public.partnership_terms
FOR SELECT
TO anon
USING (is_active = true);
