import { TransportType } from '../types';

export const TRANSPORT_LABELS: Record<TransportType, string> = {
  communal_taxi: 'Taxi',
  gbaka: 'Gbaka',
  sotra_bus: 'SOTRA',
  walking: 'À pied',
};

export const TRANSPORT_COLORS: Record<TransportType, string> = {
  communal_taxi: '#D4A843',
  gbaka: '#47A8BD',
  sotra_bus: '#1A4A4A',
  walking: '#9E9E9E',
};