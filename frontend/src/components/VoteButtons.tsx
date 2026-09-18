import { useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';

import { COLORS, FONTS } from '../constants/theme';

import ArrowUpIcon from '../../assets/icons/arrow-up.svg';
import ArrowDownIcon from '../../assets/icons/arrow-down.svg';

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
  size = 'small',
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(upvotes);
  const [localDownvotes, setLocalDownvotes] = useState(downvotes);
  const [localUserVote, setLocalUserVote] = useState(userVote);

  const isSmall = size === 'small';
  const iconSize = isSmall ? 14 : 18;

  const handleVote = async (vote: 1 | -1) => {
    if (isLoading) return;

    const previousUserVote = localUserVote;
    const previousUpvotes = localUpvotes;
    const previousDownvotes = localDownvotes;

    let newUpvotes = localUpvotes;
    let newDownvotes = localDownvotes;
    if (previousUserVote === 1) newUpvotes--;
    else if (previousUserVote === -1) newDownvotes--;

    let newUserVote: 1 | -1 | 0 = 0;
    if (previousUserVote !== vote) {
      if (vote === 1) newUpvotes++;
      else if (vote === -1) newDownvotes++;
      newUserVote = vote;
    }

    setLocalUpvotes(newUpvotes);
    setLocalDownvotes(newDownvotes);
    setLocalUserVote(newUserVote);
    setIsLoading(true);

    try {
      await onVote(connectionId, vote);
    } catch (error) {
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

  const isUpvoted = localUserVote === 1;
  const isDownvoted = localUserVote === -1;

  return (
    <View style={[styles.container, isSmall && styles.containerSmall]}>
      {/* Upvote button */}
      <TouchableOpacity
        onPress={() => handleVote(1)}
        disabled={isLoading}
        activeOpacity={0.7}
        style={[
          styles.button,
          isSmall && styles.buttonSmall,
          isUpvoted && styles.buttonUpvoted,
        ]}
      >
        <ArrowUpIcon
          width={iconSize}
          height={iconSize}
          fill={isUpvoted ? COLORS.textLight : COLORS.primary}
        />
      </TouchableOpacity>

      {/* Score */}
      <View style={[styles.scoreContainer, isSmall && styles.scoreContainerSmall]}>
        {isLoading ? (
          <ActivityIndicator size={isSmall ? 12 : 16} color={COLORS.primary} />
        ) : (
          <>
            <Text
              style={[
                styles.scoreText,
                voteScore > 0 && styles.positiveScore,
                voteScore < 0 && styles.negativeScore,
                isSmall && styles.scoreTextSmall,
              ]}
            >
              {voteScore > 0 ? `+${voteScore}` : voteScore}
            </Text>
            <Text style={[styles.totalVotes, isSmall && styles.totalVotesSmall]}>
              {totalVotes}
            </Text>
          </>
        )}
      </View>

      {/* Downvote button */}
      <TouchableOpacity
        onPress={() => handleVote(-1)}
        disabled={isLoading}
        activeOpacity={0.7}
        style={[
          styles.button,
          isSmall && styles.buttonSmall,
          isDownvoted && styles.buttonDownvoted,
        ]}
      >
        <ArrowDownIcon
          width={iconSize}
          height={iconSize}
          fill={isDownvoted ? COLORS.textLight : COLORS.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  containerSmall: {
    borderRadius: 16,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  buttonUpvoted: {
    backgroundColor: COLORS.primary,
  },
  buttonDownvoted: {
    backgroundColor: '#B00020',
  },
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    paddingHorizontal: 4,
  },
  scoreContainerSmall: {
    minWidth: 28,
  },
  scoreText: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    lineHeight: 18,
  },
  scoreTextSmall: {
    fontSize: 13,
    lineHeight: 15,
  },
  positiveScore: {
    color: COLORS.primary,
  },
  negativeScore: {
    color: '#B00020',
  },
  totalVotes: {
    fontSize: 10,
    color: COLORS.textMuted,
    lineHeight: 12,
  },
  totalVotesSmall: {
    fontSize: 9,
  },
});
