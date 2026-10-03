export type PropertyImage = { id: string; property_id: string; storage_path: string; alt: string; sort_order: number; url?: string };
export type Property = {
 id: string; property_name: string; slug: string; property_code: string; prefecture: string; city: string; city_slug: string | null; town: string | null; full_address: string | null;
 station: string | null; walking_minutes: number | null; rent: number; management_fee: number | null; deposit: number | null; key_money: number | null;
 layout: string | null; floor_area: number | null; built_at: string | null; structure: string | null; floor: string | null;
 garage_count: number | null; garage_width_mm: number | null; garage_depth_mm: number | null; garage_height_mm: number | null; entrance_width_mm: number | null; entrance_height_mm: number | null; garage_type: string | null;
 shutter: boolean | null; electric_shutter: boolean | null; ev_charger: boolean | null; motorcycle: boolean | null; large_vehicle: boolean | null; direct_access: boolean | null; pet: boolean | null; diy: boolean | null; soho: boolean | null; office_use: boolean | null;
 other_features: string | null; catch_copy: string | null; description: string | null;
 transaction_type: string | null; available_from: string | null; contract_period: string | null; insurance: string | null; guarantee: string | null; other_costs: string | null; renewal_fee: string | null; cancellation_terms: string | null; information_checked_at: string | null; next_update_at: string | null;
 status: 'draft'|'published'|'closed'; featured: boolean; created_at: string; updated_at: string; published_at: string | null;
 property_images: PropertyImage[];
};
export type Source = { property_id?: string; source_company?: string|null; management_company?: string|null; contact_name?: string|null; contact_phone?: string|null; contact_email?: string|null; original_url?: string|null; advertising_permission?: boolean; permission_confirmed_at?: string|null; last_availability_check?: string|null; ad_fee?: number|null; brokerage_terms?: string|null; internal_notes?: string|null };
export type Query = Record<string, string | string[] | undefined>;
