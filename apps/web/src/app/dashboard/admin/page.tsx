import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminPanel } from "./admin-panel";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch data for admin panel
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: false });

  const { count: totalRecordings } = await supabase
    .from("recordings")
    .select("id", { count: "exact", head: true });

  return (
    <AdminPanel
      users={users || []}
      totalUsers={users?.length || 0}
      totalRecordings={totalRecordings || 0}
    />
  );
}
