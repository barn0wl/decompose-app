import prisma from '@lib/prisma';

interface VoteInput {
  connectionId: string;
  deviceId: string;
  vote: 1 | -1; // 1 = upvote, -1 = downvote
}

interface VoteStats {
  upvotes: number;
  downvotes: number;
  voteScore: number;
  totalVotes: number;
  userVote: 1 | -1 | 0;
}

export class VoteService {
  /**
   * Cast a vote on a connection
   * If user already voted, update their vote
   * Uses a transaction to ensure consistency between Vote table and denormalized counters
   */
  async castVote(input: VoteInput) {
    // Use a transaction to maintain consistency between Vote table and denormalized counters
    const result = await prisma.$transaction(async (tx) => {
      // Get current connection with denormalized stats
      const connection = await tx.connection.findUnique({
        where: { id: input.connectionId }
      });

      if (!connection) {
        throw new Error('Connection not found');
      }

      // Check if user already voted
      const existingVote = await tx.vote.findUnique({
        where: {
          connectionId_deviceId: {
            connectionId: input.connectionId,
            deviceId: input.deviceId,
          }
        }
      });

      let upvotes = connection.upvotes;
      let downvotes = connection.downvotes;

      if (existingVote) {
        // User already voted - update their vote
        const oldVote = existingVote.vote;
        
        if (oldVote === 1 && input.vote === -1) {
          // Upvote → Downvote: remove upvote, add downvote
          upvotes--;
          downvotes++;
        } else if (oldVote === -1 && input.vote === 1) {
          // Downvote → Upvote: remove downvote, add upvote
          upvotes++;
          downvotes--;
        }
        // If same vote, no change needed

        // Update the vote
        await tx.vote.update({
          where: { id: existingVote.id },
          data: { 
            vote: input.vote,
            updatedAt: new Date(),
          }
        });
      } else {
        // New vote
        if (input.vote === 1) {
          upvotes++;
        } else if (input.vote === -1) {
          downvotes++;
        }

        // Create the vote
        await tx.vote.create({
          data: {
            connectionId: input.connectionId,
            deviceId: input.deviceId,
            vote: input.vote,
          }
        });
      }

      const voteScore = upvotes - downvotes;

      // Update connection denormalized stats
      const updatedConnection = await tx.connection.update({
        where: { id: input.connectionId },
        data: {
          upvotes,
          downvotes,
          voteScore,
        },
        include: {
          fromStop: true,
          toStop: true,
        }
      });

      return {
        connection: updatedConnection,
        userVote: input.vote,
        voteScore,
        totalVotes: upvotes + downvotes,
      };
    });

    return result;
  }

  /**
   * Get vote stats for a single connection
   */
  async getVoteStats(connectionId: string): Promise<VoteStats> {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      select: {
        upvotes: true,
        downvotes: true,
        voteScore: true,
      }
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    return {
      upvotes: connection.upvotes,
      downvotes: connection.downvotes,
      voteScore: connection.voteScore,
      totalVotes: connection.upvotes + connection.downvotes,
      userVote: 0, // No user context in this method
    };
  }

  /**
   * Get user's vote on a connection
   */
  async getUserVote(connectionId: string, deviceId: string): Promise<1 | -1 | 0> {
    const vote = await prisma.vote.findUnique({
      where: {
        connectionId_deviceId: {
          connectionId,
          deviceId,
        }
      },
      select: { vote: true }
    });

    return vote ? (vote.vote as 1 | -1) : 0;
  }

