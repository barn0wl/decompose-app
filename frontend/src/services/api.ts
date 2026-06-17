import { API_BASE_URL } from '../constants';
import { Stop, CalculateRouteResponse } from '../types';

// ─── Generic fetch wrapper ─────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error ?? `Request failed with status ${response.status}`);
  }

  return response.json();
}

// ─── Stops ────────────────────────────────────────────────────────────────────

export async function searchStops(query: string): Promise<Stop[]> {
  const data = await apiFetch<{ stops: Stop[] }>(
    `/stops/search?q=${encodeURIComponent(query)}`
  );
  return data.stops;
}

export async function getAllStops(): Promise<Stop[]> {
  const data = await apiFetch<{ stops: Stop[] }>('/stops');
  return data.stops;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function calculateRoute(
  originStopId: string,
  destinationStopId: string,
  optimizeBy: 'price' | 'time' | 'balanced' = 'price'
): Promise<CalculateRouteResponse> {
  return apiFetch<CalculateRouteResponse>('/routes/calculate', {
    method: 'POST',
    body: JSON.stringify({ originStopId, destinationStopId, optimizeBy }),
  });
}
