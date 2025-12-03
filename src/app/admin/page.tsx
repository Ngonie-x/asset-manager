"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Users, FolderTree, Package, LogOut, TrendingUp, DollarSign } from "lucide-react";

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [stats, setStats] = useState({
        users: 0,
        assets: 0,
        categories: 0,
        departments: 0,
        totalValue: 0,
        recentAssets: [] as any[]
    });
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
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
        } else {
            setIsAdmin(true);
            await fetchStats();
        }
        setLoading(false);
    };

    const fetchStats = async () => {
        const [usersRes, assetsRes, catsRes, deptsRes, valueRes, recentRes] = await Promise.all([
            supabase.from("profiles").select("id", { count: "exact", head: true }),
            supabase.from("assets").select("id", { count: "exact", head: true }),
            supabase.from("categories").select("id", { count: "exact", head: true }),
            supabase.from("departments").select("id", { count: "exact", head: true }),
            supabase.from("assets").select("cost"),
            supabase.from("assets").select("*, categories(name), departments(name)").order("created_at", { ascending: false }).limit(5),
        ]);

        const totalValue = valueRes.data?.reduce((sum, asset) => sum + (Number(asset.cost) || 0), 0) || 0;

        setStats({
            users: usersRes.count || 0,
            assets: assetsRes.count || 0,
            categories: catsRes.count || 0,
            departments: deptsRes.count || 0,
            totalValue,
            recentAssets: recentRes.data || [],
        });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
            <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                        <p className="text-gray-600 dark:text-gray-300 mt-1">Welcome back! Here's your overview.</p>
                    </div>
                    <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="mr-2" size={16} />
                        Logout
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Total Users</p>
                                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.users}</p>
                            </div>
                            <Users className="text-blue-500" size={32} />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Total Assets</p>
                                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.assets}</p>
                            </div>
                            <Package className="text-green-500" size={32} />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Categories</p>
                                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.categories}</p>
                            </div>
                            <FolderTree className="text-purple-500" size={32} />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Departments</p>
                                <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stats.departments}</p>
                            </div>
                            <FolderTree className="text-orange-500" size={32} />
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-6 shadow text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-100">Total Asset Value</p>
                                <p className="text-3xl font-bold mt-1">${stats.totalValue.toLocaleString()}</p>
                            </div>
                            <DollarSign size={32} />
                        </div>
                    </div>
                </div>

                {/* Recent Assets */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2 bg-white dark:bg-zinc-800 rounded-lg p-6 shadow">
                        <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
                            <TrendingUp className="mr-2" size={20} />
                            Recent Assets
                        </h2>
                        <div className="space-y-3">
                            {stats.recentAssets.length === 0 ? (
                                <p className="text-gray-600 dark:text-gray-300 text-center py-4">No assets yet</p>
                            ) : (
                                stats.recentAssets.map((asset) => (
                                    <div key={asset.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-zinc-900 rounded">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{asset.name}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">{asset.categories?.name} • {asset.departments?.name}</p>
                                        </div>
                                        <p className="font-semibold text-green-600 dark:text-green-400">${asset.cost}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow">
                        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Quick Stats</h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Average Asset Value</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    ${stats.assets > 0 ? (stats.totalValue / stats.assets).toFixed(2) : '0.00'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Assets per Department</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {stats.departments > 0 ? (stats.assets / stats.departments).toFixed(1) : '0'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Assets per Category</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {stats.categories > 0 ? (stats.assets / stats.categories).toFixed(1) : '0'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Management Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow hover:shadow-lg transition-shadow">
                        <Users className="text-blue-500 mb-4" size={40} />
                        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">User Management</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Create and manage system users. View all registered users and their roles.
                        </p>
                        <Button onClick={() => router.push("/admin/users")} className="w-full">
                            Manage Users
                        </Button>
                    </div>

                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow hover:shadow-lg transition-shadow">
                        <FolderTree className="text-purple-500 mb-4" size={40} />
                        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Categories & Departments</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Manage asset categories and organizational departments.
                        </p>
                        <Button onClick={() => router.push("/admin/categories")} className="w-full">
                            Manage Categories
                        </Button>
                    </div>

                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow hover:shadow-lg transition-shadow">
                        <Package className="text-green-500 mb-4" size={40} />
                        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">All Assets</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            View and delete any asset in the system. Search and filter assets.
                        </p>
                        <Button onClick={() => router.push("/admin/assets")} variant="destructive" className="w-full">
                            Manage Assets
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
