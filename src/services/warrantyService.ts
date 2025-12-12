const WARRANTY_API_URL = process.env.NEXT_PUBLIC_WARRANTY_API_URL || 'https://server1.eport.ws';

interface Asset {
    id: string | number;
    name: string;
    category?: { name: string } | string;
    category_id?: string;
    department?: { name: string } | string;
    department_id?: string;
    cost: number | string;
    date_purchased: string;
    created_by?: string | { name?: string; full_name?: string } | any;
    created_at: string;
    serial_number?: string;
    serialNumber?: string;
    manufacturer?: string;
    model_number?: string;
    modelNumber?: string;
    profiles?: { full_name?: string; name?: string } | any;
}

interface CurrentUser {
    id: string;
    name?: string;
    full_name?: string;
    firstName?: string;
    lastName?: string;
}

interface WarrantyOptions {
    warrantyDurationMonths?: number;
}

interface WarrantyResponse {
    success: boolean;
    message?: string;
    status?: string;
    status_label?: string;
    warranty_id?: number;
    asset_id?: number;
    registered_at?: string;
    warranty_start_date?: string;
    warranty_end_date?: string;
    error?: string;
    details?: Record<string, string[]>;
}

interface WarrantyStatus {
    is_registered: boolean;
    status?: string;
    status_label?: string;
    warranty_id?: number;
    warranty_start_date?: string;
    warranty_end_date?: string;
    days_until_expiry?: number;
    registered_at?: string;
    registered_by?: string;
    message?: string;
    error?: boolean;
}

/**
 * Register a warranty for an asset
 * @param asset - The asset object from your database
 * @param currentUser - The logged-in user registering the warranty
 * @param options - Optional warranty details
 * @returns Promise with API response
 */
export async function registerWarranty(
    asset: Asset,
    currentUser: CurrentUser,
    options: WarrantyOptions = {}
): Promise<WarrantyResponse> {
    try {
        // Get category name
        const categoryName = typeof asset.category === 'object' 
            ? asset.category?.name 
            : asset.category || '';

        // Get department name
        const departmentName = typeof asset.department === 'object' 
            ? asset.department?.name 
            : asset.department || '';

        // Get created_by name
        let createdByName = '';
        if (asset.profiles) {
            // If profiles relation is loaded
            createdByName = asset.profiles.full_name || asset.profiles.name || '';
        } else if (typeof asset.created_by === 'object' && asset.created_by !== null) {
            createdByName = asset.created_by.name || asset.created_by.full_name || '';
        } else if (typeof asset.created_by === 'string') {
            createdByName = asset.created_by;
        }

        // Get current user name
        const currentUserName = currentUser.name || 
            currentUser.full_name || 
            (currentUser.firstName && currentUser.lastName 
                ? `${currentUser.firstName} ${currentUser.lastName}` 
                : 'User');

        const response = await fetch(`${WARRANTY_API_URL}/api/warranty/register/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                // Required fields from asset
                id: asset.id,
                name: asset.name,
                category: categoryName,
                department: departmentName,
                cost: parseFloat(String(asset.cost)),
                date_purchased: asset.date_purchased,
                created_by: createdByName,
                created_at: asset.created_at,
                
                // Current user registering
                registered_by_id: currentUser.id,
                registered_by_name: currentUserName,
                
                // Optional fields
                warranty_duration_months: options.warrantyDurationMonths || 12,
                serial_number: asset.serial_number || asset.serialNumber || null,
                manufacturer: asset.manufacturer || null,
                model_number: asset.model_number || asset.modelNumber || null,
            }),
        });

        const data = await response.json();
        return data;
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Network error occurred',
            message: 'Failed to register warranty. Please try again.',
        };
    }
}

/**
 * Check if an asset has a registered warranty
 * @param assetId - The asset ID
 * @returns Promise with warranty status
 */
export async function checkWarrantyStatus(assetId: string | number): Promise<WarrantyStatus> {
    try {
        const response = await fetch(`${WARRANTY_API_URL}/api/warranty/check/${assetId}/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return {
                is_registered: false,
                message: 'Failed to check warranty status',
                error: true,
            };
        }

        const data = await response.json();
        return data;
    } catch (error: any) {
        return {
            is_registered: false,
            message: 'Network error. Please try again.',
            error: true,
        };
    }
}

/**
 * Batch check warranty status for multiple assets
 * @param assetIds - Array of asset IDs
 * @returns Promise with map of assetId to warranty status
 */
export async function batchCheckWarrantyStatus(
    assetIds: (string | number)[]
): Promise<Record<string | number, WarrantyStatus>> {
    const results: Record<string | number, WarrantyStatus> = {};
    
    // Process in parallel with concurrency limit
    const batchSize = 10;
    for (let i = 0; i < assetIds.length; i += batchSize) {
        const batch = assetIds.slice(i, i + batchSize);
        const promises = batch.map(id => 
            checkWarrantyStatus(id)
                .then(status => ({ id, status }))
                .catch(() => ({ id, status: { is_registered: false, error: true } as WarrantyStatus }))
        );
        
        const batchResults = await Promise.all(promises);
        batchResults.forEach(({ id, status }) => {
            results[id] = status;
        });
    }
    
    return results;
}

