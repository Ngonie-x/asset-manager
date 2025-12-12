"use client";

import { useState } from "react";
import { registerWarranty } from "@/services/warrantyService";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface RegisterWarrantyButtonProps {
    asset: any;
    currentUser: { id: string; full_name?: string; name?: string };
    onSuccess: (result: any) => void;
}

export function RegisterWarrantyButton({ asset, currentUser, onSuccess }: RegisterWarrantyButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [warrantyMonths, setWarrantyMonths] = useState(12);

    const handleRegister = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await registerWarranty(asset, currentUser, {
                warrantyDurationMonths: warrantyMonths,
            });

            if (result.success) {
                setIsOpen(false);
                onSuccess(result);
            } else {
                // Handle already registered case
                if (result.status === 'registered' && result.warranty_id) {
                    setIsOpen(false);
                    onSuccess(result);
                } else {
                    setError(result.message || result.error || 'Failed to register warranty');
                }
            }
        } catch (err: any) {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
            >
                Register Warranty
            </Button>

            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Register Warranty</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                disabled={isLoading}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="space-y-3 mb-4">
                            <div>
                                <span className="text-gray-600 dark:text-gray-300">Asset:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white">{asset.name}</span>
                            </div>
                            <div>
                                <span className="text-gray-600 dark:text-gray-300">Category:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">
                                    {asset.categories?.name || asset.category?.name || asset.category || asset.categories || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600 dark:text-gray-300">Department:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">
                                    {asset.departments?.name || asset.department?.name || asset.department || asset.departments || 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600 dark:text-gray-300">Purchase Date:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">
                                    {asset.date_purchased ? new Date(asset.date_purchased).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600 dark:text-gray-300">Cost:</span>
                                <span className="ml-2 text-gray-900 dark:text-white">${asset.cost}</span>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-600 dark:text-gray-300 mb-1">Warranty Duration</label>
                            <select
                                value={warrantyMonths}
                                onChange={(e) => setWarrantyMonths(parseInt(e.target.value))}
                                className="w-full border rounded p-2 bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                                disabled={isLoading}
                            >
                                <option value={6}>6 months</option>
                                <option value={12}>12 months (1 year)</option>
                                <option value={24}>24 months (2 years)</option>
                                <option value={36}>36 months (3 years)</option>
                                <option value={60}>60 months (5 years)</option>
                            </select>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end space-x-3">
                            <Button
                                onClick={() => setIsOpen(false)}
                                variant="outline"
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleRegister}
                                disabled={isLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {isLoading ? 'Registering...' : 'Register Warranty'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

