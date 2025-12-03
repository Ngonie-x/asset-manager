"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface CreateAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateAssetModal({ isOpen, onClose, onSuccess }: CreateAssetModalProps) {
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        category_id: "",
        department_id: "",
        cost: "",
        date_purchased: "",
    });
    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            fetchOptions();
        }
    }, [isOpen]);

    const fetchOptions = async () => {
        const [{ data: cats }, { data: depts }] = await Promise.all([
            supabase.from("categories").select("*"),
            supabase.from("departments").select("*"),
        ]);
        if (cats) setCategories(cats);
        if (depts) setDepartments(depts);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("You must be logged in to create an asset");
                setLoading(false);
                return;
            }

            // Convert empty strings to null for UUID fields
            const insertData = {
                name: formData.name,
                category_id: formData.category_id || null,
                department_id: formData.department_id || null,
                cost: parseFloat(formData.cost),
                date_purchased: formData.date_purchased || null,
                created_by: user.id,
            };

            const { error, data } = await supabase.from("assets").insert(insertData);

            if (error) {
                console.error("Error creating asset:", {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                });
                alert(`Failed to create asset: ${error.message || "Unknown error"}`);
                return;
            }

            setFormData({ name: "", category_id: "", department_id: "", cost: "", date_purchased: "" });
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error creating asset:", {
                message: error?.message || String(error),
                error: error,
            });
            alert(`Failed to create asset: ${error?.message || "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Create New Asset</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Asset Name</Label>
                        <Input
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <Label htmlFor="category">Category</Label>
                        <select
                            id="category"
                            required
                            value={formData.category_id}
                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                            <option value="">Select a category</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <Label htmlFor="department">Department</Label>
                        <select
                            id="department"
                            required
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

                    <div>
                        <Label htmlFor="cost">Cost ($)</Label>
                        <Input
                            id="cost"
                            type="number"
                            step="0.01"
                            required
                            value={formData.cost}
                            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                        />
                    </div>

                    <div>
                        <Label htmlFor="date">Date Purchased</Label>
                        <Input
                            id="date"
                            type="date"
                            required
                            value={formData.date_purchased}
                            onChange={(e) => setFormData({ ...formData, date_purchased: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button type="submit" disabled={loading} className="flex-1">
                            {loading ? "Creating..." : "Create Asset"}
                        </Button>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
