// ─── Navigation ───────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Home: undefined;
  Results: {
    originId: string;
    originName: string;
    destinationId: string;
    destinationName: string;
    optimizeBy: 'price' | 'time' | 'balanced';
    routes: CalculatedRoute[];
    routeLimit?: number;
  };
  RouteDetail: {
    selectedRoute: CalculatedRoute;
    originName: string;
    destinationName: string;
  };
  SuggestConnection: undefined;
  PendingConfirmations: undefined;
};

// ─── API types (mirror your backend) ──────────────────────────────────────────

export interface Stop {
  id: string;
  name: string;
  commune: string;
  latitude: number;
  longitude: number;
  type: 'taxi_stop' | 'gbaka_station' | 'landmark' | 'zone_boundary';
}

export interface RouteStep {
  type: 'communal_taxi' | 'gbaka' | 'sotra_bus' | 'walking';
  from: string;        // Stop name
  to: string;          // Stop name
  price: number;
  duration: number;
  instructions: string;
  connectionId?: string;
  stepIndex?: number;
  // Coordinates for map visualization
  fromLatitude?: number;
  fromLongitude?: number;
  toLatitude?: number;
  toLongitude?: number;
}

export interface CalculatedRoute {
  id: string;
  totalPrice: number;
  totalDuration: number;
  steps: RouteStep[];
  trustScore?: {
    score: number;      // 0-100
    totalVotes: number;
    stepCount: number;
    averageScore: number;
  };
  // Comparison metadata (for multi-route support)
  rank?: number;
  isFastest?: boolean;
  isCheapest?: boolean;
  isBestBalanced?: boolean;
}

export interface CalculateRouteResponse {
  origin: Pick<Stop, 'id' | 'name' | 'commune'>;
  destination: Pick<Stop, 'id' | 'name' | 'commune'>;
  routes: CalculatedRoute[];
  optimizedFor: 'price' | 'time' | 'balanced';
}

// ─── Suggestion Types ────────────────────────────────────────────────────────

export interface SuggestedConnection {
  id: string;
  fromStopId: string;
  toStopId: string;
  fromStop: Stop;
  toStop: Stop;
  transportType: 'communal_taxi' | 'gbaka' | 'sotra_bus' | 'walking';
  basePrice: number;
  durationMinutes: number;
  routeDescription?: string;
  submittedBy: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto_rejected';
  confirmations: number;
  confirmationThreshold: number;
  confirmedBy: string[];
}

export interface Connection {
  id: string;
  fromStopId: string;
  toStopId: string;
  fromStop?: Stop;
  toStop?: Stop;
  transportType: 'communal_taxi' | 'gbaka' | 'sotra_bus' | 'walking';
  basePrice: number;
  durationMinutes: number;
  routeDescription?: string;
  upvotes: number;
  downvotes: number;
  voteScore: number;
}

// ─── Utility Types ──────────────────────────────────────────────────────────

/**
 * Helper to get step count for display
 */
export function getStepCount(route: CalculatedRoute): number {
  return route.steps.length;
}

/**
 * Helper to get transport type emoji/icon
 */
export function getTransportIcon(type: RouteStep['type']): string {
  const icons = {
    'communal_taxi': '🚕',
    'gbaka': '🚐',
    'sotra_bus': '🚌',
    'walking': '🚶',
  };
  return icons[type] || '🚗';
}

/**
 * Helper to get transport type display name
 */
export function getTransportDisplayName(type: RouteStep['type']): string {
  const names = {
    'communal_taxi': 'Taxi',
    'gbaka': 'Gbaka',
    'sotra_bus': 'SOTRA Bus',
    'walking': 'Walk',
  };
  return names[type] || type;
}

/**
 * Helper to format price
 */
export function formatPrice(price: number): string {
  return `${price} CFA`;
}

/**
 * Helper to format duration
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Helper to get route summary
 */
export function getRouteSummary(route: CalculatedRoute): string {
  const parts: string[] = [];
  const stepTypes = route.steps.map(s => s.type);
  
  // Count transport types
  const typeCounts = stepTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const typeNames: Record<string, string> = {
    'communal_taxi': 'taxi',
    'gbaka': 'gbaka',
    'sotra_bus': 'bus',
    'walking': 'walk',
  };
  
  const entries = Object.entries(typeCounts);
  if (entries.length === 1) {
    const [type, count] = entries[0];
    return `${count}x ${typeNames[type]}`;
  }
  
  return entries.map(([type, count]) => `${count}x ${typeNames[type]}`).join(' + ');
}

/**
 * Helper to determine if a route has walking sections
 */
export function hasWalking(route: CalculatedRoute): boolean {
  return route.steps.some(s => s.type === 'walking');
}

/**
 * Helper to get walking distance approximation (if walking steps exist)
 */
export function getWalkingDistance(route: CalculatedRoute): number | null {
  let totalDistance = 0;
  let hasWalkingSteps = false;
  
  for (const step of route.steps) {
    if (step.type === 'walking' && step.duration) {
      // Approximate: walking speed ~83m/min
      totalDistance += step.duration * 83;
      hasWalkingSteps = true;
    }
  }
  
  return hasWalkingSteps ? totalDistance : null;
}

/**
 * Helper to format walking distance
 */
export function formatWalkingDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Helper to get trust score color
 */
export function getTrustScoreColor(score: number): string {
  if (score >= 80) return '#4CAF50'; // Green
  if (score >= 60) return '#FFC107'; // Yellow
  if (score >= 40) return '#FF9800'; // Orange
  return '#F44336'; // Red
}

/**
 * Helper to get trust score label
 */
export function getTrustScoreLabel(score: number): string {
  if (score >= 80) return 'High Trust';
  if (score >= 60) return 'Good Trust';
  if (score >= 40) return 'Medium Trust';
  return 'Low Trust';
}
