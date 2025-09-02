/**
 * Social Hook
 * React hook for social features including sharing, community, and connections
 */
import { useEffect, useState, useCallback } from 'react';
import { 
  SocialService, 
  SocialUserProfile, 
  SocialPost, 
  SocialNotification,
  CommunityChallenge,
  LeaderboardEntry,
  SocialComment
} from '../services/social/socialService';

interface UseSocialOptions {
  userId: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

interface UseSocialReturn {
  // Profile data
  profile: SocialUserProfile | null;
  isProfileLoading: boolean;
  
  // Social feed
  feed: SocialPost[];
  isFeedLoading: boolean;
  feedError: string | null;
  
  // Notifications
  notifications: SocialNotification[];
  unreadCount: number;
  isNotificationsLoading: boolean;
  
  // Challenges
  activeChallenges: CommunityChallenge[];
  isChallengesLoading: boolean;
  
  // Leaderboard
  leaderboard: LeaderboardEntry[];
  isLeaderboardLoading: boolean;
  
  // Actions
  createOrUpdateProfile: (profileData: Partial<SocialUserProfile>) => Promise<SocialUserProfile>;
  shareTip: (tipId: string, shareData: any) => Promise<any>;
  togglePostLike: (postId: string) => Promise<boolean>;
  addComment: (postId: string, content: string, parentCommentId?: string) => Promise<SocialComment>;
  toggleFollow: (targetUserId: string) => Promise<boolean>;
  joinChallenge: (challengeId: string) => Promise<void>;
  createChallenge: (challengeData: any) => Promise<CommunityChallenge>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  refreshFeed: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshLeaderboard: (type?: string, period?: string) => Promise<void>;
  
  // State
  error: string | null;
  isLoading: boolean;
}

export const useSocial = (options: UseSocialOptions): UseSocialReturn => {
  const { userId, autoRefresh = true, refreshInterval = 5 * 60 * 1000 } = options; // 5 minutes
  const socialService = SocialService.getInstance();

  // State
  const [profile, setProfile] = useState<SocialUserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [feed, setFeed] = useState<SocialPost[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(true);
  const [activeChallenges, setActiveChallenges] = useState<CommunityChallenge[]>([]);
  const [isChallengesLoading, setIsChallengesLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize social service
  useEffect(() => {
    if (userId) {
      initializeSocial();
    }
  }, [userId]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !userId) return;

    const interval = setInterval(() => {
      refreshAll();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, userId]);

  const initializeSocial = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize social service
      await socialService.initialize(userId);

      // Load initial data
      await Promise.all([
        loadProfile(),
        loadFeed(),
        loadNotifications(),
        loadActiveChallenges(),
        loadLeaderboard()
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize social features';
      setError(errorMessage);
      console.error('Failed to initialize social features:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const loadProfile = useCallback(async () => {
    try {
      setIsProfileLoading(true);
      
      // Create a basic profile if none exists
      const newProfile = await socialService.createOrUpdateProfile(userId, {
        displayName: 'Health Enthusiast',
        isPublic: true
      });
      setProfile(newProfile);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setIsProfileLoading(false);
    }
  }, [userId]);

  const loadFeed = useCallback(async () => {
    try {
      setIsFeedLoading(true);
      setFeedError(null);
      
      const feedPosts = await socialService.getSocialFeed(userId, {
        limit: 20,
        following: true
      });
      
      setFeed(feedPosts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load social feed';
      setFeedError(errorMessage);
      console.error('Failed to load feed:', err);
    } finally {
      setIsFeedLoading(false);
    }
  }, [userId]);

  const loadNotifications = useCallback(async () => {
    try {
      setIsNotificationsLoading(true);
      
      const userNotifications = await socialService.getNotifications(userId, {
        limit: 50
      });
      
      setNotifications(userNotifications);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsNotificationsLoading(false);
    }
  }, [userId]);

  const loadActiveChallenges = useCallback(async () => {
    try {
      setIsChallengesLoading(true);
      
      // In a real implementation, this would load active challenges
      setActiveChallenges([]);
    } catch (err) {
      console.error('Failed to load challenges:', err);
    } finally {
      setIsChallengesLoading(false);
    }
  }, []);

  const loadLeaderboard = useCallback(async (type: string = 'points', period: string = 'weekly') => {
    try {
      setIsLeaderboardLoading(true);
      
      const leaderboardData = await socialService.getLeaderboard(
        type as any,
        period as any,
        50
      );
      
      setLeaderboard(leaderboardData);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setIsLeaderboardLoading(false);
    }
  }, []);

  // Action handlers
  const createOrUpdateProfile = useCallback(async (profileData: Partial<SocialUserProfile>) => {
    try {
      const updatedProfile = await socialService.createOrUpdateProfile(userId, profileData);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err;
    }
  }, [userId]);

  const shareTip = useCallback(async (tipId: string, shareData: any) => {
    try {
      const result = await socialService.shareTip(userId, tipId, shareData);
      
      // Refresh feed to show new post
      await loadFeed();
      
      // Update profile stats
      if (profile) {
        setProfile({
          ...profile,
          stats: {
            ...profile.stats,
            tipsShared: profile.stats.tipsShared + 1
          }
        });
      }
      
      return result;
    } catch (err) {
      console.error('Failed to share tip:', err);
      throw err;
    }
  }, [userId, profile]);

  const togglePostLike = useCallback(async (postId: string) => {
    try {
      const isLiked = await socialService.togglePostLike(userId, postId);
      
      // Update local feed
      setFeed(prevFeed => 
        prevFeed.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              engagement: {
                ...post.engagement,
                likes: isLiked ? post.engagement.likes + 1 : post.engagement.likes - 1
              }
            };
          }
          return post;
        })
      );
      
      return isLiked;
    } catch (err) {
      console.error('Failed to toggle post like:', err);
      throw err;
    }
  }, [userId]);

  const addComment = useCallback(async (postId: string, content: string, parentCommentId?: string) => {
    try {
      const comment = await socialService.addComment(userId, postId, content, parentCommentId);
      
      // Update local feed
      setFeed(prevFeed => 
        prevFeed.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              engagement: {
                ...post.engagement,
                comments: post.engagement.comments + 1
              }
            };
          }
          return post;
        })
      );
      
