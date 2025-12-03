"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Plus } from "lucide-react";

export default function ManageCategoriesPage() {
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [showDepartmentForm, setShowDepartmentForm] = useState(false);
    const [categoryName, setCategoryName] = useState("");
    const [departmentName, setDepartmentName] = useState("");
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
        const [catsRes, deptsRes] = await Promise.all([
            supabase.from("categories").select("*").order("name"),
            supabase.from("departments").select("*").order("name"),
        ]);

        if (catsRes.data) setCategories(catsRes.data);
        if (deptsRes.data) setDepartments(deptsRes.data);
        setLoading(false);
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.from("categories").insert({ name: categoryName });
            if (error) throw error;

            setCategoryName("");
            setShowCategoryForm(false);
            await fetchData();
        } catch (error: any) {
            alert("Error creating category: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.from("departments").insert({ name: departmentName });
            if (error) throw error;

            setDepartmentName("");
            setShowDepartmentForm(false);
            await fetchData();
        } catch (error: any) {
            alert("Error creating department: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("Are you sure you want to delete this category?")) return;

        try {
            const { error } = await supabase.from("categories").delete().eq("id", id);
            if (error) throw error;
            await fetchData();
        } catch (error: any) {
            alert("Error deleting category: " + error.message);
        }
    };

    const handleDeleteDepartment = async (id: string) => {
        if (!confirm("Are you sure you want to delete this department?")) return;

        try {
            const { error } = await supabase.from("departments").delete().eq("id", id);
            if (error) throw error;
            await fetchData();
        } catch (error: any) {
            alert("Error deleting department: " + error.message);
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
                <h1 className="text-3xl font-bold">Categories & Departments</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Categories Section */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold">Categories</h2>
                        <Button onClick={() => setShowCategoryForm(!showCategoryForm)} size="sm">
                            <Plus size={16} className="mr-2" />
                            Add Category
                        </Button>
                    </div>

                    {showCategoryForm && (
                        <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 mb-4 shadow">
                            <form onSubmit={handleCreateCategory} className="space-y-3">
                                <div>
                                    <Label htmlFor="category-name">Category Name</Label>
                                    <Input
                                        id="category-name"
                                        required
                                        value={categoryName}
                                        onChange={(e) => setCategoryName(e.target.value)}
                                    />
                                </div>
                                <Button type="submit" disabled={loading} size="sm">
                                    Create
                                </Button>
                            </form>
                        </div>
                    )}

                    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow">
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {categories.map((cat) => (
                                <li key={cat.id} className="px-4 py-3 flex justify-between items-center">
                                    <span>{cat.name}</span>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteCategory(cat.id)}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </li>
                            ))}
                            {categories.length === 0 && (
                                <li className="px-4 py-3 text-center text-gray-500">No categories yet</li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Departments Section */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold">Departments</h2>
                        <Button onClick={() => setShowDepartmentForm(!showDepartmentForm)} size="sm">
                            <Plus size={16} className="mr-2" />
                            Add Department
                        </Button>
                    </div>

                    {showDepartmentForm && (
                        <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 mb-4 shadow">
                            <form onSubmit={handleCreateDepartment} className="space-y-3">
                                <div>
                                    <Label htmlFor="department-name">Department Name</Label>
                                    <Input
                                        id="department-name"
                                        required
                                        value={departmentName}
                                        onChange={(e) => setDepartmentName(e.target.value)}
                                    />
                                </div>
                                <Button type="submit" disabled={loading} size="sm">
                                    Create
                                </Button>
                            </form>
                        </div>
                    )}

                    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow">
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {departments.map((dept) => (
                                <li key={dept.id} className="px-4 py-3 flex justify-between items-center">
                                    <span>{dept.name}</span>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteDepartment(dept.id)}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </li>
                            ))}
                            {departments.length === 0 && (
                                <li className="px-4 py-3 text-center text-gray-500">No departments yet</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
