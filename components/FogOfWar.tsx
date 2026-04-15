import React, { useMemo } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Svg, {
  Rect,
  Circle,
  Defs,
  Mask,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { LatLng, Region } from 'react-native-maps';

const { width: W, height: H } = Dimensions.get('window');

// How many meters around each recorded point are revealed
const REVEAL_RADIUS_M = 20;

function latLngToPoint(coord: LatLng, region: Region): { x: number; y: number } {
  const x =
    ((coord.longitude - (region.longitude - region.longitudeDelta / 2)) /
      region.longitudeDelta) *
    W;
  const y =
    ((region.latitude + region.latitudeDelta / 2 - coord.latitude) /
      region.latitudeDelta) *
    H;
  return { x, y };
}

function metersToPixels(meters: number, region: Region): number {
  // 1 degree latitude ≈ 111 000 m
  return (meters / 111000) * (H / region.latitudeDelta);
}

interface Props {
  coordinates: LatLng[];
  region: Region;
}

export function FogOfWar({ coordinates, region }: Props) {
  const radiusPx = metersToPixels(REVEAL_RADIUS_M, region);

  const points = useMemo(
    () => coordinates.map((c) => latLngToPoint(c, region)),
    [coordinates, region],
  );

  return (
    <Svg
      style={StyleSheet.absoluteFillObject}
      width={W}
      height={H}
      // @ts-ignore – pointerEvents not in SVG types but works on native
      pointerEvents="none"
    >
      <Defs>
        {/*
         * Radial gradient used inside the mask:
         *   black (luminance=0) → fog removed  → map shows through
         *   white (luminance=1) → fog visible   → map hidden
         * The gradient gives soft feathered edges to each reveal circle.
         */}
        <RadialGradient
          id="hole"
          cx="50%"
          cy="50%"
          r="50%"
          gradientUnits="objectBoundingBox"
        >
          <Stop offset="0"   stopColor="black" stopOpacity="1" />
          <Stop offset="0.55" stopColor="black" stopOpacity="1" />
          <Stop offset="1"   stopColor="white" stopOpacity="1" />
        </RadialGradient>

        <Mask id="fog-mask">
          {/* White everywhere = fog covers the entire map by default */}
          <Rect x="0" y="0" width={W} height={H} fill="white" />
          {/* Each visited point punches a soft circular hole in the fog */}
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={radiusPx * 1.5}
              fill="url(#hole)"
            />
          ))}
        </Mask>
      </Defs>

      {/* The fog layer itself — revealed areas become transparent */}
      <Rect
        x="0"
        y="0"
        width={W}
        height={H}
        fill="#0B1120"
        fillOpacity={0.94}
        mask="url(#fog-mask)"
      />
    </Svg>
  );
}
