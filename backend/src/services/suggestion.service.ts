import prisma from '@lib/prisma';
import { TransportType } from '@generated/prisma';

interface CreateSuggestionInput {
  fromStopId: string;
  toStopId: string;
  transportType: TransportType;
  basePrice: number;
  durationMinutes: number;
  routeDescription?: string;
  submittedBy: string; // device ID
}

interface ConfirmSuggestionInput {
  suggestionId: string;
  confirmedBy: string; // device ID
}

export class SuggestionService {
  /**
   * Create a new connection suggestion
   */
  async createSuggestion(input: CreateSuggestionInput) {
    // Validate that stops exist
    const fromStop = await prisma.stop.findUnique({
      where: { id: input.fromStopId }
    });
    const toStop = await prisma.stop.findUnique({
      where: { id: input.toStopId }
    });

    if (!fromStop || !toStop) {
      throw new Error('One or both stops not found');
    }

    // Check if this connection already exists
    const existing = await prisma.connection.findFirst({
      where: {
        fromStopId: input.fromStopId,
        toStopId: input.toStopId,
        transportType: input.transportType,
      }
    });

    if (existing) {
      throw new Error('This connection already exists');
    }

    // Check if there's already a pending suggestion for this connection
    const pendingSuggestion = await prisma.suggestedConnection.findFirst({
      where: {
        fromStopId: input.fromStopId,
        toStopId: input.toStopId,
        transportType: input.transportType,
        status: 'pending',
      }
    });

    if (pendingSuggestion) {
      throw new Error('A suggestion for this connection is already pending review');
    }

    // Create the suggestion
    const suggestion = await prisma.suggestedConnection.create({
      data: {
        fromStopId: input.fromStopId,
        toStopId: input.toStopId,
        transportType: input.transportType,
        basePrice: input.basePrice,
        durationMinutes: input.durationMinutes,
        routeDescription: input.routeDescription,
        submittedBy: input.submittedBy,
        confirmations: 0,
        confirmationThreshold: 5,
        status: 'pending',
        confirmedBy: [], // Empty array initially
      },
      include: {
        fromStop: true,
        toStop: true,
      }
    });

    return suggestion;
  }

  /**
   * Get pending suggestions for a user to confirm
   * Optionally filter by area (based on stops near a search)
   */
  async getPendingSuggestions(deviceId: string, limit: number = 10) {
    // Get pending suggestions that the user hasn't already confirmed
    const suggestions = await prisma.suggestedConnection.findMany({
      where: {
        status: 'pending',
        NOT: {
          confirmedBy: {
            array_contains: [deviceId]
          }
        },
        submittedBy: {
          not: deviceId // Don't show user's own suggestions
        }
      },
      include: {
        fromStop: true,
        toStop: true,
      },
      take: limit,
      orderBy: {
        createdAt: 'asc' // Show oldest first
      }
    });

    return suggestions;
  }

  /**
   * Confirm a suggestion
   * If it reaches the threshold, it becomes an active connection
   */
  async confirmSuggestion(input: ConfirmSuggestionInput) {
    const suggestion = await prisma.suggestedConnection.findUnique({
      where: { id: input.suggestionId },
      include: {
        fromStop: true,
        toStop: true,
      }
    });

    if (!suggestion) {
      throw new Error('Suggestion not found');
    }

    if (suggestion.status !== 'pending') {
      throw new Error(`Suggestion is already ${suggestion.status}`);
    }

    // Check if user already confirmed
    const confirmedBy = (suggestion.confirmedBy as string[]) || [];
    if (confirmedBy.includes(input.confirmedBy)) {
      throw new Error('You have already confirmed this suggestion');
    }

    // Add user to confirmed list
    const updatedConfirmedBy = [...confirmedBy, input.confirmedBy];
    const newConfirmationCount = suggestion.confirmations + 1;

    // Check if threshold is reached
    if (newConfirmationCount >= suggestion.confirmationThreshold) {
      // APPROVE: Create actual connection
      const connection = await prisma.$transaction(async (tx) => {
        // Create the real connection
        const newConnection = await tx.connection.create({
          data: {
            fromStopId: suggestion.fromStopId,
            toStopId: suggestion.toStopId,
            transportType: suggestion.transportType,
            basePrice: suggestion.basePrice,
            durationMinutes: suggestion.durationMinutes,
            routeDescription: suggestion.routeDescription,
            upvotes: 0,
            downvotes: 0,
            voteScore: 0,
          },
        });

        // Update suggestion status to approved
        await tx.suggestedConnection.update({
          where: { id: suggestion.id },
          data: {
            status: 'approved',
            confirmations: newConfirmationCount,
            confirmedBy: updatedConfirmedBy,
            approvedAt: new Date(),
          },
        });

        return newConnection;
      });

      return {
        approved: true,
        connection,
        suggestion: {
          ...suggestion,
          confirmations: newConfirmationCount,
          confirmedBy: updatedConfirmedBy,
          status: 'approved',
        }
      };
    } else {
      // NOT APPROVED YET: Just update confirmation count
      const updatedSuggestion = await prisma.suggestedConnection.update({
        where: { id: suggestion.id },
        data: {
          confirmations: newConfirmationCount,
          confirmedBy: updatedConfirmedBy,
        },
        include: {
          fromStop: true,
          toStop: true,
        }
      });

      return {
        approved: false,
        suggestion: updatedSuggestion,
        remainingConfirmations: suggestion.confirmationThreshold - newConfirmationCount,
      };
    }
  }

  /**
   * Get suggestion details
   */
  async getSuggestion(id: string) {
    return prisma.suggestedConnection.findUnique({
      where: { id },
      include: {
        fromStop: true,
        toStop: true,
      }
    });
  }

  /**
   * Get pending suggestions count (for banner)
   */
  async getPendingCount(deviceId: string) {
    const count = await prisma.suggestedConnection.count({
      where: {
        status: 'pending',
        NOT: {
          confirmedBy: {
            array_contains: [deviceId]
          }
        },
        submittedBy: {
          not: deviceId
        }
      }
    });
    return count;
  }
}

export const suggestionService = new SuggestionService();
