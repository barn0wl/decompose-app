import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, DimensionValue } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline, Marker, Region } from 'react-native-maps';
import { Text } from 'react-native-paper';

import { RouteStep } from '../types';
import { TRANSPORT_COLORS, TRANSPORT_ICONS } from '../constants/transport';

interface Props {
  steps: RouteStep[];
  currentStepIndex?: number;
  onStepSelect?: (index: number) => void;
  height?: DimensionValue;
}

export default function RouteMap({ steps, currentStepIndex = 0, onStepSelect, height = 300 }: Props) {
  const mapRef = useRef<MapView>(null);
  const [selectedStep, setSelectedStep] = useState<number>(currentStepIndex);

  // Update selected step when prop changes
  useEffect(() => {
    setSelectedStep(currentStepIndex);
  }, [currentStepIndex]);

  // Generate coordinates for the route from the steps data
  const coordinates = steps
    .map(step => {
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
    .filter((coord): coord is { latitude: number; longitude: number; title: string; stepIndex: number } => coord !== null);

  // Add destination coordinates
  const lastStep = steps[steps.length - 1];
  if (lastStep && lastStep.toLatitude !== undefined && lastStep.toLongitude !== undefined) {
    coordinates.push({
      latitude: lastStep.toLatitude,
      longitude: lastStep.toLongitude,
      title: lastStep.to,
      stepIndex: lastStep.stepIndex ?? steps.length - 1,
    });
  }

  // Generate polylines for each step
  const polylines = steps.map((step, index) => {
    if (step.fromLatitude === undefined || step.fromLongitude === undefined ||
        step.toLatitude === undefined || step.toLongitude === undefined) {
      return null;
    }

    return {
      coordinates: [
        { latitude: step.fromLatitude, longitude: step.fromLongitude },
        { latitude: step.toLatitude, longitude: step.toLongitude },
      ],
      color: TRANSPORT_COLORS[step.type] || '#888',
      strokeWidth: 4,
      index,
      step,
      isActive: index === selectedStep,
    };
  }).filter(polyline => polyline !== null);

  // Auto-fit map to show all coordinates
  useEffect(() => {
    if (coordinates.length > 0 && mapRef.current) {
      const latitudes = coordinates.map(c => c.latitude);
      const longitudes = coordinates.map(c => c.longitude);
      
      const minLat = Math.min(...latitudes);
      const maxLat = Math.max(...latitudes);
      const minLng = Math.min(...longitudes);
      const maxLng = Math.max(...longitudes);
      
      const padding = 0.05;
      const region: Region = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: (maxLat - minLat) + padding,
        longitudeDelta: (maxLng - minLng) + padding,
      };

      if (region.latitudeDelta < 0.01) region.latitudeDelta = 0.01;
      if (region.longitudeDelta < 0.01) region.longitudeDelta = 0.01;

      mapRef.current.animateToRegion(region, 1000);
    }
  }, [coordinates]);

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
          <Text variant="bodyMedium" style={styles.placeholderText}>
            No map data available for this route
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
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
        {/* Route Polylines */}
        {polylines.map((polyline, index) => {
          if (!polyline) return null;
          
          const isActive = index === selectedStep;
          
          return (
            <Polyline
              key={index}
              coordinates={polyline.coordinates}
              strokeColor={isActive ? polyline.color : polyline.color + '80'}
              strokeWidth={isActive ? 6 : 4}
              lineDashPattern={polyline.step.type === 'walking' ? [5, 5] : undefined}
              tappable={true}
              onPress={() => handleStepPress(index)}
            />
          );
        })}
        
        {/* Stop Markers */}
        {coordinates.map((coord, index) => {
          const isOrigin = index === 0;
          const isDestination = index === coordinates.length - 1;
          const stepIndex = index - 1;
          
          let markerColor = '#6200ee';
          if (isOrigin) markerColor = '#4CAF50';
          else if (isDestination) markerColor = '#f44336';
          // Highlight the marker if it's the selected step's destination
          else if (stepIndex === selectedStep) markerColor = '#FF6F00';
          
          return (
            <Marker
              key={index}
              coordinate={{
                latitude: coord.latitude,
                longitude: coord.longitude,
              }}
              title={coord.title}
              description={isOrigin ? 'Départ' : isDestination ? 'Arrivée' : `Étape ${stepIndex + 1}`}
              pinColor={markerColor}
            >
              <TouchableOpacity
                onPress={() => {
                  if (!isOrigin && !isDestination && stepIndex >= 0) {
                    handleStepPress(stepIndex);
                  }
                }}
              >
                <View style={[styles.markerContainer, { backgroundColor: markerColor }]}>
                  <Text style={styles.markerText}>
                    {isOrigin ? '🚀' : isDestination ? '🏁' : String(stepIndex + 1)}
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
            {selectedStep + 1} / {steps.length} étapes
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  map: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  placeholderText: {
    color: '#888',
  },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  markerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  stepIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stepIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});
