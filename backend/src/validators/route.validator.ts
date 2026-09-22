import { z } from 'zod';

export const calculateRouteSchema = z.object({
  originStopId: z.string().min(1, 'Origin stop ID is required'),
  destinationStopId: z.string().min(1, 'Destination stop ID is required'),
  // Optional ISO timestamp for demoing time-of-day duration multipliers.
  // If omitted, the server uses "now".
  at: z.string().datetime().optional(),
});

export type CalculateRouteInput = z.infer<typeof calculateRouteSchema>;
