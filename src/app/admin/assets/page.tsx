"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Search, Download, Filter } from "lucide-react";

export default function ManageAssetsPage() {
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState<any[]>([]);
    const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [categories, setCategories] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        checkAdminAndFetch();
    }, []);

    useEffect(() => {
        let filtered = assets;

        if (searchTerm) {
            filtered = filtered.filter((asset) =>
                asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                asset.categories?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                asset.departments?.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (categoryFilter) {
            filtered = filtered.filter((asset) => asset.category_id === categoryFilter);
        }

        if (departmentFilter) {
            filtered = filtered.filter((asset) => asset.department_id === departmentFilter);
        }

        setFilteredAssets(filtered);
    }, [searchTerm, categoryFilter, departmentFilter, assets]);

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

        await fetchAssets();
    };

    const fetchAssets = async () => {
        const [assetsRes, catsRes, deptsRes] = await Promise.all([
            supabase
                .from("assets")
                .select("*, categories(name), departments(name), profiles(full_name)")
                .order("created_at", { ascending: false }),
            supabase.from("categories").select("*"),
            supabase.from("departments").select("*"),
        ]);

        if (assetsRes.data) {
            setAssets(assetsRes.data);
            setFilteredAssets(assetsRes.data);
        }
        if (catsRes.data) setCategories(catsRes.data);
        if (deptsRes.data) setDepartments(deptsRes.data);
        setLoading(false);
    };

    const handleDeleteAsset = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        try {
            const { error } = await supabase.from("assets").delete().eq("id", id);
            if (error) throw error;
            await fetchAssets();
        } catch (error: any) {
            alert("Error deleting asset: " + error.message);
        }
    };

    const exportToCSV = () => {
        const headers = ["Name", "Category", "Department", "Cost", "Date Purchased", "Created By"];
        const rows = filteredAssets.map((asset) => [
            asset.name,
            asset.categories?.name || "",
            asset.departments?.name || "",
            asset.cost,
            new Date(asset.date_purchased).toLocaleDateString(),
            asset.profiles?.full_name || "N/A",
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `assets-export-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const totalValue = filteredAssets.reduce((sum, asset) => sum + (Number(asset.cost) || 0), 0);

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" onClick={() => router.push("/admin")}>
                    <ArrowLeft className="mr-2" size={16} />
                    Back to Dashboard
                </Button>
                <h1 className="text-3xl font-bold">All Assets</h1>
            </div>

            {/* Filters and Export */}
            <div className="mb-6 space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <Input
                            placeholder="Search assets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="">All Categories</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="">All Departments</option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>
                    <Button onClick={exportToCSV} variant="outline">
                        <Download className="mr-2" size={16} />
                        Export CSV
                    </Button>
                </div>

                {/* Stats Bar */}
                <div className="flex gap-4 items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="flex-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Showing Assets</p>
                        <p className="text-2xl font-bold">{filteredAssets.length} of {assets.length}</p>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Value (Filtered)</p>
                        <p className="text-2xl font-bold text-green-600">${totalValue.toLocaleString()}</p>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Average Value</p>
                        <p className="text-2xl font-bold">
                            ${filteredAssets.length > 0 ? (totalValue / filteredAssets.length).toFixed(2) : '0.00'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-zinc-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Purchased</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-zinc-800 dark:divide-gray-700">
                        {filteredAssets.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                                    {searchTerm || categoryFilter || departmentFilter ? "No assets match your filters" : "No assets found"}
                                </td>
                            </tr>
                        ) : (
                            filteredAssets.map((asset) => (
                                <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-zinc-700">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{asset.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{asset.categories?.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{asset.departments?.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">${asset.cost}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {new Date(asset.date_purchased).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{asset.profiles?.full_name || "N/A"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteAsset(asset.id, asset.name)}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
