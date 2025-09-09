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
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ onBack, subscriptionTier, showToast }) => {
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
      showToast("Purchase successful! Your plan has been updated.");
    } catch (error) {
      showToast("Purchase was cancelled or failed.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleBuyPremium = async () => {
    setIsPurchasing(true);
    try {
      await BillingManager.buy('premium');
      showToast("Purchase successful! Welcome to Premium!");
    } catch (error) {
      showToast("Purchase was cancelled or failed.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const formatSubscriptionPeriod = (period: string | null | undefined): string => {
    if (!period) return '';
    if (period === 'P1M') return 'Billed Monthly';
    if (period === 'P3M') return 'Billed Quarterly';
    if (period === 'P1Y') return 'Billed Annually';
    // Fallback for other ISO 8601 durations
    return `Billed ${period.replace('P', '')}`;
  };

  const annualSavings = useMemo(() => {
    if (plusProduct?.product.price && premiumProduct?.product.price) {
      const monthlyPrice = plusProduct.product.price;
      const annualPrice = premiumProduct.product.price;
      const totalMonthlyCost = monthlyPrice * 12;
      if (totalMonthlyCost > annualPrice) {
        const savings = ((totalMonthlyCost - annualPrice) / totalMonthlyCost) * 100;
        return `Save ${Math.round(savings)}% vs monthly`;
      }
    }
    return 'Save 55% vs monthly'; // Fallback
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
        <h1 className="text-2xl font-bold text-gray-800 ml-4">Subscription Plans</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Tier */}
          <div className="bg-white rounded-2xl p-6 shadow-lg flex flex-col">
            <h2 className="text-xl font-bold text-gray-800">Lite (Free)</h2>
            <p className="text-sm text-gray-500 mb-4">Master your daily spending</p>
            <ul className="space-y-3 flex-grow">
              {renderFeature('Unlimited Transactions', true)}
              {renderFeature('Monthly Budgeting (5 categories)', true)}
              {renderFeature('Full History View', true)}
              {renderFeature('PIN Lock Security', true)}
              {renderFeature('Quick CSV Export', true)}
              {renderFeature('Custom Budgets', false)}
              {renderFeature('Bill Reminders', false)}
              {renderFeature('Advanced Analytics', false)}
              {renderFeature('Budget Automation', false)}
            </ul>
            <div className="mt-6">
              {subscriptionTier === 'free' && (
                <button className="w-full p-3 bg-purple-600 text-white rounded-xl font-semibold" disabled>
                  Current Plan
                </button>
              )}
              <p className="text-center text-xs text-gray-500 mt-2">
                Always Free
              </p>
            </div>
          </div>

          {/* Plus Tier */}
          <div className="relative bg-white rounded-2xl p-6 shadow-lg border-2 border-yellow-400 flex flex-col">
            <h2 className="text-xl font-bold text-gray-800">Plus</h2>
            <p className="text-sm text-gray-500 mb-4">Achieve your short-term goals</p>
            <span className="absolute top-0 right-0 bg-yellow-400 text-xs font-bold px-2 py-1 rounded-bl-lg">
              Most Popular
            </span>
            <div className="text-center my-4">
              <h3 className="text-3xl font-bold">{plusProduct?.product.priceString || FALLBACK_PRICES.plus}</h3>
              <p className="text-sm text-gray-500">{formatSubscriptionPeriod(plusProduct?.product.subscriptionPeriod)}</p>
            </div>
            <ul className="space-y-3 flex-grow">
              {renderFeature('All Free Features', true)}
              {renderFeature('Custom Budgets (3 active)', true)}
              {renderFeature('Bill Reminders (5 active)', true)}
              {renderFeature('Recurring Transactions', true)}
              {renderFeature('Tagging & Filtering', true)}
              {renderFeature('Limited Analytics', true)}
              {renderFeature('Full Analytics Suite', false)}
            </ul>
            <div className="mt-6">
              {subscriptionTier === 'plus' ? (
                <button className="w-full p-3 bg-purple-600 text-white rounded-xl font-semibold" disabled>
                  Current Plan
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
                      ? 'Subscribed to Premium'
                      : `Upgrade to Plus - ${plusProduct?.product.priceString || '₹149'}`
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Premium Tier */}
          <div className="bg-purple-700 text-white rounded-2xl p-6 shadow-lg flex flex-col">
            <h2 className="text-xl font-bold">Premium</h2>
            <p className="text-sm text-purple-200 mb-4">Put your budget on autopilot</p>
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
                <p className="text-sm">All Plus Features</p>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-white" />
                <p className="text-sm">Unlimited Custom Budgets & Reminders</p>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-white" />
                <p className="text-sm">Full Analytics Suite</p>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-white" />
                <p className="text-sm">Budget Automation</p>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-white" />
                <p className="text-sm">Fund Transfers & Alerts</p>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-white" />
                <p className="text-sm">Advanced Reporting</p>
              </li>
              <li className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-white" />
                <p className="text-sm">Cloud Sync & Backup</p>
              </li>
            </ul>
            <div className="mt-6">
              {subscriptionTier === 'premium' ? (
                <button className="w-full p-3 bg-yellow-400 text-yellow-900 rounded-xl font-semibold" disabled>
                  Current Plan
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
                    `Go Premium - ${premiumProduct?.product.priceString || '₹799'}`
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trust Badge */}
      <div className="text-center text-gray-500 text-sm mt-4">
        <p>Secure payments processed by {platform}.</p>
        <p>You can cancel anytime from your {platform} subscriptions.</p>
      </div>
    </div>
  );
};

export default SubscriptionScreen;