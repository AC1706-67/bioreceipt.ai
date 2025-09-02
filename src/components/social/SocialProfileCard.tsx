/**
 * Social Profile Card
 * Component for displaying user's social profile information
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image
} from 'react-native';
import { SocialUserProfile } from '../../services/social/socialService';

interface SocialProfileCardProps {
  profile: SocialUserProfile;
  onPress?: () => void;
  compact?: boolean;
}

export const SocialProfileCard: React.FC<SocialProfileCardProps> = ({
  profile,
  onPress,
  compact = false
}) => {
  const formatJoinDate = (date: Date) => {
    return `Joined ${date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    })}`;
  };

  const getLevelInfo = (level: number) => {
    const levelNames = [
      'Beginner', 'Explorer', 'Enthusiast', 'Expert', 'Master', 'Legend'
    ];
    return levelNames[Math.min(level - 1, levelNames.length - 1)] || 'Legend';
  };

  if (compact) {
    return (
      <TouchableOpacity 
        style={styles.compactContainer}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.compactContent}>
          <View style={styles.compactAvatar}>
            {profile.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {profile.displayName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.compactInfo}>
            <Text style={styles.compactName}>{profile.displayName}</Text>
            <Text style={styles.compactLevel}>
              Level {profile.stats.level} • {getLevelInfo(profile.stats.level)}
            </Text>
          </View>
          <View style={styles.compactStats}>
            <Text style={styles.compactStatValue}>{profile.stats.points}</Text>
            <Text style={styles.compactStatLabel}>Points</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.fullAvatar} />
          ) : (
            <View style={styles.fullAvatarPlaceholder}>
              <Text style={styles.fullAvatarText}>
                {profile.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.displayName}>{profile.displayName}</Text>
          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}
          <Text style={styles.joinDate}>{formatJoinDate(profile.joinedDate)}</Text>
        </View>
      </View>

      {/* Level and Progress */}
      <View style={styles.levelSection}>
        <View style={styles.levelInfo}>
          <Text style={styles.levelText}>
            Level {profile.stats.level} - {getLevelInfo(profile.stats.level)}
          </Text>
          <Text style={styles.pointsText}>{profile.stats.points} points</Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${Math.min((profile.stats.points % 1000) / 10, 100)}%` }
            ]}
          />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.stats.tipsShared}</Text>
          <Text style={styles.statLabel}>Tips Shared</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.stats.tipsCompleted}</Text>
          <Text style={styles.statLabel}>Tips Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{profile.stats.streakDays}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>

      {/* Connections */}
      <View style={styles.connectionsContainer}>
        <View style={styles.connectionItem}>
          <Text style={styles.connectionValue}>{profile.connections.following.length}</Text>
          <Text style={styles.connectionLabel}>Following</Text>
        </View>
        <View style={styles.connectionItem}>
          <Text style={styles.connectionValue}>{profile.connections.followers.length}</Text>
          <Text style={styles.connectionLabel}>Followers</Text>
        </View>
      </View>

      {/* Badges */}
      {profile.stats.badges.length > 0 && (
        <View style={styles.badgesContainer}>
          <Text style={styles.badgesTitle}>Recent Badges</Text>
          <View style={styles.badgesList}>
            {profile.stats.badges.slice(0, 3).map((badge, index) => (
              <View key={index} style={styles.badge}>
                <Text style={styles.badgeText}>🏆</Text>
              </View>
            ))}
            {profile.stats.badges.length > 3 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>+{profile.stats.badges.length - 3}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Compact styles
  compactContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12
  },
  compactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  compactInfo: {
    flex: 1
  },
  compactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  compactLevel: {
    fontSize: 12,
    color: '#666'
  },
  compactStats: {
    alignItems: 'center'
  },
  compactStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF'
  },
  compactStatLabel: {
    fontSize: 10,
    color: '#666'
  },

  // Full profile styles
  container: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 12
  },
  avatarContainer: {
    marginRight: 16
  },
  fullAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  fullAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  fullAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold'
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  displayName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  bio: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18
  },
  joinDate: {
    fontSize: 12,
    color: '#999'
  },
  levelSection: {
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  levelInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  pointsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500'
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4'
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2
  },
  statLabel: {
    fontSize: 12,
    color: '#666'
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e9ecef',
    marginHorizontal: 8
  },
  connectionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'space-around'
  },
  connectionItem: {
    alignItems: 'center'
  },
  connectionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  connectionLabel: {
    fontSize: 12,
    color: '#666'
  },
  badgesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f4'
  },
  badgesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  badgesList: {
    flexDirection: 'row'
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff3cd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600'
  }
});