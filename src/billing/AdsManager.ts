
import {
  AdMob,
  BannerAdSize,
  BannerAdPosition,
  BannerAdOptions
} from '@capacitor-community/admob';
import BillingManager from './BillingManager';

export type SubscriptionTier = 'free' | 'plus' | 'premium';

class AdsManager {
  private static initialized = false;

  // 🔑 Initialize AdMob
  static async init() {
    if (!this.initialized) {
      await AdMob.initialize({
        testingDevices: [],
        initializeForTesting: true, // ⚠️ remove in production
      });
      this.initialized = true;
    }
  }

  // This is now private as the manager should control its own state
  private static async getTier(): Promise<SubscriptionTier> {
    // Always fetch the latest tier from the single source of truth
    return await BillingManager.checkUserTier();
  }

  // Banner
  static async showBanner() {
    const tier = await this.getTier();
    if (tier === 'premium') return; // no ads
    const options: BannerAdOptions = {
      adId: 'ca-app-pub-3940256099942544/6300978111', // TEST Banner
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      isTesting: true,
    };
    await AdMob.showBanner(options);
  }

  static async hideBanner() {
    await AdMob.hideBanner();
  }

  //  Interstitial
  static async showInterstitial() {
    const tier = await this.getTier();
    if (tier === 'premium') return; // skip ads
    if (tier === 'plus' && Math.random() > 0.3) return; 

    await AdMob.prepareInterstitial({
      adId: 'ca-app-pub-3940256099942544/1033173712',
      isTesting: true,
    });
    await AdMob.showInterstitial();
  }

  // Rewarded
  static async showRewarded(onReward: () => void) {
    const tier = await this.getTier();
    if (tier === 'premium') return; // skip
    await AdMob.prepareRewardVideoAd({
      adId: 'ca-app-pub-3940256099942544/5224354917',
      isTesting: true,
    });

    const reward = await AdMob.showRewardVideoAd();
    if (reward?.type) {
      onReward();
    }
  }
}

export default AdsManager;