      return comment;
    } catch (err) {
      console.error('Failed to add comment:', err);
      throw err;
    }
  }, [userId]);

  const toggleFollow = useCallback(async (targetUserId: string) => {
    try {
      const isFollowing = await socialService.toggleFollow(userId, targetUserId);
      
      // Update local profile
      if (profile) {
        const updatedFollowing = isFollowing 
          ? [...profile.connections.following, targetUserId]
          : profile.connections.following.filter(id => id !== targetUserId);
        
        setProfile({
          ...profile,
          connections: {
            ...profile.connections,
            following: updatedFollowing
          }
        });
      }
      
      return isFollowing;
    } catch (err) {
      console.error('Failed to toggle follow:', err);
      throw err;
    }
  }, [userId, profile]);

  const joinChallenge = useCallback(async (challengeId: string) => {
    try {
      await socialService.joinChallenge(userId, challengeId);
      
      // Refresh challenges and feed
      await Promise.all([
        loadActiveChallenges(),
        loadFeed()
      ]);
    } catch (err) {
      console.error('Failed to join challenge:', err);
      throw err;
    }
  }, [userId]);

  const createChallenge = useCallback(async (challengeData: any) => {
    try {
      const challenge = await socialService.createChallenge(userId, challengeData);
      
      // Refresh challenges
      await loadActiveChallenges();
      
      return challenge;
    } catch (err) {
      console.error('Failed to create challenge:', err);
      throw err;
    }
  }, [userId]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await socialService.markNotificationAsRead(userId, notificationId);
      
      // Update local notifications
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      throw err;
    }
  }, [userId]);

  // Refresh functions
  const refreshFeed = useCallback(async () => {
    await loadFeed();
  }, [loadFeed]);

  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  const refreshLeaderboard = useCallback(async (type?: string, period?: string) => {
    await loadLeaderboard(type, period);
  }, [loadLeaderboard]);

  const refreshAll = useCallback(async () => {
    try {
      await Promise.all([
        loadFeed(),
        loadNotifications(),
        loadActiveChallenges(),
        loadLeaderboard()
      ]);
    } catch (err) {
      console.error('Failed to refresh social data:', err);
    }
  }, [loadFeed, loadNotifications, loadActiveChallenges, loadLeaderboard]);

  // Calculate unread notifications count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    // Profile data
    profile,
    isProfileLoading,
    
    // Social feed
    feed,
    isFeedLoading,
    feedError,
    
    // Notifications
    notifications,
    unreadCount,
    isNotificationsLoading,
    
    // Challenges
    activeChallenges,
    isChallengesLoading,
    
    // Leaderboard
    leaderboard,
    isLeaderboardLoading,
    
    // Actions
    createOrUpdateProfile,
    shareTip,
    togglePostLike,
    addComment,
    toggleFollow,
    joinChallenge,
    createChallenge,
    markNotificationAsRead,
    refreshFeed,
    refreshNotifications,
    refreshLeaderboard,
    
    // State
    error,
    isLoading
  };
};

