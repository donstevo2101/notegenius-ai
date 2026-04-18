"use client";

import { useState } from "react";
import { Users, FileAudio, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

interface UserRow {
  id: string;
  full_name: string | null;
  email: string;
  role: string | null;
  created_at: string;
}

interface AdminPanelProps {
  users: UserRow[];
  totalUsers: number;
  totalRecordings: number;
}

export function AdminPanel({
  users: initialUsers,
  totalUsers,
  totalRecordings,
}: AdminPanelProps) {
  const [users, setUsers] = useState(initialUsers);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const supabase = createClient();

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (!error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    }
    setUpdatingId(null);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage users and view platform metrics
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Total Users</CardDescription>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Users className="h-5 w-5 text-blue-500" />
                  {totalUsers}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total Recordings</CardDescription>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <FileAudio className="h-5 w-5 text-blue-500" />
                  {totalRecordings}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Admin Users</CardDescription>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  {users.filter((u) => u.role === "admin").length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Note
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                User and recording counts reflect data accessible via RLS
                policies. Full platform metrics require server-side queries with
                a service role client.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Manage user accounts and roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">
                        Name
                      </th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">
                        Email
                      </th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">
                        Role
                      </th>
                      <th className="pb-2 pr-4 font-medium text-muted-foreground">
                        Joined
                      </th>
                      <th className="pb-2 font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          {user.full_name || "—"}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {user.email}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={
                              user.role === "admin" ? "default" : "secondary"
                            }
                            className="capitalize"
                          >
                            {user.role || "user"}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </td>
                        <td className="py-3">
                          <select
                            value={user.role || "user"}
                            onChange={(e) =>
                              handleRoleChange(user.id, e.target.value)
                            }
                            disabled={updatingId === user.id}
                            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
