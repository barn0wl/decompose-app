import { API_BASE_URL } from '../constants';
import { Stop, CalculateRouteResponse, SuggestedConnection, Connection } from '../types';

// ─── Errors ────────────────────────────────────────────────────────────────

/**
 * Structured API error. Thrown by apiFetch when the backend returns a
 * non-2xx response. Preserves the `code` and `hint` fields the router
 * provides for actionable user guidance (e.g., NO_VALID_ROUTE).
 */
export class ApiError extends Error {
  code?: string;
  hint?: string;
  status: number;

  constructor(
    message: string,
    status: number,
    code?: string,
    hint?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.hint = hint;
  }
}

// ─── Generic fetch wrapper ─────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({} as any));

    // Backend sends one of these shapes:
    //   { error: 'CODE', message: '...', hint: '...' }   (structured, e.g. NO_VALID_ROUTE)
    //   { error: 'some message' }                         (plain, generic errors)
    const code = typeof body?.error === 'string' ? body.error : undefined;
    const message = body?.message ?? body?.error ?? `Request failed with status ${response.status}`;
    const hint = typeof body?.hint === 'string' ? body.hint : undefined;

    throw new ApiError(message, response.status, code, hint);
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

// ─── Routes ───────────────────────────────────────────────────────────────

export interface CalculateRouteInput {
  originStopId: string;
  destinationStopId: string;
  at?: string;   // ISO timestamp, optional (used for demoing time-of-day)
}

export async function calculateRoute(
  originStopId: string,
  destinationStopId: string,
  at?: string
): Promise<CalculateRouteResponse> {
  return apiFetch<CalculateRouteResponse>('/routes/calculate', {
    method: 'POST',
    body: JSON.stringify({
      originStopId,
      destinationStopId,
      ...(at ? { at } : {}),
    }),
  });
}

// ─── Suggestions ─────────────────────────────────────────────────────────────

export interface CreateSuggestionInput {
  fromStopId: string;
  toStopId: string;
  transportType: 'communal_taxi' | 'gbaka' | 'sotra_bus' | 'walking';
  basePrice: number;
  durationMinutes: number;
  routeDescription?: string;
  deviceId: string;
}

export async function createSuggestion(data: CreateSuggestionInput): Promise<SuggestedConnection> {
  return apiFetch<SuggestedConnection>('/suggestions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPendingSuggestions(deviceId: string): Promise<{
  suggestions: SuggestedConnection[];
  count: number;
}> {
  return apiFetch<{ suggestions: SuggestedConnection[]; count: number }>(
    `/suggestions/pending?deviceId=${deviceId}`
  );
}

export async function confirmSuggestion(
  suggestionId: string,
  deviceId: string
): Promise<{
  success: boolean;
  approved: boolean;
  message: string;
  remainingConfirmations?: number;
  connection?: Connection;
}> {
  return apiFetch(`/suggestions/${suggestionId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ deviceId }),
  });
}

export async function getPendingCount(deviceId: string): Promise<{ count: number }> {
  return apiFetch<{ count: number }>(`/suggestions/pending/count?deviceId=${deviceId}`);
}

// ─── Votes ───────────────────────────────────────────────────────────────────

export interface VoteInput {
  connectionId: string;
  deviceId: string;
  vote: 1 | -1; // 1 = upvote, -1 = downvote
}

export interface VoteResponse {
  success: boolean;
  message: string;
  voteScore: number;
  totalVotes: number;
  userVote: 1 | -1 | 0;
  connection: Connection;
}

export interface VoteStats {
  upvotes: number;
  downvotes: number;
  voteScore: number;
  totalVotes: number;
  userVote: 1 | -1 | 0;
}

export async function getVotesForConnections(
  connectionIds: string[],
  deviceId?: string
): Promise<Record<string, VoteStats>> {
  if (connectionIds.length === 0) return {};
  
  // Fetch votes in parallel
  const results = await Promise.all(
    connectionIds.map(async (id) => {
      try {
        const stats = await getVoteStats(id, deviceId);
        return [id, stats] as const;
      } catch {
        return [id, null] as const;
      }
    })
  );
  
  return results.reduce((acc, [id, stats]) => {
    if (stats) acc[id] = stats;
    return acc;
  }, {} as Record<string, VoteStats>);
}

export async function castVote(data: VoteInput): Promise<VoteResponse> {
  return apiFetch<VoteResponse>('/votes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getVoteStats(
  connectionId: string,
  deviceId?: string
): Promise<VoteStats> {
  const url = deviceId
    ? `/votes/${connectionId}?deviceId=${deviceId}`
    : `/votes/${connectionId}`;
  return apiFetch<VoteStats>(url);
}

/**
 * Get vote stats for multiple connections in one request
 * More efficient than fetching one by one
 */
export async function getBulkVoteStats(
  connectionIds: string[],
  deviceId?: string
): Promise<Record<string, VoteStats>> {
  if (connectionIds.length === 0) return {};
  
  const params = new URLSearchParams({
    connectionIds: connectionIds.join(','),
  });
  if (deviceId) {
    params.append('deviceId', deviceId);
  }
  
  return apiFetch<Record<string, VoteStats>>(`/votes/bulk?${params.toString()}`);
}
