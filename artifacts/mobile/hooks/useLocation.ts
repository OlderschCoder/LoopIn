import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
  accuracy: number | null;
  timestamp: number;
  mapsUrl: string;
}

export function useLocation(active = false) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<
    "unknown" | "granted" | "denied"
  >("unknown");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const requestPermission = useCallback(async () => {
    if (Platform.OS === "web") {
      setPermissionStatus("denied");
      return false;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === "granted";
    setPermissionStatus(granted ? "granted" : "denied");
    return granted;
  }, []);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string> => {
      try {
        const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (results.length > 0) {
          const r = results[0];
          const parts = [r.streetNumber, r.street, r.city, r.region].filter(Boolean);
          return parts.join(", ") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
      } catch {}
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    },
    []
  );

  const fetchOnce = useCallback(async () => {
    if (Platform.OS === "web") {
      setError("GPS is not available in the web preview. Use the Expo Go app on your phone.");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const granted = await requestPermission();
      if (!granted) {
        setError("Location permission denied.");
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      const address = await reverseGeocode(lat, lng);
      const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
      const data: LocationData = { lat, lng, address, accuracy, timestamp: pos.timestamp, mapsUrl };
      setLocation(data);
      return data;
    } catch (e) {
      setError("Could not get location. Please check your settings.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [requestPermission, reverseGeocode]);

  useEffect(() => {
    if (!active || Platform.OS === "web") return;

    let cancelled = false;

    (async () => {
      const granted = await requestPermission();
      if (!granted || cancelled) return;

      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 30000, distanceInterval: 50 },
        async (pos) => {
          if (cancelled) return;
          const { latitude: lat, longitude: lng, accuracy } = pos.coords;
          const address = await reverseGeocode(lat, lng);
          const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
          setLocation({ lat, lng, address, accuracy, timestamp: pos.timestamp, mapsUrl });
        }
      );
    })();

    return () => {
      cancelled = true;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [active, requestPermission, reverseGeocode]);

  return { location, permissionStatus, loading, error, fetchOnce };
}
