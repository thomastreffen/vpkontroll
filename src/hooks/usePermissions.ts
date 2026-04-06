import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PermissionState {
  permissions: Record<string, boolean>;
  loading: boolean;
  hasPermission: (key: string) => boolean;
  refetch: () => void;
}

/**
 * Permissions hook for tenant users.
 * Resolves permissions from role assignments + per-user overrides.
 * Master admins and tenant admins bypass permission checks.
 */
export function usePermissions(): PermissionState {
  const { user, isMasterAdmin, isTenantAdmin } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions({});
      setLoading(false);
      return;
    }

    // Master admin and tenant admin have all permissions
    if (isMasterAdmin || isTenantAdmin) {
      setPermissions({});
      setLoading(false);
      return;
    }

    try {
      // 1. Get role IDs for user
      const { data: assignments } = await supabase
        .from("tenant_user_role_assignments")
        .select("role_id")
        .eq("user_id", user.id);

      const roleIds = assignments?.map((a) => a.role_id) || [];

      // 2. Resolve permissions from roles
      let rolePerms: Record<string, boolean> = {};
      if (roleIds.length > 0) {
        const { data: rp } = await supabase
          .from("tenant_role_permissions")
          .select("permission_key, allowed")
          .in("role_id", roleIds);

        for (const p of rp || []) {
          if (p.allowed) {
            rolePerms[p.permission_key] = true;
          } else if (!rolePerms[p.permission_key]) {
            rolePerms[p.permission_key] = false;
          }
        }
      }

      // 3. Apply per-user overrides
      const { data: overrides } = await supabase
        .from("tenant_user_permission_overrides")
        .select("permission_key, allowed")
        .eq("user_id", user.id);

      const merged = { ...rolePerms };
      for (const o of overrides || []) {
        merged[o.permission_key] = o.allowed;
      }

      setPermissions(merged);
    } catch (err) {
      console.warn("[Permissions] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, isMasterAdmin, isTenantAdmin]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (key: string) => {
      // Admin roles bypass all checks
      if (isMasterAdmin || isTenantAdmin) return true;
      return permissions[key] === true;
    },
    [permissions, isMasterAdmin, isTenantAdmin]
  );

  return { permissions, loading, hasPermission, refetch: fetchPermissions };
}
