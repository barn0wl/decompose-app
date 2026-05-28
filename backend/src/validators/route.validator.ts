import { z } from 'zod';

export const calculateRouteSchema = z.object({
  originStopId: z.string().min(1, 'Origin stop ID is required'),
  destinationStopId: z.string().min(1, 'Destination stop ID is required'),
  optimizeBy: z.enum(['price', 'time', 'balanced']).default('price')
});

export type CalculateRouteInput = z.infer<typeof calculateRouteSchema>;