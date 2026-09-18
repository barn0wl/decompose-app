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

import { RouteStep } from '../types';
import { TRANSPORT_COLORS } from '../constants/transport';
import { COLORS, FONTS } from '../constants/theme';

import MapIcon from '../../assets/icons/map.svg';

interface Props {
  steps: RouteStep[];
  currentStepIndex?: number;
  onStepSelect?: (index: number) => void;
  height?: DimensionValue;
}

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export default function RouteMap({
  steps,
  currentStepIndex = 0,
  onStepSelect,
  height = 300,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const [selectedStep, setSelectedStep] = useState<number>(currentStepIndex);

  useEffect(() => {
    setSelectedStep(currentStepIndex);
  }, [currentStepIndex]);

  // Generate coordinates
  const coordinates = steps
    .map((step) => {
      if (step.fromLatitude !== undefined && step.fromLongitude !== undefined) {
        return {
          latitude: step.fromLatitude,
          longitude: step.fromLongitude,
          title: step.from,
          stepIndex: step.stepIndex ?? 0,
        };
      }
      return null;
    })
    .filter(
      (coord): coord is {
        latitude: number;
        longitude: number;
        title: string;
        stepIndex: number;
      } => coord !== null
    );

  const lastStep = steps[steps.length - 1];
  if (
    lastStep &&
    lastStep.toLatitude !== undefined &&
    lastStep.toLongitude !== undefined
  ) {
    coordinates.push({
      latitude: lastStep.toLatitude,
      longitude: lastStep.toLongitude,
      title: lastStep.to,
      stepIndex: lastStep.stepIndex ?? steps.length - 1,
    });
  }

  // Generate polylines
  const polylines = steps
    .map((step, index) => {
      if (
        step.fromLatitude === undefined ||
        step.fromLongitude === undefined ||
        step.toLatitude === undefined ||
        step.toLongitude === undefined
      ) {
        return null;
      }

      return {
        coordinates: [
          { latitude: step.fromLatitude, longitude: step.fromLongitude },
          { latitude: step.toLatitude, longitude: step.toLongitude },
        ],
        color: TRANSPORT_COLORS[step.type] || COLORS.primary,
        strokeWidth: 4,
        index,
        step,
        isActive: index === selectedStep,
      };
    })
    .filter((polyline) => polyline !== null);

  // Fit map to all coordinates
  useEffect(() => {
    if (coordinates.length > 0 && mapRef.current) {
      const latitudes = coordinates.map((c) => c.latitude);
      const longitudes = coordinates.map((c) => c.longitude);
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      const padding = 0.05;
      const region: Region = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: maxLat - minLat + padding,
        longitudeDelta: maxLng - minLng + padding,
      };

      if (region.latitudeDelta < 0.01) region.latitudeDelta = 0.01;
      if (region.longitudeDelta < 0.01) region.longitudeDelta = 0.01;

      mapRef.current.animateToRegion(region, 1000);
    }
  }, [coordinates]);

  const didMountRef = useRef(false);

  // Zoom to selected step
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (!mapRef.current) return;

    const step = steps[selectedStep];
    if (
      !step ||
      step.fromLatitude === undefined ||
      step.fromLongitude === undefined ||
      step.toLatitude === undefined ||
      step.toLongitude === undefined
    ) {
      return;
    }

    const lats = [step.fromLatitude, step.toLatitude];
    const lngs = [step.fromLongitude, step.toLongitude];
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

    mapRef.current.animateToRegion(region, 500);
  }, [selectedStep, steps]);

  const handleStepPress = (index: number) => {
    setSelectedStep(index);
    if (onStepSelect) {
      onStepSelect(index);
    }
  };

  if (coordinates.length === 0) {
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
        // Disable the underlying Google/Apple basemap on Android so OSM tiles are the only visible layer.
        // On iOS, `standard` still shows Apple's base layer, but UrlTile is drawn on top and covers it.
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
          latitude: coordinates[0].latitude,
          longitude: coordinates[0].longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {/* OpenStreetMap tile layer */}
        <UrlTile
          urlTemplate={OSM_TILE_URL}
          maximumZ={19}
          flipY={false}
          tileSize={256}
        />

        {/* Polylines */}
        {polylines.map((polyline, index) => {
          if (!polyline) return null;
          const isActive = index === selectedStep;
          const color = polyline.color;
          return (
            <Polyline
              key={index}
              coordinates={polyline.coordinates}
              strokeColor={isActive ? color : color + '80'}
              strokeWidth={isActive ? 6 : 4}
              lineDashPattern={
                polyline.step.type === 'walking' ? [5, 5] : undefined
              }
              tappable={true}
              onPress={() => handleStepPress(index)}
            />
          );
        })}

        {/* Markers */}
        {coordinates.map((coord, index) => {
          const isOrigin = index === 0;
          const isDestination = index === coordinates.length - 1;
          const stepIndex = index - 1;
          const stepColor =
            !isOrigin && !isDestination && stepIndex >= 0
              ? TRANSPORT_COLORS[steps[stepIndex]?.type] || COLORS.primary
              : COLORS.primary;

          let markerColor = stepColor;
          if (isOrigin) markerColor = COLORS.accent;
          else if (isDestination) markerColor = COLORS.highlight;
          else if (stepIndex === selectedStep) markerColor = COLORS.primary;

          const isActiveMarker = stepIndex === selectedStep;

          return (
            <Marker
              key={index}
              coordinate={{
                latitude: coord.latitude,
                longitude: coord.longitude,
              }}
              title={coord.title}
              description={
                isOrigin
                  ? 'Départ'
                  : isDestination
                  ? 'Arrivée'
                  : `Étape ${stepIndex + 1}`
              }
            >
              <TouchableOpacity
                onPress={() => {
                  if (isOrigin) {
                    handleStepPress(0);
                  } else if (isDestination) {
                    handleStepPress(steps.length - 1);
                  } else if (stepIndex >= 0) {
                    handleStepPress(stepIndex);
                  }
                }}
              >
                <View
                  style={[
                    styles.markerContainer,
                    { backgroundColor: markerColor },
                    isActiveMarker && styles.markerContainerActive,
                  ]}
                >
                  <Text style={styles.markerText}>
                    {isOrigin ? 'D' : isDestination ? 'A' : String(stepIndex + 1)}
                  </Text>
                </View>
              </TouchableOpacity>
            </Marker>
          );
        })}
      </MapView>

      {/* Step indicator */}
      {steps.length > 0 && (
        <View style={styles.stepIndicator}>
          <Text style={styles.stepIndicatorText}>
            {selectedStep + 1} / {steps.length}
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
  map: {
    flex: 1,
  },
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

  // Marker
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

  // Step indicator pill
  stepIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  stepIndicatorText: {
    fontFamily: FONTS.heading,
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
