import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";

let configuredFor: string | null = null;

export async function configurePurchases(userId: string) {
  if (Platform.OS === "web") return false;
  const apiKey = Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!apiKey) return false;
  if (!configuredFor) Purchases.configure({ apiKey, appUserID: userId });
  else if (configuredFor !== userId) await Purchases.logIn(userId);
  configuredFor = userId;
  return true;
}

export async function presentTravelPaywall(userId: string) {
  const ready = await configurePurchases(userId);
  if (!ready) throw new Error("Travel purchases are not configured for this build");
  return RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: "travel_access",
    displayCloseButton: true,
  });
}

export async function restoreTravelPurchases(userId: string) {
  const ready = await configurePurchases(userId);
  if (!ready) throw new Error("Travel purchases are not configured for this build");
  return Purchases.restorePurchases();
}
