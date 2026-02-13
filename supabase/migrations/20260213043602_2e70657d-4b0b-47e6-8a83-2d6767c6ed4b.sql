
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Public can read influencer by term_token" ON public.influencer_partnerships;

-- Drop the overly permissive UPDATE policy  
DROP POLICY IF EXISTS "Public can accept term via token" ON public.influencer_partnerships;

-- Create a secure RPC to fetch influencer by term_token (returns only needed fields)
CREATE OR REPLACE FUNCTION public.get_influencer_by_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'id', id,
    'name', name,
    'commission_percent', commission_percent,
    'referral_code', referral_code,
    'term_accepted_at', term_accepted_at,
    'term_version', term_version,
    'status', status
  ) INTO v_result
  FROM public.influencer_partnerships
  WHERE term_token::text = p_token
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- Grant execute to anon and authenticated (public page needs anon access)
GRANT EXECUTE ON FUNCTION public.get_influencer_by_token(text) TO anon, authenticated;

-- Create a secure RPC to accept the term
CREATE OR REPLACE FUNCTION public.accept_influencer_term(p_token text, p_version text DEFAULT '1.0')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.influencer_partnerships
  SET term_accepted_at = now(),
      term_version = p_version,
      updated_at = now()
  WHERE term_token::text = p_token
    AND term_accepted_at IS NULL;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_influencer_term(text, text) TO anon, authenticated;

-- Re-create proper SELECT policy: only super_admins can read all records
CREATE POLICY "Super admins can read all influencer partnerships"
ON public.influencer_partnerships
FOR SELECT
USING (public.is_super_admin());

-- Re-create proper UPDATE policy: only super_admins can update
CREATE POLICY "Super admins can update influencer partnerships"
ON public.influencer_partnerships
FOR UPDATE
USING (public.is_super_admin());
