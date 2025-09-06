
import {
  AdMob,
  BannerAdSize,
  BannerAdPosition,
  BannerAdOptions
} from '@capacitor-community/admob';

export type SubscriptionTier = 'free' | 'plus' | 'premium';

class AdsManager {
  private static initialized = false;
  private static subscriptionTier: SubscriptionTier = 'free';

  static async init() {
    if (this.initialized) return;
    await AdMob.initialize({
      testingDevices: [],
      initializeForTesting: true, // ⚠️ remove in production
    });
    this.initialized = true;
  }

  static setTier(tier: SubscriptionTier) {
    this.subscriptionTier = tier;
  }

  // Banner
  static async showBanner() {
    if (this.subscriptionTier === 'premium') return; // no ads
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
    if (this.subscriptionTier === 'premium') return; // skip ads
    if (this.subscriptionTier === 'plus' && Math.random() > 0.3) return; 
    // Plus = show fewer ads (30% chance here)

    await AdMob.prepareInterstitial({
      adId: 'ca-app-pub-3940256099942544/1033173712',
      isTesting: true,
    });
    await AdMob.showInterstitial();
  }

  // Rewarded
  static async showRewarded(onReward: () => void) {
    if (this.subscriptionTier === 'premium') return; // skip
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
