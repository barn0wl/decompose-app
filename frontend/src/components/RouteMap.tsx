// src/components/RouteMap.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  DimensionValue,
  Platform,
} from 'react-native';
import MapView, {
  Polyline,
  Marker,
  Region,
  UrlTile,
  PROVIDER_DEFAULT,
} from 'react-native-maps';
import { Text } from 'react-native-paper';

import { Leg } from '../types';
import { TRANSPORT_COLORS } from '../constants/transport';
import { COLORS, FONTS } from '../constants/theme';

import MapIcon from '../../assets/icons/map.svg';

interface Props {
  legs: Leg[];
  currentLegIndex?: number;
  onLegSelect?: (index: number) => void;
  height?: DimensionValue;
}

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

interface LegPath {
  leg: Leg;
  coordinates: { latitude: number; longitude: number }[];
  color: string;
  isWalking: boolean;
}

export default function RouteMap({
  legs,
  currentLegIndex = 0,
  onLegSelect,
  height = 300,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const [selectedLeg, setSelectedLeg] = useState<number>(currentLegIndex);

  useEffect(() => {
    setSelectedLeg(currentLegIndex);
  }, [currentLegIndex]);

  // Build one path per leg
  const paths: LegPath[] = [];
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const coords: { latitude: number; longitude: number }[] = [];

    coords.push({
      latitude: leg.fromStop.latitude,
      longitude: leg.fromStop.longitude,
    });

    if (leg.type === 'boarding') {
      for (const stop of leg.intermediateStops) {
        coords.push({ latitude: stop.latitude, longitude: stop.longitude });
      }
    }

    coords.push({
      latitude: leg.toStop.latitude,
      longitude: leg.toStop.longitude,
    });

    paths.push({
      leg,
      coordinates: coords,
      color: leg.type === 'walking'
        ? COLORS.textMuted
        : TRANSPORT_COLORS[leg.transportType] ?? COLORS.primary,
      isWalking: leg.type === 'walking',
    });
  }

  // Markers: only at boarding boundaries (start/end of each leg)
  const markers: { latitude: number; longitude: number; title: string; legIndex: number; isOrigin: boolean; isDestination: boolean }[] = [];
  if (legs.length > 0) {
    markers.push({
      latitude: legs[0].fromStop.latitude,
      longitude: legs[0].fromStop.longitude,
      title: legs[0].fromStop.name,
      legIndex: 0,
      isOrigin: true,
      isDestination: false,
    });

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const isLast = i === legs.length - 1;
      // Only mark the destination end of the leg to avoid duplicate markers
      markers.push({
        latitude: leg.toStop.latitude,
        longitude: leg.toStop.longitude,
        title: leg.toStop.name,
        legIndex: i,
        isOrigin: false,
        isDestination: isLast,
      });
    }
  }

  // Fit map to all coordinates
  useEffect(() => {
    if (markers.length === 0 || !mapRef.current) return;

    const lats = markers.map(m => m.latitude);
    const lngs = markers.map(m => m.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const padding = 0.02;

    const region: Region = {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat + padding, 0.01),
      longitudeDelta: Math.max(maxLng - minLng + padding, 0.01),
    };

    mapRef.current.animateToRegion(region, 800);
  }, [legs]);

  const handleLegPress = (index: number) => {
    setSelectedLeg(index);
    onLegSelect?.(index);
  };

  if (markers.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.placeholder}>
          <View style={styles.placeholderIconCircle}>
            <MapIcon width={32} height={32} fill={COLORS.textMuted} />
          </View>
          <Text style={styles.placeholderText}>
            Aucune donnée cartographique disponible pour ce trajet
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={false}
        pitchEnabled={false}
        zoomControlEnabled={true}
        initialRegion={{
          latitude: markers[0].latitude,
          longitude: markers[0].longitude,
          latitudeDelta: 0.09,
          longitudeDelta: 0.04,
        }}
      >
        <UrlTile
          urlTemplate={OSM_TILE_URL}
          maximumZ={19}
          flipY={false}
          tileSize={256}
        />

        {/* Polylines: one per leg */}
        {paths.map((path, index) => {
          const isActive = index === selectedLeg;
          return (
            <Polyline
              key={`leg-${index}`}
              coordinates={path.coordinates}
              strokeColor={isActive ? path.color : path.color + '70'}
              strokeWidth={isActive ? 6 : 4}
              lineDashPattern={path.isWalking ? [6, 6] : undefined}
              tappable={true}
              onPress={() => handleLegPress(index)}
            />
          );
        })}

        {/* Markers */}
        {markers.map((coord, index) => {
          const color = coord.isOrigin
            ? COLORS.accent
            : coord.isDestination
            ? COLORS.highlight
            : COLORS.primary;
          const isActive = coord.legIndex === selectedLeg;

          return (
            <Marker
              key={`marker-${index}`}
              coordinate={{ latitude: coord.latitude, longitude: coord.longitude }}
              title={coord.title}
              description={
                coord.isOrigin
                  ? 'Départ'
                  : coord.isDestination
                  ? 'Arrivée'
                  : `Étape ${coord.legIndex + 1}`
              }
            >
              <TouchableOpacity onPress={() => handleLegPress(coord.legIndex)}>
                <View
                  style={[
                    styles.markerContainer,
                    { backgroundColor: color },
                    isActive && styles.markerContainerActive,
                  ]}
                >
                  <Text style={styles.markerText}>
                    {coord.isOrigin ? 'D' : coord.isDestination ? 'A' : String(coord.legIndex + 1)}
                  </Text>
                </View>
              </TouchableOpacity>
            </Marker>
          );
        })}
      </MapView>

      {/* Leg indicator */}
      {legs.length > 0 && (
        <View style={styles.legIndicator}>
          <Text style={styles.legIndicatorText}>
            {selectedLeg + 1} / {legs.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: COLORS.surfaceAlt,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  map: { flex: 1 },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    padding: 24,
  },
  placeholderIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeholderText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  markerContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.surface,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  markerContainerActive: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: COLORS.accent,
    elevation: 6,
  },
  markerText: {
    fontFamily: FONTS.heading,
    color: COLORS.textLight,
    fontWeight: '700',
    fontSize: 12,
  },
  legIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 3,
  },
  legIndicatorText: {
    fontFamily: FONTS.heading,
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
