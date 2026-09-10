import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"] extends { app_role: infer R } ? R : string;

export interface CurrentUserData {
  id: string;
  email: string | null;
  fullName: string | null;
  roles: string[];
  isStaff: boolean;
  isAdmin: boolean;
}

export function useCurrentUser() {
  return useQuery<CurrentUserData | null>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) return null;

      const [{ data: profile }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      const roles = (roleRows ?? []).map((r) => r.role as string);
      const staffRoles = ["super_admin", "admin", "department_head", "municipal_officer", "engineer", "contractor"];
      return {
        id: user.id,
        email: user.email ?? null,
        fullName: profile?.full_name ?? user.email ?? null,
        roles,
        isStaff: roles.some((r) => staffRoles.includes(r)),
        isAdmin: roles.includes("admin") || roles.includes("super_admin"),
      };
    },
    staleTime: 60_000,
  });
}
