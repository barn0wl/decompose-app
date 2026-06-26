import prisma from '../lib/prisma';

interface VoteInput {
  connectionId: string;
  deviceId: string;
  vote: 1 | -1; // 1 = upvote, -1 = downvote
}

export class VoteService {
  /**
   * Cast a vote on a connection
   * If user already voted, update their vote
   */
  async castVote(input: VoteInput) {
    const connection = await prisma.connection.findUnique({
      where: { id: input.connectionId }
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    // Get current votes
    const votedBy = (connection.votedBy as any[]) || [];
    const existingVoteIndex = votedBy.findIndex(v => v.deviceId === input.deviceId);
    
    let newVotedBy = [...votedBy];
    let upvotes = connection.upvotes;
    let downvotes = connection.downvotes;

    if (existingVoteIndex !== -1) {
      // User already voted - update their vote
      const oldVote = votedBy[existingVoteIndex].vote;
      
      // Remove old vote
      if (oldVote === 1) upvotes--;
      else if (oldVote === -1) downvotes--;
      
      // Update with new vote
      newVotedBy[existingVoteIndex] = { deviceId: input.deviceId, vote: input.vote };
    } else {
      // New vote
      newVotedBy.push({ deviceId: input.deviceId, vote: input.vote });
    }

    // Add new vote
    if (input.vote === 1) upvotes++;
    else if (input.vote === -1) downvotes++;

    const voteScore = upvotes - downvotes;

    // Update connection
    const updatedConnection = await prisma.connection.update({
      where: { id: input.connectionId },
      data: {
        upvotes,
        downvotes,
        voteScore,
        votedBy: newVotedBy,
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
  }

  /**
   * Get vote stats for a connection
   */
  async getVoteStats(connectionId: string) {
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
    };
  }

  /**
   * Get user's vote on a connection
   */
  async getUserVote(connectionId: string, deviceId: string) {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      select: { votedBy: true }
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    const votedBy = (connection.votedBy as any[]) || [];
    const userVote = votedBy.find(v => v.deviceId === deviceId);
    
    return userVote ? userVote.vote : 0;
  }
}

export const voteService = new VoteService();
