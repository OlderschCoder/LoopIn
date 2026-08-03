import { Linking } from "react-native";

export interface RideOptions {
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat: number;
  dropoffLng: number;
  dropoffName?: string;
  dropoffAddress?: string;
}

export async function callUber(opts: RideOptions) {
  const { pickupLat, pickupLng, dropoffLat, dropoffLng, dropoffName = "Home", dropoffAddress } = opts;

  const params = new URLSearchParams();
  params.set("action", "setPickup");

  if (pickupLat != null && pickupLng != null) {
    params.set("pickup[latitude]", String(pickupLat));
    params.set("pickup[longitude]", String(pickupLng));
    params.set("pickup[nickname]", "My Location");
  } else {
    params.set("pickup", "my_location");
  }

  params.set("dropoff[latitude]", String(dropoffLat));
  params.set("dropoff[longitude]", String(dropoffLng));
  params.set("dropoff[nickname]", dropoffName);
  if (dropoffAddress) params.set("dropoff[formatted_address]", dropoffAddress);

  const deep = `uber://?${params.toString()}`;
  const web = `https://m.uber.com/ul/?${params.toString()}`;

  try {
    const can = await Linking.canOpenURL(deep);
    await Linking.openURL(can ? deep : web);
  } catch {
    await Linking.openURL(web);
  }
}

export async function callLyft(opts: RideOptions) {
  const { pickupLat, pickupLng, dropoffLat, dropoffLng } = opts;

  let deep = `lyft://ridetype?id=lyft&destination[latitude]=${dropoffLat}&destination[longitude]=${dropoffLng}`;
  if (pickupLat != null && pickupLng != null) {
    deep += `&pickup[latitude]=${pickupLat}&pickup[longitude]=${pickupLng}`;
  }
  const web = `https://ride.lyft.com/`;

  try {
    const can = await Linking.canOpenURL(deep);
    await Linking.openURL(can ? deep : web);
  } catch {
    await Linking.openURL(web);
  }
}

export async function openApp(scheme: string, webFallback: string) {
  try {
    const can = await Linking.canOpenURL(scheme);
    await Linking.openURL(can ? scheme : webFallback);
  } catch {
    await Linking.openURL(webFallback);
  }
}
