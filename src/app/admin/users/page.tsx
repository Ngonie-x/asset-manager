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
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<{ role: string; department_id: string } | null>(null);
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
            supabase.from("profiles").select("*, departments(name)").order("created_at", { ascending: false }),
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

    const handleStartEdit = (user: any) => {
        setEditingUser(user.id);
        setEditFormData({
            role: user.role,
            department_id: user.department_id || "",
        });
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
        setEditFormData(null);
    };

    const handleSaveEdit = async (userId: string) => {
        if (!editFormData) return;

        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    role: editFormData.role,
                    department_id: editFormData.department_id || null,
                })
                .eq("id", userId);

            if (error) throw error;

            setEditingUser(null);
            setEditFormData(null);
            await fetchData();
            alert("User updated successfully!");
        } catch (error: any) {
            alert("Error updating user: " + error.message);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 p-8">
            <div className="text-center text-gray-600 dark:text-gray-300">Loading...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 p-8">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" onClick={() => router.push("/admin")}>
                    <ArrowLeft className="mr-2" size={16} />
                    Back to Dashboard
                </Button>
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">User Management</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">Create and manage system users</p>
                </div>
            </div>

            <div className="mb-6 flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    {users.length} {users.length === 1 ? 'user' : 'users'} total
                </div>
                <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                    {showCreateForm ? "Cancel" : "Create New User"}
                </Button>
            </div>

            {showCreateForm && (
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 mb-6 shadow">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create New User</h2>
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
                {users.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-gray-600 dark:text-gray-300 text-lg">No users found</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Create your first user to get started</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-zinc-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-zinc-800 dark:divide-gray-700">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-zinc-700">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.full_name || "N/A"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {editingUser === user.id && editFormData ? (
                                            <select
                                                value={editFormData.role}
                                                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                                                className="px-2 py-1 rounded border border-input bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                                                autoFocus
                                            >
                                                <option value="user">user</option>
                                                <option value="admin">admin</option>
                                            </select>
                                        ) : (
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                user.role === 'admin' 
                                                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' 
                                                    : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                            }`}>
                                                {user.role}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {editingUser === user.id && editFormData ? (
                                            <select
                                                value={editFormData.department_id || ""}
                                                onChange={(e) => setEditFormData({ ...editFormData, department_id: e.target.value })}
                                                className="px-2 py-1 rounded border border-input bg-white dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
                                            >
                                                <option value="">No Department</option>
                                                {departments.map((dept) => (
                                                    <option key={dept.id} value={dept.id}>
                                                        {dept.name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            user.departments?.name ? (
                                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                                                    {user.departments.name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-500 dark:text-gray-400">N/A</span>
                                            )
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {editingUser === user.id ? (
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => handleSaveEdit(user.id)}
                                                    className="hover:bg-green-600 dark:hover:bg-green-700"
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleCancelEdit}
                                                    className="hover:bg-gray-100 dark:hover:bg-gray-700"
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleStartEdit(user)}
                                                title="Edit user"
                                                className="hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <Edit2 size={14} />
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
