import { useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';

interface Props {
  connectionId: string;
  upvotes: number;
  downvotes: number;
  userVote: 1 | -1 | 0;
  onVote: (connectionId: string, vote: 1 | -1) => Promise<void>;
  size?: 'small' | 'medium';
}

export default function VoteButtons({ 
  connectionId, 
  upvotes, 
  downvotes, 
  userVote,
  onVote,
  size = 'small'
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(upvotes);
  const [localDownvotes, setLocalDownvotes] = useState(downvotes);
  const [localUserVote, setLocalUserVote] = useState(userVote);

  const isSmall = size === 'small';

  const handleVote = async (vote: 1 | -1) => {
    if (isLoading) return;
    
    // Optimistic update
    const previousUserVote = localUserVote;
    const previousUpvotes = localUpvotes;
    const previousDownvotes = localDownvotes;

    // Remove previous vote if exists
    let newUpvotes = localUpvotes;
    let newDownvotes = localDownvotes;
    
    if (previousUserVote === 1) newUpvotes--;
    else if (previousUserVote === -1) newDownvotes--;

    // Add new vote if different from current
    let newUserVote: 1 | -1 | 0 = 0;
    if (previousUserVote !== vote) {
      if (vote === 1) newUpvotes++;
      else if (vote === -1) newDownvotes++;
      newUserVote = vote;
    }

    // Update UI optimistically
    setLocalUpvotes(newUpvotes);
    setLocalDownvotes(newDownvotes);
    setLocalUserVote(newUserVote);
    setIsLoading(true);

    try {
      await onVote(connectionId, vote);
    } catch (error) {
      // Revert on error
      setLocalUpvotes(previousUpvotes);
      setLocalDownvotes(previousDownvotes);
      setLocalUserVote(previousUserVote);
      console.error('Vote failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalVotes = localUpvotes + localDownvotes;
  const voteScore = localUpvotes - localDownvotes;

  return (
    <View style={[styles.container, isSmall && styles.containerSmall]}>
      <TouchableOpacity
        onPress={() => handleVote(1)}
        disabled={isLoading}
        style={[styles.button, isSmall && styles.buttonSmall]}
      >
        <Text style={[
          styles.voteIcon,
          localUserVote === 1 && styles.activeUpvote,
          isSmall && styles.voteIconSmall
        ]}>
          ↑
        </Text>
      </TouchableOpacity>

      <View style={[styles.scoreContainer, isSmall && styles.scoreContainerSmall]}>
        {isLoading ? (
          <ActivityIndicator size={isSmall ? 12 : 16} color="#888" />
        ) : (
          <Text style={[
            styles.scoreText,
            voteScore > 0 && styles.positiveScore,
            voteScore < 0 && styles.negativeScore,
            isSmall && styles.scoreTextSmall
          ]}>
            {voteScore}
          </Text>
        )}
        <Text style={[styles.totalVotes, isSmall && styles.totalVotesSmall]}>
          ({totalVotes})
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => handleVote(-1)}
        disabled={isLoading}
        style={[styles.button, isSmall && styles.buttonSmall]}
      >
        <Text style={[
          styles.voteIcon,
          localUserVote === -1 && styles.activeDownvote,
          isSmall && styles.voteIconSmall
        ]}>
          ↓
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  containerSmall: {
    gap: 0,
  },
  button: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  buttonSmall: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  voteIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#888',
  },
  voteIconSmall: {
    fontSize: 16,
  },
  activeUpvote: {
    color: '#4CAF50',
  },
  activeDownvote: {
    color: '#f44336',
  },
  scoreContainer: {
    alignItems: 'center',
    paddingHorizontal: 4,
    minWidth: 32,
  },
  scoreContainerSmall: {
    minWidth: 24,
    paddingHorizontal: 2,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  scoreTextSmall: {
    fontSize: 13,
  },
  positiveScore: {
    color: '#4CAF50',
  },
  negativeScore: {
    color: '#f44336',
  },
  totalVotes: {
    fontSize: 10,
    color: '#888',
  },
  totalVotesSmall: {
    fontSize: 8,
  },
});
