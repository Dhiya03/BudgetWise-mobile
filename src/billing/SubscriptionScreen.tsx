import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import BillingManager from '../billing/BillingManager';
import { Purchases } from '@revenuecat/purchases-capacitor';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

interface SubscriptionScreenProps {
  onBack: () => void;
  subscriptionTier: 'free' | 'plus' | 'premium';
  showToast: (message: string) => void;
  t: (key: string, fallback?: string) => string;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ onBack, subscriptionTier, showToast, t }) => {
  const [plusProduct, setPlusProduct] = useState<PurchasesPackage | null>(null);
  const [premiumProduct, setPremiumProduct] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [platform, setPlatform] = useState('Google Play');

  // Fallback prices for when RevenueCat is not available (e.g., in a web browser for dev)
  const FALLBACK_PRICES = {
    plus: "₹149 / 3 months",
    premium: "₹799 / year"
  };

  useEffect(() => {
    const loadProducts = async () => {
      if (Capacitor.isNativePlatform()) {
        const currentPlatform = Capacitor.getPlatform();
        if (currentPlatform === 'ios') {
          setPlatform('App Store');
        }
      }

      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current) {
          setPlusProduct(offerings.current.availablePackages.find((p: PurchasesPackage) => p.identifier.includes('plus')) || null);
          setPremiumProduct(offerings.current.availablePackages.find((p: PurchasesPackage) => p.identifier.includes('premium')) || null);
        }
      } catch (e) {
        console.warn("Could not load RevenueCat products, using fallback prices.", e);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const handleBuyPlus = async () => {
    setIsPurchasing(true);
    try {
      await BillingManager.buy('plus');
      showToast(t('subscriptions.success'));
    } catch (error) {
      showToast(t('subscriptions.failed'));
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleBuyPremium = async () => {
    setIsPurchasing(true);
    try {
      await BillingManager.buy('premium');
      showToast(t('subscriptions.success'));
    } catch (error) {
      showToast(t('subscriptions.failed'));
    } finally {
      setIsPurchasing(false);
    }
  };

  const formatSubscriptionPeriod = (period: string | null | undefined): string => {
    if (!period) return '';
    if (period === 'P1M') return t('subscriptions.billed', 'Billed {period}').replace('{period}', 'Monthly');
    if (period === 'P3M') return t('subscriptions.billed', 'Billed {period}').replace('{period}', 'Quarterly');
    if (period === 'P1Y') return t('subscriptions.billed', 'Billed {period}').replace('{period}', 'Annually');
    // Fallback for other ISO 8601 durations
    return t('subscriptions.billed', 'Billed {period}').replace('{period}', period.replace('P', ''));
  };

  const annualSavings = useMemo(() => {
    if (plusProduct?.product.price && premiumProduct?.product.price) {
      const monthlyPrice = plusProduct.product.price;
      const annualPrice = premiumProduct.product.price;
      const totalMonthlyCost = monthlyPrice * 12;
      if (totalMonthlyCost > annualPrice) {
        const savings = ((totalMonthlyCost - annualPrice) / totalMonthlyCost) * 100;
        return t('subscriptions.save', 'Save {percent}% vs monthly').replace('{percent}', Math.round(savings).toString());
      }
    }
    return t('subscriptions.save', 'Save {percent}% vs monthly').replace('{percent}', '55'); // Fallback
  }, [plusProduct, premiumProduct]);

  const renderFeature = (text: string, included: boolean) => (
    <li className="flex items-center space-x-3">
      <div className="flex-shrink-0">
        {included ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-gray-400" />
        )}
      </div>
      <p className="text-sm text-gray-600">{text}</p>
    </li>
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800 ml-4">{t('subscriptions.title')}</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Tier */}
          <div className="bg-white rounded-2xl p-6 shadow-lg flex flex-col">
            <h2 className="text-xl font-bold text-gray-800">{t('subscriptions.features.free.title')}</h2>
            <p className="text-sm text-gray-500 mb-4">{t('subscriptions.features.free.description')}</p>
            <ul className="space-y-3 flex-grow">
              {renderFeature(t('subscriptions.features.free.item1'), true)}
              {renderFeature(t('subscriptions.features.free.item2'), true)}
              {renderFeature(t('subscriptions.features.free.item3'), true)}
              {renderFeature(t('subscriptions.features.free.item4'), true)}
              {renderFeature(t('subscriptions.features.free.item5'), true)}
              {renderFeature(t('subscriptions.features.free.item6'), false)}
              {renderFeature(t('subscriptions.features.free.item7'), false)}
              {renderFeature(t('subscriptions.features.free.item8'), false)}
              {renderFeature(t('subscriptions.features.free.item9'), false)}
            </ul>
            <div className="mt-6">
              {subscriptionTier === 'free' && (
                <button className="w-full p-3 bg-purple-600 text-white rounded-xl font-semibold" disabled>
                  {t('subscriptions.currentPlan')}
                </button>
              )}
              <p className="text-center text-xs text-gray-500 mt-2">
                Always Free
              </p>
            </div>
          </div>

          {/* Plus Tier */}
          <div className="relative bg-white rounded-2xl p-6 shadow-lg border-2 border-yellow-400 flex flex-col">
            <h2 className="text-xl font-bold text-gray-800">{t('subscriptions.features.plus.title')}</h2>
            <p className="text-sm text-gray-500 mb-4">{t('subscriptions.features.plus.description')}</p>
            <span className="absolute top-0 right-0 bg-yellow-400 text-xs font-bold px-2 py-1 rounded-bl-lg">
              {t('subscriptions.mostPopular')}
            </span>
            <div className="text-center my-4">
              <h3 className="text-3xl font-bold">{plusProduct?.product.priceString || FALLBACK_PRICES.plus}</h3>
              <p className="text-sm text-gray-500">{formatSubscriptionPeriod(plusProduct?.product.subscriptionPeriod)}</p>
            </div>
            <ul className="space-y-3 flex-grow">
              {renderFeature(t('subscriptions.features.plus.item1'), true)}
              {renderFeature(t('subscriptions.features.plus.item2'), true)}
              {renderFeature(t('subscriptions.features.plus.item3'), true)}
              {renderFeature(t('subscriptions.features.plus.item4'), true)}
              {renderFeature(t('subscriptions.features.plus.item5'), true)}
              {renderFeature(t('subscriptions.features.plus.item6'), true)}
              {renderFeature(t('subscriptions.features.plus.item7'), false)}
            </ul>
            <div className="mt-6">
              {subscriptionTier === 'plus' ? (
                <button className="w-full p-3 bg-purple-600 text-white rounded-xl font-semibold" disabled>
                  {t('subscriptions.currentPlan')}
                </button>
              ) : (
                <button
                  onClick={handleBuyPlus}
                  disabled={subscriptionTier === 'premium' || isPurchasing} // A premium user doesn't need to see this button as active
                  className="w-full p-3 bg-yellow-400 text-black rounded-xl font-semibold hover:bg-yellow-500 disabled:opacity-50 flex justify-center items-center"
                >
                  {isPurchasing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-900"></div>
                  ) : (
                    subscriptionTier === 'premium'
                      ? t('subscriptions.subscribedToPremium', 'Subscribed to Premium')
                      : t('subscriptions.upgradeTo', 'Upgrade to {plan}').replace('{plan}', t('subscriptions.features.plus.title')) + ` - ${plusProduct?.product.priceString || '₹149'}`
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Premium Tier */}
          <div className="bg-purple-700 text-white rounded-2xl p-6 shadow-lg flex flex-col">
            <h2 className="text-xl font-bold">{t('subscriptions.features.premium.title')}</h2>
            <p className="text-sm text-purple-200 mb-4">{t('subscriptions.features.premium.description')}</p>
            <div className="text-center my-4">
              <h3 className="text-3xl font-bold">{premiumProduct?.product.priceString || FALLBACK_PRICES.premium}</h3>
              <p className="text-sm text-purple-200">{formatSubscriptionPeriod(premiumProduct?.product.subscriptionPeriod)}</p>
              <p className="text-xs text-yellow-300 mt-1 font-semibold">
                {annualSavings}
              </p>
            </div>
            <ul className="space-y-3 flex-grow">
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-white" />
                <p className="text-sm">{t('subscriptions.features.premium.item1')}</p>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-white" />
                <p className="text-sm">{t('subscriptions.features.premium.item2')}</p>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-white" />
                <p className="text-sm">{t('subscriptions.features.premium.item3')}</p>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-white" />
                <p className="text-sm">{t('subscriptions.features.premium.item4')}</p>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-white" />
                <p className="text-sm">{t('subscriptions.features.premium.item5')}</p>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-white" />
                <p className="text-sm">{t('subscriptions.features.premium.item6')}</p>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-white" />
                <p className="text-sm">{t('subscriptions.features.premium.item7')}</p>
              </li>
            </ul>
            <div className="mt-6">
              {subscriptionTier === 'premium' ? (
                <button className="w-full p-3 bg-yellow-400 text-yellow-900 rounded-xl font-semibold" disabled>
                  {t('subscriptions.currentPlan')}
                </button>
              ) : (
                <button
                  onClick={handleBuyPremium}
                  disabled={isPurchasing}
                  className="w-full p-3 bg-white text-purple-700 rounded-xl font-semibold hover:bg-purple-100 disabled:opacity-50 flex justify-center items-center"
                >
                  {isPurchasing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-700"></div>
                  ) : (
                    t('subscriptions.goToPremium').replace('{price}', premiumProduct?.product.priceString || '₹799')
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trust Badge */}
      <div className="text-center text-gray-500 text-sm mt-4">
        <p>{t('subscriptions.securePayments').replace('{store}', platform)}</p>
        <p>{t('subscriptions.cancelAnytime').replace('{store}', platform)}</p>
      </div>
    </div>
  );
};

export default SubscriptionScreen;