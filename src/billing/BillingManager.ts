
import { SubscriptionTier } from './AdsManager';

// ⚡ Replace these with your real product IDs from Google Play Console
export const PLUS_SKU = "plus_subscription";
export const PREMIUM_SKU = "premium_subscription";

declare const CdvPurchase: any; // global from cordova-plugin-purchase

class BillingManager {
  private static initialized = false;

  static async init(onPurchaseUpdate: () => void) {
    if (this.initialized) return;
    this.initialized = true;

    // Configure store
    CdvPurchase.store.verbosity = CdvPurchase.LogLevel.DEBUG;
    CdvPurchase.store.register([
      {
        id: PLUS_SKU,
        type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
      },
      {
        id: PREMIUM_SKU,
        type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
      },
    ]);

    // Event handlers
    CdvPurchase.store.when(PLUS_SKU).approved((p: any) => {
      p.finish().then(() => onPurchaseUpdate());
      console.log("✅ Plus subscription approved!");
    });

    CdvPurchase.store.when(PREMIUM_SKU).approved((p: any) => {
      p.finish().then(() => onPurchaseUpdate());
      console.log("✅ Premium subscription approved!");
    });

    CdvPurchase.store.refresh();
  }

  // 🔍 Check user’s tier
  static async checkUserTier(): Promise<SubscriptionTier> {
    try {
      const plus = CdvPurchase.store.get(PLUS_SKU);
      const premium = CdvPurchase.store.get(PREMIUM_SKU);

      if (premium && premium.owned) return 'premium';
      if (plus && plus.owned) return 'plus';
      return 'free';
    } catch (err) {
      console.error("Error checking subscription status:", err);
      return 'free';
    }
  }

  // 🟡 Buy Plus
  static async buyPlus() {
    try {
      const product = CdvPurchase.store.get(PLUS_SKU);
      if (!product) throw new Error("Plus product not found");
      await product.order();
    } catch (err) {
      console.error("Plus purchase failed:", err);
      throw err; // Re-throw the error for the UI to handle
    }
  }

  // 🔵 Buy Premium
  static async buyPremium() {
    try {
      const product = CdvPurchase.store.get(PREMIUM_SKU);
      if (!product) throw new Error("Premium product not found");
      await product.order();
    } catch (err) {
      console.error("Premium purchase failed:", err);
      throw err; // Re-throw the error for the UI to handle
    }
  }
}

export default BillingManager;
