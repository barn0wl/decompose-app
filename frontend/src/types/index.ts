// ─── Navigation ───────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Home: undefined; // no params needed
  Results: {
    originId: string;
    originName: string;
    destinationId: string;
    destinationName: string;
    optimizeBy: 'price' | 'time' | 'balanced';
    routes: CalculatedRoute[];
  };
  RouteDetail: {
    route: CalculatedRoute;
    originName: string;
    destinationName: string;
  };
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
  type: 'communal_taxi' | 'gbaka' | 'walking';
  from: string;
  to: string;
  price: number;
  duration: number;
  instructions: string;
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
