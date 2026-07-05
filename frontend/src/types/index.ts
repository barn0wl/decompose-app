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
  from: string;
  to: string;
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
  transportType: string;
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
  transportType: string;
  basePrice: number;
  durationMinutes: number;
  routeDescription?: string;
  upvotes: number;
  downvotes: number;
  voteScore: number;
}
