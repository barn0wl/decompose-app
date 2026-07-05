import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface Props {
  score: number;        // 0-100
  totalVotes: number;
  size?: 'small' | 'medium';
}

export default function TrustIndicator({ score, totalVotes, size = 'small' }: Props) {
  const isSmall = size === 'small';
  
  // Determine color based on score
  let color = '#888';
  let label = 'No votes';
  
  if (totalVotes === 0) {
    color = '#888';
    label = 'No votes';
  } else if (score >= 70) {
    color = '#4CAF50';
    label = '👍 Trusted';
  } else if (score >= 40) {
    color = '#FF9800';
    label = '🤔 Mixed';
  } else {
    color = '#f44336';
    label = '⚠️ Low trust';
  }

  // Get emoji based on score
  let emoji = '⚪';
  if (totalVotes === 0) {
    emoji = '⚪';
  } else if (score >= 70) {
    emoji = '🟢';
  } else if (score >= 40) {
    emoji = '🟠';
  } else {
    emoji = '🔴';
  }

  return (
    <View style={[styles.container, isSmall && styles.containerSmall]}>
      <View style={[styles.indicator, { backgroundColor: color, opacity: totalVotes === 0 ? 0.3 : 1 }]} />
      <Text style={[
        styles.scoreText,
        isSmall && styles.scoreTextSmall,
        { color }
      ]}>
        {emoji} {score}%
      </Text>
      {totalVotes > 0 && (
        <Text style={[styles.votesText, isSmall && styles.votesTextSmall]}>
          ({totalVotes} vote{totalVotes > 1 ? 's' : ''})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  containerSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  scoreTextSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  votesText: {
    fontSize: 11,
    color: '#888',
  },
  votesTextSmall: {
    fontSize: 9,
    color: '#888',
  },
});
