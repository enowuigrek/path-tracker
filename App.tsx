import React, { useRef, useEffect, useState, startTransition } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import MapView, { Polyline, Marker, Region } from 'react-native-maps';
import { useLocationTracking } from './hooks/useLocationTracking';
import { FogOfWar } from './components/FogOfWar';

const ACCENT = '#3B82F6';

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export default function App() {
  const { currentLocation, pathCoordinates, permissionStatus, distanceMeters } =
    useLocationTracking();

  const mapRef = useRef<MapView>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);

  // Set initial fog region as soon as we have a location
  useEffect(() => {
    if (currentLocation && !mapRegion) {
      setMapRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      });
    }
  }, [currentLocation, mapRegion]);

  // Smoothly follow the user
  useEffect(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        },
        400,
      );
    }
  }, [currentLocation]);

  // --- permission denied ---
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

  // --- waiting for first GPS fix ---
  if (!currentLocation || !mapRegion) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={ACCENT} style={{ marginBottom: 16 }} />
        <Text style={styles.splashTitle}>Szukanie sygnału GPS…</Text>
        <Text style={styles.splashBody}>Wyjdź na zewnątrz, jeśli sygnał jest słaby.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={mapRegion}
        onRegionChange={(r) => {
          // Use startTransition so map panning stays fluid
          startTransition(() => setMapRegion(r));
        }}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {/* Subtle path trace visible through revealed fog */}
        {pathCoordinates.length > 1 && (
          <Polyline
            coordinates={pathCoordinates}
            strokeColor="rgba(59,130,246,0.55)"
            strokeWidth={3}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Current position dot */}
        <Marker
          coordinate={currentLocation}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
          zIndex={10}
        >
          <View style={styles.dot}>
            <View style={styles.dotInner} />
          </View>
        </Marker>
      </MapView>

      {/* Fog of War overlay */}
      <FogOfWar coordinates={pathCoordinates} region={mapRegion} />

      {/* HUD — distance (rendered above fog) */}
      <SafeAreaView style={styles.hudWrapper} pointerEvents="none">
        <View style={styles.hud}>
          <Text style={styles.hudLabel}>DYSTANS</Text>
          <Text style={styles.hudValue}>{formatDistance(distanceMeters)}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },

  // --- splash screens ---
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

  // --- location dot ---
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotInner: {
    width: 13,
    height: 13,
    borderRadius: 7,
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
});
