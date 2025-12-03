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
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">All Assets</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">View and manage all assets in the system</p>
                </div>
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
                        className="flex h-10 rounded-md border border-input bg-white dark:bg-zinc-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
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
                        className="flex h-10 rounded-md border border-input bg-white dark:bg-zinc-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Showing Assets</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{filteredAssets.length} of {assets.length}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Total Value (Filtered)</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">${totalValue.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Average Value</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            ${filteredAssets.length > 0 ? (totalValue / filteredAssets.length).toFixed(2) : '0.00'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-zinc-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Department</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Cost</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date Purchased</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Created By</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-zinc-800 dark:divide-gray-700">
                        {filteredAssets.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center">
                                    <p className="text-gray-600 dark:text-gray-300 text-lg">
                                        {searchTerm || categoryFilter || departmentFilter ? "No assets match your filters" : "No assets found"}
                                    </p>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                                        {searchTerm || categoryFilter || departmentFilter 
                                            ? "Try adjusting your search or filters" 
                                            : "Assets will appear here once created"}
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            filteredAssets.map((asset) => (
                                <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-zinc-700">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{asset.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        {asset.categories?.name ? (
                                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs">
                                                {asset.categories.name}
                                            </span>
                                        ) : (
                                            <span className="text-gray-500 dark:text-gray-400">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        {asset.departments?.name ? (
                                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                                                {asset.departments.name}
                                            </span>
                                        ) : (
                                            <span className="text-gray-500 dark:text-gray-400">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">${asset.cost}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        {new Date(asset.date_purchased).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{asset.profiles?.full_name || "N/A"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteAsset(asset.id, asset.name)}
                                            className="hover:bg-red-600 dark:hover:bg-red-700"
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