  /**
   * Get vote stats for multiple connections
   * Returns a map of connectionId -> VoteStats
   * Includes user's vote if deviceId is provided
   */
  async getBulkVoteStats(connectionIds: string[], deviceId?: string): Promise<Record<string, VoteStats>> {
    if (connectionIds.length === 0) {
      return {};
    }

    // Get denormalized stats from Connection table (fast)
    const connections = await prisma.connection.findMany({
      where: {
        id: { in: connectionIds },
      },
      select: {
        id: true,
        upvotes: true,
        downvotes: true,
        voteScore: true,
      },
    });

    // Get user's votes if deviceId provided
    let userVotes: Map<string, number> = new Map();
    if (deviceId) {
      const votes = await prisma.vote.findMany({
        where: {
          connectionId: { in: connectionIds },
          deviceId: deviceId,
        },
        select: {
          connectionId: true,
          vote: true,
        },
      });
      userVotes = new Map(votes.map(v => [v.connectionId, v.vote]));
    }

    // Build stats map
    const statsMap: Record<string, VoteStats> = {};
    for (const conn of connections) {
      statsMap[conn.id] = {
        upvotes: conn.upvotes,
        downvotes: conn.downvotes,
        voteScore: conn.voteScore,
        totalVotes: conn.upvotes + conn.downvotes,
        userVote: (userVotes.get(conn.id) as 1 | -1 | 0) || 0,
      };
    }

    return statsMap;
  }

  /**
   * Get detailed vote history for a connection
   * Useful for analytics or debugging
   */
  async getVoteHistory(connectionId: string, limit: number = 100) {
    const votes = await prisma.vote.findMany({
      where: { connectionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        deviceId: true,
        vote: true,
        createdAt: true,
      },
    });

    const stats = await this.getVoteStats(connectionId);

    return {
      ...stats,
      recentVotes: votes,
      totalUniqueVoters: votes.length,
    };
  }

  /**
   * Remove a user's vote (delete vote)
   * Useful for "undo vote" feature
   */
  async removeVote(connectionId: string, deviceId: string) {
    const result = await prisma.$transaction(async (tx) => {
      // Find the vote
      const vote = await tx.vote.findUnique({
        where: {
          connectionId_deviceId: {
            connectionId,
            deviceId,
          }
        }
      });

      if (!vote) {
        throw new Error('Vote not found');
      }

      // Get current connection stats
      const connection = await tx.connection.findUnique({
        where: { id: connectionId },
        select: {
          upvotes: true,
          downvotes: true,
        }
      });

      if (!connection) {
        throw new Error('Connection not found');
      }

      // Update denormalized counters
      let upvotes = connection.upvotes;
      let downvotes = connection.downvotes;

      if (vote.vote === 1) {
        upvotes--;
      } else if (vote.vote === -1) {
        downvotes--;
      }

      const voteScore = upvotes - downvotes;

      // Delete the vote
      await tx.vote.delete({
        where: { id: vote.id }
      });

      // Update connection
      const updatedConnection = await tx.connection.update({
        where: { id: connectionId },
        data: {
          upvotes,
          downvotes,
          voteScore,
        },
        include: {
          fromStop: true,
          toStop: true,
        }
      });

      return {
        connection: updatedConnection,
        removedVote: vote.vote,
        voteScore,
        totalVotes: upvotes + downvotes,
      };
    });

    return result;
  }

  /**
   * Get most voted connections (for "popular routes" feature)
   */
  async getTopVotedConnections(limit: number = 10, minVotes: number = 5) {
    const connections = await prisma.connection.findMany({
      where: {
        // Only consider connections with enough votes to be statistically relevant
        upvotes: { gte: minVotes },
      },
      orderBy: {
        voteScore: 'desc',
      },
      take: limit,
      include: {
        fromStop: true,
        toStop: true,
      },
    });

    return connections.map(conn => ({
      ...conn,
      totalVotes: conn.upvotes + conn.downvotes,
      votePercentage: conn.upvotes / (conn.upvotes + conn.downvotes) * 100,
    }));
  }

  /**
   * Get vote trends over time (for analytics)
   */
  async getVoteTrends(connectionId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const votes = await prisma.vote.findMany({
      where: {
        connectionId,
        createdAt: { gte: startDate },
      },
      select: {
        vote: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by day
    const trends = new Map<string, { upvotes: number; downvotes: number }>();
    
    for (const vote of votes) {
      const date = vote.createdAt.toISOString().split('T')[0];
      const existing = trends.get(date) || { upvotes: 0, downvotes: 0 };
      
      if (vote.vote === 1) {
        existing.upvotes++;
      } else {
        existing.downvotes++;
      }
      
      trends.set(date, existing);
    }

    return Array.from(trends.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));
  }
}

export const voteService = new VoteService();
