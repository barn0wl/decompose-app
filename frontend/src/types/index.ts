// src/types.ts

// ─── Shared Transport Types ────────────────────────────────────────────────

export type TransportType = 'communal_taxi' | 'gbaka' | 'sotra_bus' | 'walking';

// ─── API Errors ────────────────────────────────────────────────────────────

export interface ApiErrorBody {
  error: string;
  message?: string;
  hint?: string;
  context?: Record<string, unknown>;
}

// ─── Navigation ───────────────────────────────────────────────────────────

export type RootStackParamList = {
  Home: undefined;
  RouteDetail: {
    route: CalculatedRoute;
    originName: string;
    destinationName: string;
  };
  SuggestConnection: undefined;
  PendingConfirmations: undefined;
};

// ─── API Types ────────────────────────────────────────────────────────────

export interface Stop {
  id: string;
  name: string;
  commune: string;
  latitude: number;
  longitude: number;
  type: 'taxi_stop' | 'gbaka_station' | 'landmark' | 'zone_boundary';
}

export interface StopRef {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

// ─── Pricing ──────────────────────────────────────────────────────────────

export type PricingRule =
  | { type: 'flat'; price: number }
  | { type: 'banded'; bands: Array<{ uptoSequence: number; price: number }> };

// ─── Legs ─────────────────────────────────────────────────────────────────

export interface BoardingLeg {
  type: 'boarding';
  routeId: string;
  routeName: string;
  transportType: TransportType;

  fromStop: StopRef;
  toStop: StopRef;
  intermediateStops: StopRef[];

  price: number;
  pricingRule: PricingRule;
  distanceStops: number;

  baseDuration: number;
  effectiveDuration: number;
  durationMultiplier: number;

  fromLatitude: number;
  fromLongitude: number;
  toLatitude: number;
  toLongitude: number;
}

export interface WalkingLeg {
  type: 'walking';
  fromStop: StopRef;
  toStop: StopRef;

  distanceM: number;
  baseDuration: number;
  effectiveDuration: number;
  instructions: string;

  fromLatitude: number;
  fromLongitude: number;
  toLatitude: number;
  toLongitude: number;
}

export type Leg = BoardingLeg | WalkingLeg;

// ─── Route ────────────────────────────────────────────────────────────────

export interface DurationContext {
  at: string;                   // ISO string over the wire
  timeOfDayLabel: string;
  durationMultiplier: number;
}

export interface CalculatedRoute {
  id: string;
  legs: Leg[];

  totalPrice: number;
  totalBaseDuration: number;
  totalEffectiveDuration: number;
  totalWalkingDistanceM: number;

  boardingCount: number;
  walkingCount: number;

  durationContext: DurationContext;
}

export interface CalculateRouteResponse {
  origin: Pick<Stop, 'id' | 'name' | 'commune'>;
  destination: Pick<Stop, 'id' | 'name' | 'commune'>;
  route: CalculatedRoute;
}

// ─── Suggestions (kept for backward compatibility — feature is orphaned) ──

export interface SuggestedConnection {
  id: string;
  fromStopId: string;
  toStopId: string;
  fromStop: Stop;
  toStop: Stop;
  transportType: TransportType;
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
  transportType: TransportType;
  basePrice: number;
  durationMinutes: number;
  routeDescription?: string;
  upvotes: number;
  downvotes: number;
  voteScore: number;
}

// ─── Utility Helpers ──────────────────────────────────────────────────────

export function formatPrice(price: number): string {
  return `${price} CFA`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

export function formatWalkingDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
}

export function getTransportDisplayName(type: TransportType): string {
  const names: Record<TransportType, string> = {
    'communal_taxi': 'Taxi',
    'gbaka': 'Gbaka',
    'sotra_bus': 'SOTRA Bus',
    'walking': 'Marche',
  };
  return names[type] ?? type;
}

export function getTransportIcon(type: TransportType): string {
  const icons: Record<TransportType, string> = {
    'communal_taxi': '🚕',
    'gbaka': '🚐',
    'sotra_bus': '🚌',
    'walking': '🚶',
  };
  return icons[type] ?? '🚗';
}
