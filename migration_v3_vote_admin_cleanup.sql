-- Очистка голосов из админки: обходит RLS через SECURITY DEFINER.
-- Выполните в SQL Editor Supabase после деплоя бэкенда.

CREATE OR REPLACE FUNCTION public.admin_delete_votes_for_post(target_post_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  DELETE FROM public.votes WHERE post_id = target_post_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_all_votes()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  DELETE FROM public.votes;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_votes_for_post(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_delete_all_votes() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_delete_votes_for_post(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_all_votes() TO service_role;
