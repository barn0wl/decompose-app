import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Stop {
  id: string;
  name: string;
  commune: string;
  latitude: number;
  longitude: number;
  type: string;
  zoneId?: string;
  zone?: { id: string; name: string };
}

export interface Connection {
  id: string;
  fromStopId?: string;
  toStopId?: string;
  fromStop?: Stop;
  toStop?: Stop;
  fromZoneId?: string;
  toZoneId?: string;
  fromZone?: { id: string; name: string };
  toZone?: { id: string; name: string };
  transportType: string;
  basePrice: number;
  durationMinutes: number;
  routeDescription?: string;
  upvotes: number;
  downvotes: number;
  voteScore: number;
}

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

// ─── Suggestions ────────────────────────────────────────────────────────

export async function getPendingSuggestions(): Promise<SuggestedConnection[]> {
  const response = await api.get('/admin/suggestions/pending');
  return response.data;
}

export async function approveSuggestion(id: string): Promise<Connection> {
  const response = await api.post(`/admin/suggestions/${id}/approve`);
  return response.data;
}

export async function rejectSuggestion(id: string, reason?: string): Promise<void> {
  await api.post(`/admin/suggestions/${id}/reject`, { reason });
}

// ─── Connections ────────────────────────────────────────────────────────

export async function getConnections(): Promise<Connection[]> {
  const response = await api.get('/admin/connections');
  return response.data;
}

export async function deleteConnection(id: string): Promise<void> {
  await api.delete(`/admin/connections/${id}`);
}

// ─── Stops ──────────────────────────────────────────────────────────────

export async function getStops(): Promise<Stop[]> {
  const response = await api.get('/admin/stops');
  return response.data;
}

export async function createStop(data: Omit<Stop, 'id'>): Promise<Stop> {
  const response = await api.post('/admin/stops', data);
  return response.data;
}

export async function updateStop(id: string, data: Partial<Stop>): Promise<Stop> {
  const response = await api.put(`/admin/stops/${id}`, data);
  return response.data;
}

export async function deleteStop(id: string): Promise<void> {
  await api.delete(`/admin/stops/${id}`);
}
