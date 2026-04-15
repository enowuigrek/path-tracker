import React, { useRef, useEffect, useState, useCallback, startTransition } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import MapView, { Polyline, Marker, Region } from 'react-native-maps';
import { useLocationTracking } from './hooks/useLocationTracking';
import { FogOfWar } from './components/FogOfWar';

const ACCENT = '#3B82F6';
const DEFAULT_DELTA = 0.002;

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function DirectionMarker({ heading }: { heading: number | null }) {
  return (
    <View
      style={[
        styles.markerContainer,
        { transform: [{ rotate: `${heading ?? 0}deg` }] },
      ]}
    >
      <View style={styles.arrowHead} />
      <View style={styles.dot}>
        <View style={styles.dotInner} />
      </View>
    </View>
  );
}

export default function App() {
  const {
    currentLocation,
    pathCoordinates,
    permissionStatus,
    distanceMeters,
    heading,
  } = useLocationTracking();

  const mapRef = useRef<MapView>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);

  // When true the map follows the user automatically.
  // Set to false as soon as the user drags or pinches.
  const [isFollowing, setIsFollowing] = useState(true);

  // Remember the zoom level the user last set so we restore it on re-center.
  const userDeltaRef = useRef({ latitudeDelta: DEFAULT_DELTA, longitudeDelta: DEFAULT_DELTA });

  // Seed initial region
  useEffect(() => {
    if (currentLocation && !mapRegion) {
      setMapRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: DEFAULT_DELTA,
        longitudeDelta: DEFAULT_DELTA,
      });
    }
  }, [currentLocation, mapRegion]);

  // Auto-follow — only when isFollowing, preserves the user's zoom level
  useEffect(() => {
    if (!isFollowing || !currentLocation || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: userDeltaRef.current.latitudeDelta,
        longitudeDelta: userDeltaRef.current.longitudeDelta,
      },
      400,
    );
  }, [currentLocation, isFollowing]);

  const handleRegionChange = useCallback((r: Region) => {
    startTransition(() => setMapRegion(r));
  }, []);

  const handleRegionChangeComplete = useCallback((r: Region) => {
    setMapRegion(r);
    // Save zoom so re-center restores it
    userDeltaRef.current = {
      latitudeDelta: r.latitudeDelta,
      longitudeDelta: r.longitudeDelta,
    };
  }, []);

  // User touched the map — stop following
  const handlePanDrag = useCallback(() => {
    setIsFollowing(false);
  }, []);

  const handleReCenter = useCallback(() => {
    setIsFollowing(true);
  }, []);

  // --- screens ---
  if (permissionStatus === 'denied') {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashIcon}>📍</Text>
        <Text style={styles.splashTitle}>Brak dostępu do lokalizacji</Text>
        <Text style={styles.splashBody}>
          Włącz uprawnienia lokalizacji w Ustawieniach systemowych,
          żeby odkrywać mapę podczas spaceru.
        </Text>
      </View>
    );
  }

  if (!currentLocation || !mapRegion) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={ACCENT} style={{ marginBottom: 16 }} />
        <Text style={styles.splashTitle}>Szukanie sygnału GPS…</Text>
        <Text style={styles.splashBody}>
          Wyjdź na zewnątrz — GPS działa tylko pod gołym niebem.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={mapRegion}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPanDrag={handlePanDrag}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {pathCoordinates.length > 1 && (
          <Polyline
            coordinates={pathCoordinates}
            strokeColor="rgba(59,130,246,0.5)"
            strokeWidth={3}
            lineCap="round"
            lineJoin="round"
          />
        )}

        <Marker
          coordinate={currentLocation}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges
          zIndex={10}
        >
          <DirectionMarker heading={heading} />
        </Marker>
      </MapView>

      <FogOfWar coordinates={pathCoordinates} region={mapRegion} />

      {/* Top HUD — distance */}
      <SafeAreaView style={styles.hudWrapper} pointerEvents="none">
        <View style={styles.hud}>
          <Text style={styles.hudLabel}>DYSTANS</Text>
          <Text style={styles.hudValue}>{formatDistance(distanceMeters)}</Text>
        </View>
      </SafeAreaView>

      {/* Re-center button — appears when the user pans away */}
      {!isFollowing && (
        <SafeAreaView style={styles.reCenterWrapper}>
          <TouchableOpacity style={styles.reCenterBtn} onPress={handleReCenter} activeOpacity={0.75}>
            <Text style={styles.reCenterIcon}>◎</Text>
            <Text style={styles.reCenterLabel}>Wróć</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },

  splash: {
    flex: 1,
    backgroundColor: '#0B1120',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 36,
  },
  splashIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 10,
  },
  splashBody: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },

  // --- direction marker ---
  markerContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowHead: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 13,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: ACCENT,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(59,130,246,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ACCENT,
    borderWidth: 2.5,
    borderColor: '#fff',
  },

  // --- HUD ---
  hudWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hud: {
    marginTop: Platform.OS === 'ios' ? 12 : 40,
    backgroundColor: 'rgba(11, 17, 32, 0.82)',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  hudLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#475569',
    marginBottom: 2,
  },
  hudValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: -0.5,
  },

  // --- re-center button ---
  reCenterWrapper: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  reCenterBtn: {
    margin: 20,
    marginBottom: Platform.OS === 'ios' ? 36 : 20,
    backgroundColor: 'rgba(11, 17, 32, 0.88)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.4)',
  },
  reCenterIcon: {
    fontSize: 20,
    color: ACCENT,
    lineHeight: 24,
  },
  reCenterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
