"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { CreateAssetModal } from "@/components/CreateAssetModal";
import { RegisterWarrantyButton } from "@/components/RegisterWarrantyButton";
import { batchCheckWarrantyStatus } from "@/services/warrantyService";
import { LogOut, Download, Search, DollarSign, Package, TrendingUp } from "lucide-react";

export default function UserDashboard() {
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState<any[]>([]);
    const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [categories, setCategories] = useState<any[]>([]);
    const [warrantyStatuses, setWarrantyStatuses] = useState<Record<string, any>>({});
    const [loadingWarranty, setLoadingWarranty] = useState(false);
    const [currentUser, setCurrentUser] = useState<{ id: string; full_name?: string; name?: string } | null>(null);
    const router = useRouter();

    const fetchAssets = async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push("/login");
            return;
        }

        // Get user profile for warranty registration
        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();

        setCurrentUser({
            id: user.id,
            full_name: profile?.full_name,
        });

        const [assetsRes, catsRes] = await Promise.all([
            supabase
                .from("assets")
                .select("*, categories(name), departments(name), profiles!assets_created_by_fkey(full_name)")
                .eq("created_by", user.id)
                .order("created_at", { ascending: false }),
            supabase.from("categories").select("*"),
        ]);

        if (assetsRes.data) {
            setAssets(assetsRes.data);
            setFilteredAssets(assetsRes.data);
            // Fetch warranty statuses for all assets
            fetchWarrantyStatuses(assetsRes.data);
        }
        if (catsRes.data) setCategories(catsRes.data);
        setLoading(false);
    };

    const fetchWarrantyStatuses = async (assetList: any[]) => {
        if (assetList.length === 0) return;
        
        setLoadingWarranty(true);
        try {
            const assetIds = assetList.map(a => a.id);
            const statuses = await batchCheckWarrantyStatus(assetIds);
            setWarrantyStatuses(statuses);
        } catch (error) {
            console.error("Error fetching warranty statuses:", error);
        } finally {
            setLoadingWarranty(false);
        }
    };

    const handleWarrantyRegistered = (result: any) => {
        // Update warranty status for the asset
        if (result.asset_id || result.warranty_id) {
            const assetId = result.asset_id || filteredAssets.find(a => a.id === result.asset_id)?.id;
            if (assetId) {
                setWarrantyStatuses(prev => ({
                    ...prev,
                    [assetId]: {
                        is_registered: true,
                        status: result.status,
                        status_label: result.status_label,
                        warranty_id: result.warranty_id,
                        warranty_start_date: result.warranty_start_date,
                        warranty_end_date: result.warranty_end_date,
                        registered_at: result.registered_at,
                    },
                }));
            }
        }
        // Refresh warranty statuses
        fetchWarrantyStatuses(filteredAssets);
    };

    const getWarrantyBadge = (assetId: string | number) => {
        if (loadingWarranty) {
            return <span className="text-gray-400 dark:text-gray-500 text-xs">Loading...</span>;
        }
        
        const status = warrantyStatuses[assetId];
        if (!status || !status.is_registered) {
            return (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
                    Not Registered
                </span>
            );
        }
        
        if (status.status === 'expired') {
            return (
                <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded text-xs">
                    Expired
                </span>
            );
        }
        
        if (status.days_until_expiry !== undefined && status.days_until_expiry <= 30) {
            return (
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 rounded text-xs">
                    Expiring Soon ({status.days_until_expiry} days)
                </span>
            );
        }
        
        return (
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded text-xs">
                Registered
            </span>
        );
    };

    useEffect(() => {
        fetchAssets();
    }, [router]);

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

        setFilteredAssets(filtered);
    }, [searchTerm, categoryFilter, assets]);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
    };

    const exportToCSV = () => {
        const headers = ["Name", "Category", "Department", "Cost", "Date Purchased"];
        const rows = filteredAssets.map((asset) => [
            asset.name,
            asset.categories?.name || "",
            asset.departments?.name || "",
            asset.cost,
            new Date(asset.date_purchased).toLocaleDateString(),
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `my-assets-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const totalValue = filteredAssets.reduce((sum, asset) => sum + (Number(asset.cost) || 0), 0);
    const averageValue = filteredAssets.length > 0 ? totalValue / filteredAssets.length : 0;

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <>
            <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">My Assets</h1>
                        <p className="text-gray-600 dark:text-gray-300 mt-1">Manage and track your assets</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => setIsModalOpen(true)}>
                            <Package className="mr-2" size={16} />
                            Create New Asset
                        </Button>
                        <Button variant="outline" onClick={handleLogout}>
                            <LogOut className="mr-2" size={16} />
                            Logout
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Total Assets</p>
                                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{assets.length}</p>
                            </div>
                            <Package className="text-blue-500" size={32} />
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-6 shadow text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-100">Total Value</p>
                                <p className="text-3xl font-bold mt-1">${totalValue.toLocaleString()}</p>
                            </div>
                            <DollarSign size={32} />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Average Value</p>
                                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">${averageValue.toFixed(2)}</p>
                            </div>
                            <TrendingUp className="text-purple-500" size={32} />
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6 flex items-center gap-4 flex-wrap">
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
                    <Button onClick={exportToCSV} variant="outline">
                        <Download className="mr-2" size={16} />
                        Export CSV
                    </Button>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                        Showing {filteredAssets.length} of {assets.length} assets
                    </div>
                </div>

                {/* Assets Table */}
                <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-zinc-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Cost</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date Purchased</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Warranty Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-zinc-800 dark:divide-gray-700">
                            {filteredAssets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                                        {searchTerm || categoryFilter ? "No assets match your filters" : "No assets found. Create one!"}
                                    </td>
                                </tr>
                            ) : (
                                filteredAssets.map((asset) => {
                                    const warrantyStatus = warrantyStatuses[asset.id];
                                    const isWarrantyRegistered = warrantyStatus?.is_registered;
                                    
                                    return (
                                        <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-zinc-700">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{asset.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs">
                                                    {asset.categories?.name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                                                    {asset.departments?.name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">${asset.cost}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{new Date(asset.date_purchased).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {getWarrantyBadge(asset.id)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {currentUser && !isWarrantyRegistered && (
                                                    <RegisterWarrantyButton
                                                        asset={asset}
                                                        currentUser={currentUser}
                                                        onSuccess={handleWarrantyRegistered}
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateAssetModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchAssets}
            />
        </>
    );
}
