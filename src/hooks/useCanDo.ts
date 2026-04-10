import { usePermissions } from "@/hooks/usePermissions";

/**
 * Convenience hook that returns a `canDo(key)` function.
 * Admins always return true; regular users need an explicit permission grant.
 */
export function useCanDo() {
  const { hasPermission, loading } = usePermissions();
  return { canDo: hasPermission, permLoading: loading };
}
