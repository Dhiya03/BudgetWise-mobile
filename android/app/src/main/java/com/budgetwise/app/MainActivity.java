package com.budgetwise.financetracker;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.revenuecat.purchases.capacitor.PurchasesPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // This is the recommended place to configure RevenueCat.
        // Replace with your actual public Google Play API key.
       // PurchasesPlugin.configure(this, "goog_public_sdk_key_placeholder"); -- TODO: will add later
    } 
}
