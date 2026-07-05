// TODO: This is temporary until we get coordinates from the backend
// In production, coordinates should come from the database via the API

export const STOP_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  // Yopougon
  'Carrefour La Vie': { latitude: 5.3450, longitude: -4.0700 },
  'Yopougon Toit Rouge': { latitude: 5.3500, longitude: -4.0800 },
  'Yopougon Marché': { latitude: 5.3480, longitude: -4.0650 },
  'Yopougon SOTRA Terminus': { latitude: 5.3420, longitude: -4.0750 },
  
  // Koumassi
  'Koumassi Remblai': { latitude: 5.3000, longitude: -3.9800 },
  'Koumassi Grand Carrefour': { latitude: 5.3050, longitude: -3.9750 },
  'Koumassi SOTRA Terminus': { latitude: 5.2980, longitude: -3.9820 },
  
  // Treichville
  'Treichville Gare Sud': { latitude: 5.2950, longitude: -3.9900 },
  'Treichville Marché': { latitude: 5.2920, longitude: -3.9870 },
  
  // Adjamé
  'Adjamé Liberté': { latitude: 5.3600, longitude: -4.0100 },
  'Adjamé 220 Logements': { latitude: 5.3650, longitude: -4.0050 },
  
  // Plateau
  'Plateau Gare Nord': { latitude: 5.3200, longitude: -4.0200 },
  'Plateau SOTRA Terminus': { latitude: 5.3250, longitude: -4.0180 },
};

export function getStopCoordinates(stopName: string): { latitude: number; longitude: number } | null {
  // Try exact match first
  if (STOP_COORDINATES[stopName]) {
    return STOP_COORDINATES[stopName];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(STOP_COORDINATES)) {
    if (stopName.includes(key) || key.includes(stopName)) {
      return value;
    }
  }
  
  console.warn(`No coordinates found for stop: ${stopName}`);
  return null;
}