// Hook for social sharing specifically
export const useSocialSharing = (userId: string) => {
  const socialService = SocialService.getInstance();
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const shareHealthTip = useCallback(async (
    tipId: string,
    shareData: {
      title: string;
      description: string;
      personalNote?: string;
      tags?: string[];
      visibility?: 'public' | 'followers' | 'private';
      platforms?: ('native' | 'facebook' | 'twitter' | 'instagram' | 'whatsapp')[];
    }
  ) => {
    try {
      setIsSharing(true);
      setShareError(null);
      
      const result = await socialService.shareTip(userId, tipId, shareData);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share tip';
      setShareError(errorMessage);
      throw err;
    } finally {
      setIsSharing(false);
    }
  }, [userId]);

  const shareAchievement = useCallback(async (
    achievementData: {
      title: string;
      description: string;
      achievementId: string;
      visibility?: 'public' | 'followers' | 'private';
    }
  ) => {
    try {
      setIsSharing(true);
      setShareError(null);
      
      // In a real implementation, this would create the achievement post
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share achievement';
      setShareError(errorMessage);
      throw err;
    } finally {
      setIsSharing(false);
    }
  }, [userId]);

  return {
    shareHealthTip,
    shareAchievement,
    isSharing,
    shareError
  };
};

// Hook for community challenges
export const useCommunityChallenge = (userId: string, challengeId?: string) => {
  const socialService = SocialService.getInstance();
  const [challenge, setChallenge] = useState<CommunityChallenge | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProgress, setUserProgress] = useState<number>(0);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    if (challengeId) {
      loadChallenge();
    }
  }, [challengeId]);

  const loadChallenge = useCallback(async () => {
    if (!challengeId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // In a real implementation, this would load the challenge
      // For now, we'll set mock data
      setChallenge(null);
      setHasJoined(false);
      setUserProgress(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load challenge';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [challengeId, userId]);

  const joinChallenge = useCallback(async () => {
    if (!challengeId) return;
    
    try {
      await socialService.joinChallenge(userId, challengeId);
      setHasJoined(true);
      await loadChallenge();
    } catch (err) {
      console.error('Failed to join challenge:', err);
      throw err;
    }
  }, [challengeId, userId, loadChallenge]);

  const updateProgress = useCallback(async (progress: number) => {
    if (!challengeId || !hasJoined) return;
    
    try {
      // In a real implementation, this would update progress
      setUserProgress(progress);
    } catch (err) {
      console.error('Failed to update progress:', err);
      throw err;
    }
  }, [challengeId, hasJoined]);

  return {
    challenge,
    isLoading,
    error,
    userProgress,
    hasJoined,
    joinChallenge,
    updateProgress
  };
};