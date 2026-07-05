import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline, Marker, Region } from 'react-native-maps';
import { Text } from 'react-native-paper';

import { RouteStep } from '../types';
import { TRANSPORT_COLORS, TRANSPORT_ICONS } from '../constants/transport';
import { getStopCoordinates } from '../utils/coordinates';

// TODO: We need to add latitude/longitude to RouteStep
// For now, we'll use a temporary approach

interface Props {
  steps: RouteStep[];
  currentStepIndex?: number;
  onStepSelect?: (index: number) => void;
  height?: number | string;
}


export default function RouteMap({ steps, currentStepIndex = 0, height = 300 }: Props) {
  const mapRef = useRef<MapView>(null);
  
  // Generate coordinates for the route
  const coordinates = steps
    .map(step => {
      const coords = getStopCoordinates(step.from);
      if (!coords) return null;
      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        title: step.from,
      };
    })
    .filter((coord): coord is { latitude: number; longitude: number; title: string } => coord !== null);
  
  // Add destination coordinates
  const lastStep = steps[steps.length - 1];
  if (lastStep) {
    const destCoords = getStopCoordinates(lastStep.to);
    if (destCoords) {
      coordinates.push({
        latitude: destCoords.latitude,
        longitude: destCoords.longitude,
        title: lastStep.to,
      });
    }
  }
  
  // Generate polylines for each step (with different colors)
  const polylines = steps.map((step, index) => {
    const fromCoords = getStopCoordinates(step.from);
    const toCoords = getStopCoordinates(step.to);
    
    if (!fromCoords || !toCoords) return null;
    
    return {
      coordinates: [
        { latitude: fromCoords.latitude, longitude: fromCoords.longitude },
        { latitude: toCoords.latitude, longitude: toCoords.longitude },
      ],
      color: TRANSPORT_COLORS[step.type] || '#888',
      strokeWidth: 4,
      index,
      step,
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
      
      const padding = 0.05; // 5% padding
      const region: Region = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: (maxLat - minLat) + padding,
        longitudeDelta: (maxLng - minLng) + padding,
      };
      
      // Ensure minimum zoom level
      if (region.latitudeDelta < 0.01) region.latitudeDelta = 0.01;
      if (region.longitudeDelta < 0.01) region.longitudeDelta = 0.01;
      
      mapRef.current.animateToRegion(region, 1000);
    }
  }, [coordinates]);
  
  // Highlight current step
  useEffect(() => {
    // TODO: Highlight the current step with a different color
    // For now, we just re-render the map
  }, [currentStepIndex]);

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
          
          // Highlight current step
          const isActive = index === currentStepIndex;
          
          return (
            <Polyline
              key={index}
              coordinates={polyline.coordinates}
              strokeColor={isActive ? polyline.color : polyline.color + '80'} // Add opacity if not active
              strokeWidth={isActive ? 6 : 4}
              lineDashPattern={polyline.step.type === 'walking' ? [5, 5] : undefined}
              tappable={true}
              onPress={() => console.log(`Step ${index + 1}: ${polyline.step.from} → ${polyline.step.to}`)}
            />
          );
        })}
        
        {/* Stop Markers */}
        {coordinates.map((coord, index) => {
          const isOrigin = index === 0;
          const isDestination = index === coordinates.length - 1;
          const stepIndex = index - 1; // Steps are between markers
          
          // Determine marker color
          let markerColor = '#6200ee'; // Default purple
          if (isOrigin) markerColor = '#4CAF50'; // Green for origin
          else if (isDestination) markerColor = '#f44336'; // Red for destination
          
          return (
            <Marker
              key={index}
              coordinate={{
                latitude: coord.latitude,
                longitude: coord.longitude,
              }}
              title={coord.title}
              description={isOrigin ? 'Depart' : isDestination ? 'Arrivée' : `Étape ${stepIndex}`}
              pinColor={markerColor}
            >
              <View style={[styles.markerContainer, { backgroundColor: markerColor }]}>
                <Text style={styles.markerText}>
                  {isOrigin ? '🚀' : isDestination ? '🏁' : String(stepIndex + 1)}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>
      
      {/* Step indicator (optional) */}
      {steps.length > 0 && (
        <View style={styles.stepIndicator}>
          <Text style={styles.stepIndicatorText}>
            {currentStepIndex + 1} / {steps.length} étapes
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
