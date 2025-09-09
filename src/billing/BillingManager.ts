import { Capacitor } from '@capacitor/core';
import {
  Purchases,
  LOG_LEVEL,
  PurchasesPackage,
} from '@revenuecat/purchases-capacitor';
import { SubscriptionTier } from './AdsManager';

const PLUS_ENTITLEMENT_ID = 'plus_plan'; // Matches the Entitlement ID in RevenueCat
const PREMIUM_ENTITLEMENT_ID = 'premium_plan'; // Matches the Entitlement ID in RevenueCat

class BillingManager {
  private static isAvailable = false;

  /**
   * Initializes the BillingManager. For Capacitor, the main configuration
   * is done in the native code (MainActivity.java/AppDelegate.swift).
   * This method sets up listeners.
   */
  static async init(onPurchaseUpdate: () => void) {
    if (!Capacitor.isNativePlatform()) {
      console.log('BillingManager: Not a native platform. Using localStorage fallback.');
      this.isAvailable = false;
      return;
    }

    try {
      // For testing, generate a unique anonymous ID for the user
      let appUserID = localStorage.getItem('budgetwise_user_id');
      if (!appUserID) {
        appUserID = `budgetwise_anon_${Date.now()}`;
        localStorage.setItem('budgetwise_user_id', appUserID);
      }

      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      
      // Log in with the user ID
      await Purchases.logIn({ appUserID });

      // Add a listener for when customer info updates
      await Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        console.log('Customer info updated, refreshing tier.', customerInfo);
        onPurchaseUpdate();
      });

      this.isAvailable = true;
      console.log('✅ RevenueCat SDK setup complete.');
    } catch (e) {
      console.warn('⚠️ RevenueCat not available, using localStorage for billing.', e);
      this.isAvailable = false;
    }
  }

  /**
   * Checks the user's current subscription tier.
   * Falls back to localStorage if RevenueCat is not available.
   */
  static async checkUserTier(): Promise<SubscriptionTier> {
    if (this.isAvailable) {
      try {
        const { customerInfo } = await Purchases.getCustomerInfo();
        if (customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]) return 'premium';
        if (customerInfo.entitlements.active[PLUS_ENTITLEMENT_ID]) return 'plus';
        return 'free';
      } catch (e) {
        console.error('RevenueCat check failed, falling back to localStorage', e);
      }
    }
    return (localStorage.getItem('budgetwise_tier') as SubscriptionTier) || 'free';
  }

  /**
   * Initiates a purchase for a given product SKU.
   * Falls back to localStorage for local/dev testing.
   */
  static async buy(sku: 'plus' | 'premium') {
    if (this.isAvailable) {
      const offerings = await Purchases.getOfferings();
      if (!offerings.current) throw new Error('No offerings available');
      
      // Find the package associated with the desired entitlement.
      // This is more robust than finding by SKU/identifier.
      const pkg = offerings.current.availablePackages.find(
        (p: PurchasesPackage) => p.product.identifier.includes(sku)
      );

      if (!pkg) throw new Error(`Package for '${sku}' not found in current offering.`);
      
      await Purchases.purchasePackage({ aPackage: pkg });
    } else {
      localStorage.setItem('budgetwise_tier', sku);
      window.location.reload(); // Reload to apply changes in dev
    }
  }
}

export default BillingManager;