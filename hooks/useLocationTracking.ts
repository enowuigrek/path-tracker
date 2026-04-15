import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { LatLng } from 'react-native-maps';

const MIN_DISTANCE_METERS = 3;

export function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface UseLocationTrackingResult {
  currentLocation: LatLng | null;
  pathCoordinates: LatLng[];
  permissionStatus: PermissionStatus;
  distanceMeters: number;
}

export function useLocationTracking(): UseLocationTrackingResult {
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [pathCoordinates, setPathCoordinates] = useState<LatLng[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus>('undetermined');

  const lastRecordedRef = useRef<LatLng | null>(null);

  const handleLocationUpdate = useCallback(
    (location: Location.LocationObject) => {
      const coord: LatLng = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(coord);

      const last = lastRecordedRef.current;
      if (!last || haversineDistance(last, coord) >= MIN_DISTANCE_METERS) {
        if (last) {
          setDistanceMeters((prev) => prev + haversineDistance(last, coord));
        }
        lastRecordedRef.current = coord;
        setPathCoordinates((prev) => [...prev, coord]);
      }
    },
    [],
  );

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    async function startTracking() {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setPermissionStatus('denied');
        return;
      }

      setPermissionStatus('granted');

      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      handleLocationUpdate(initial);

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: MIN_DISTANCE_METERS,
        },
        handleLocationUpdate,
      );
    }

    startTracking();

    return () => {
      subscription?.remove();
    };
  }, [handleLocationUpdate]);

  return { currentLocation, pathCoordinates, permissionStatus, distanceMeters };
}
