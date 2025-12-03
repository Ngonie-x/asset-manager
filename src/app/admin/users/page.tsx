"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Edit2 } from "lucide-react";

export default function ManageUsersPage() {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingRole, setEditingRole] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        full_name: "",
        role: "user",
        department_id: "",
    });
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        checkAdminAndFetch();
    }, []);

    const checkAdminAndFetch = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push("/login");
            return;
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            router.push("/dashboard");
            return;
        }

        await fetchData();
    };

    const fetchData = async () => {
        const [usersRes, deptsRes] = await Promise.all([
            supabase.from("profiles").select("*, departments(name)"),
            supabase.from("departments").select("*"),
        ]);

        if (usersRes.data) setUsers(usersRes.data);
        if (deptsRes.data) setDepartments(deptsRes.data);
        setLoading(false);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Note: In production, you'd want to use Supabase Admin API or a server action
            // For now, users can sign up and admins can update their role
            const { error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.full_name,
                    },
                },
            });

            if (error) throw error;

            alert("User created! They need to verify their email. You can then update their role below.");
            setShowCreateForm(false);
            setFormData({ email: "", password: "", full_name: "", role: "user", department_id: "" });
            await fetchData();
        } catch (error: any) {
            alert("Error creating user: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRole = async (userId: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ role: newRole })
                .eq("id", userId);

            if (error) throw error;

            setEditingRole(null);
            await fetchData();
            alert("User role updated successfully!");
        } catch (error: any) {
            alert("Error updating role: " + error.message);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" onClick={() => router.push("/admin")}>
                    <ArrowLeft className="mr-2" size={16} />
                    Back to Dashboard
                </Button>
                <h1 className="text-3xl font-bold">User Management</h1>
            </div>

            <div className="mb-6">
                <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                    {showCreateForm ? "Cancel" : "Create New User"}
                </Button>
            </div>

            {showCreateForm && (
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 mb-6 shadow">
                    <h2 className="text-xl font-semibold mb-4">Create New User</h2>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                minLength={6}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="full_name">Full Name</Label>
                            <Input
                                id="full_name"
                                required
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="department">Department</Label>
                            <select
                                id="department"
                                value={formData.department_id}
                                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Select a department</option>
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create User"}
                        </Button>
                    </form>
                </div>
            )}

            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-zinc-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-zinc-800 dark:divide-gray-700">
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{user.full_name || "N/A"}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {editingRole === user.id ? (
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                            onBlur={() => setEditingRole(null)}
                                            className="px-2 py-1 rounded border border-input bg-background text-sm"
                                            autoFocus
                                        >
                                            <option value="user">user</option>
                                            <option value="admin">admin</option>
                                        </select>
                                    ) : (
                                        <span className={`px-2 py-1 rounded ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {user.role}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">{user.departments?.name || "N/A"}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEditingRole(user.id)}
                                        title="Change role"
                                    >
                                        <Edit2 size={14} />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
