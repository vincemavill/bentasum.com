import { ProfileTemplate } from '@/types/profile';

export const STORAGE_KEY_PROFILES = 'bentasum_profiles_v2';
export const STORAGE_KEY_ACTIVE_PROFILE = 'bentasum_active_profile_id_v2';

export const DEFAULT_PROFILES: ProfileTemplate[] = [
  {
    id: 'preset-shopee',
    name: 'Shopee Income & Orders',
    isDefault: true,
    selectedColumns: [
      'Order ID',
      'Order Status',
      'Order Creation Date',
      'Product Name',
      'Variation Name',
      'Deal Price',
      'Quantity',
      'Product Subtotal',
      'Buyer Paid Shipping Fee',
      'Service Fee',
      'Grand Total',
    ],
    sumColumns: [
      'Product Subtotal',
      'Buyer Paid Shipping Fee',
      'Service Fee',
      'Grand Total',
    ],
    orderIdColumn: 'Order ID',
  },
  {
    id: 'preset-lazada',
    name: 'Lazada Orders & Statement',
    isDefault: true,
    selectedColumns: [
      'orderNumber',
      'orderItemId',
      'createTime',
      'status',
      'itemName',
      'sellerSku',
      'unitPrice',
      'paidPrice',
      'shippingFee',
      'shippingCity',
    ],
    sumColumns: [
      'unitPrice',
      'paidPrice',
      'shippingFee',
    ],
    orderIdColumn: 'orderNumber',
  },
  {
    id: 'preset-tiktok',
    name: 'TikTok Shop Settlement',
    isDefault: true,
    selectedColumns: [
      'Order ID',
      'Created Time',
      'Order Status',
      'Product Name',
      'Seller SKU',
      'Quantity',
      'SKU Subtotal Before Discount',
      'SKU Platform Discount',
      'SKU Seller Discount',
      'SKU Subtotal After Discount',
      'Order Amount',
    ],
    sumColumns: [
      'SKU Subtotal Before Discount',
      'SKU Subtotal After Discount',
      'Order Amount',
    ],
    orderIdColumn: 'Order ID',
  },
];

export function getStoredProfiles(): ProfileTemplate[] {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILES;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(DEFAULT_PROFILES));
      return DEFAULT_PROFILES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Error reading profiles from localStorage:', err);
  }
  return DEFAULT_PROFILES;
}

export function saveProfilesToStorage(profiles: ProfileTemplate[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch (err) {
    console.error('Error saving profiles to localStorage:', err);
  }
}

export function saveOrUpdateProfile(profile: ProfileTemplate): ProfileTemplate[] {
  const current = getStoredProfiles();
  const index = current.findIndex((p) => p.id === profile.id);
  let updated: ProfileTemplate[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = profile;
  } else {
    updated = [...current, profile];
  }
  saveProfilesToStorage(updated);
  return updated;
}

export function deleteCustomProfile(id: string): ProfileTemplate[] {
  const current = getStoredProfiles();
  const filtered = current.filter((p) => p.id !== id || p.isDefault);
  saveProfilesToStorage(filtered);
  return filtered;
}

export function resetProfilesToDefault(): ProfileTemplate[] {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(DEFAULT_PROFILES));
  }
  return DEFAULT_PROFILES;
}

export function getActiveProfileId(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILES[0].id;
  }
  return localStorage.getItem(STORAGE_KEY_ACTIVE_PROFILE) || DEFAULT_PROFILES[0].id;
}

export function setActiveProfileId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ACTIVE_PROFILE, id);
}
