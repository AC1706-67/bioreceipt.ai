/**
 * Social Service
 * Comprehensive social features including sharing, community, and user connections
 */
import { AuditLogService } from '../compliance/auditLogService';
import { AnalyticsService } from '../analytics/analyticsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share, Linking } from 'react-native';

// Social User Profile
export interface SocialUserProfile {
  id: string;
  userId: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  location?: string;
  joinedDate: Date;
  isPublic: boolean;
  stats: {
    tipsShared: number;
    tipsCompleted: number;
    streakDays: number;
    points: number;
    level: number;
    badges: string[];
  };
  preferences: {
    allowDirectMessages: boolean;
    showActivity: boolean;
    shareProgress: boolean;
    allowTagging: boolean;
  };
  connections: {
    following: string[];
    followers: string[];
    blocked: string[];
  };
}

// Social Post/Share
export interface SocialPost {
  id: string;
  authorId: string;
  type: 'tip_share' | 'achievement' | 'progress_update' | 'discussion' | 'challenge';
  content: {
    title: string;
    description: string;
    tipId?: string;
    achievementId?: string;
    challengeId?: string;
    media?: {
      type: 'image' | 'video';
      url: string;
      thumbnail?: string;
    }[];
    tags: string[];
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  visibility: 'public' | 'followers' | 'private';
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
}

// Social Comment
export interface SocialComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  parentCommentId?: string;
  likes: number;
  replies: number;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
}

// Social Notification
export interface SocialNotification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'share' | 'achievement' | 'challenge_invite';
  fromUserId: string;
  postId?: string;
  commentId?: string;
  challengeId?: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

// Community Challenge
export interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number; // days
  startDate: Date;
  endDate: Date;
  createdBy: string;
  participants: {
    userId: string;
    joinedAt: Date;
    progress: number;
    completed: boolean;
    completedAt?: Date;
  }[];
  rewards: {
    points: number;
    badges: string[];
    title?: string;
  };
  rules: string[];
  isActive: boolean;
  isPublic: boolean;
}

// Leaderboard Entry
export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatar?: string;
  score: number;
  rank: number;
  change: number; // position change from previous period
  stats: {
    tipsCompleted: number;
    streakDays: number;
    challengesCompleted: number;
    pointsEarned: number;
  };
}

export class SocialService {
  private static instance: SocialService;
  private auditLogService: AuditLogService;
  private analyticsService: AnalyticsService;
  private userProfile: SocialUserProfile | null = null;
  private notificationsCache: Map<string, SocialNotification[]> = new Map();
  private postsCache: Map<string, SocialPost[]> = new Map();

  private constructor() {
    this.auditLogService = AuditLogService.getInstance();
    this.analyticsService = AnalyticsService.getInstance();
  }

  public static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  /**
   * Initialize social service for a user
   */
  public async initialize(userId: string): Promise<void> {
    try {
      // Load user's social profile
      await this.loadUserProfile(userId);
      
      // Load cached notifications
      await this.loadNotifications(userId);
      
      // Log initialization
      await this.auditLogService.logDataAccess({
        userId,
        action: 'SOCIAL_SERVICE_INITIALIZED',
        resourceType: 'SOCIAL_PROFILE',
        resourceId: userId,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          hasProfile: !!this.userProfile,
          profilePublic: this.userProfile?.isPublic || false
        }
      });
    } catch (error) {
      console.error('Failed to initialize social service:', error);
      throw error;
    }
  }

  /**
   * Create or update user's social profile
   */
  public async createOrUpdateProfile(
    userId: string,
    profileData: Partial<SocialUserProfile>
  ): Promise<SocialUserProfile> {
    try {
      const existingProfile = await this.getUserProfile(userId);
      
      const profile: SocialUserProfile = {
        id: existingProfile?.id || `profile_${Date.now()}`,
        userId,
        displayName: profileData.displayName || existingProfile?.displayName || 'Anonymous User',
        avatar: profileData.avatar || existingProfile?.avatar,
        bio: profileData.bio || existingProfile?.bio,
        location: profileData.location || existingProfile?.location,
        joinedDate: existingProfile?.joinedDate || new Date(),
        isPublic: profileData.isPublic ?? existingProfile?.isPublic ?? true,
        stats: {
          tipsShared: existingProfile?.stats.tipsShared || 0,
          tipsCompleted: existingProfile?.stats.tipsCompleted || 0,
          streakDays: existingProfile?.stats.streakDays || 0,
          points: existingProfile?.stats.points || 0,
          level: existingProfile?.stats.level || 1,
          badges: existingProfile?.stats.badges || [],
          ...profileData.stats
        },
        preferences: {
          allowDirectMessages: true,
          showActivity: true,
          shareProgress: true,
          allowTagging: true,
          ...existingProfile?.preferences,
          ...profileData.preferences
        },
        connections: {
          following: existingProfile?.connections.following || [],
          followers: existingProfile?.connections.followers || [],
          blocked: existingProfile?.connections.blocked || [],
          ...existingProfile?.connections,
          ...profileData.connections
        }
      };

      // Save profile
      await this.saveUserProfile(profile);
      this.userProfile = profile;

      // Log profile update
      await this.auditLogService.logDataAccess({
        userId,
        action: 'SOCIAL_PROFILE_UPDATED',
        resourceType: 'SOCIAL_PROFILE',
        resourceId: profile.id,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          isNewProfile: !existingProfile,
          isPublic: profile.isPublic,
          displayName: profile.displayName
        }
      });

      return profile;
    } catch (error) {
      console.error('Failed to create/update social profile:', error);
      throw error;
    }
  }

  /**
   * Share a health tip
   */
  public async shareTip(
    userId: string,
    tipId: string,
    shareData: {
      title: string;
      description: string;
      personalNote?: string;
      tags?: string[];
      visibility?: 'public' | 'followers' | 'private';
      platforms?: ('native' | 'facebook' | 'twitter' | 'instagram' | 'whatsapp')[];
    }
  ): Promise<{ postId?: string; shareResults: Record<string, boolean> }> {
    try {
      const shareResults: Record<string, boolean> = {};
      let postId: string | undefined;

      // Create social post if sharing within app
      if (!shareData.platforms || shareData.platforms.includes('native')) {
        const post: SocialPost = {
          id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          authorId: userId,
          type: 'tip_share',
          content: {
            title: shareData.title,
            description: shareData.personalNote || shareData.description,
            tipId,
            tags: shareData.tags || [],
            media: []
          },
          engagement: {
            likes: 0,
            comments: 0,
            shares: 0,
            saves: 0
          },
          visibility: shareData.visibility || 'public',
          createdAt: new Date(),
          updatedAt: new Date(),
          isEdited: false
        };

        await this.createPost(post);
        postId = post.id;
        shareResults.native = true;
      }

      // Share to external platforms
      if (shareData.platforms) {
        for (const platform of shareData.platforms) {
          if (platform !== 'native') {
            try {
              const success = await this.shareToExternalPlatform(platform, {
                title: shareData.title,
                description: shareData.description,
                tipId
              });
              shareResults[platform] = success;
            } catch (error) {
              console.error(`Failed to share to ${platform}:`, error);
              shareResults[platform] = false;
            }
          }
        }
      }

      // Update user stats
      await this.updateUserStats(userId, { tipsShared: 1 });

      // Log sharing activity
      await this.auditLogService.logDataAccess({
        userId,
        action: 'TIP_SHARED',
        resourceType: 'HEALTH_TIP',
        resourceId: tipId,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          platforms: shareData.platforms || ['native'],
          visibility: shareData.visibility || 'public',
          hasPersonalNote: !!shareData.personalNote,
          postId
        }
      });

      // Track analytics
      this.analyticsService.trackEvent('tip_shared', {
        tipId,
        platforms: shareData.platforms || ['native'],
        visibility: shareData.visibility || 'public'
      });

      return { postId, shareResults };
    } catch (error) {
      console.error('Failed to share tip:', error);
      throw error;
    }
  }

  /**
   * Get social feed for user
   */
  public async getSocialFeed(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      type?: SocialPost['type'];
      following?: boolean;
    } = {}
  ): Promise<SocialPost[]> {
    try {
      const { limit = 20, offset = 0, type, following = true } = options;

      // Get user's following list if needed
      const userProfile = await this.getUserProfile(userId);
      const followingIds = following && userProfile ? userProfile.connections.following : [];

      // Load posts (in real implementation, this would be from database)
      const allPosts = await this.loadPosts({
        authorIds: following ? [userId, ...followingIds] : undefined,
        type,
        limit: limit + offset,
        visibility: ['public', 'followers']
      });

      // Apply pagination
      const posts = allPosts.slice(offset, offset + limit);

      // Log feed access
      await this.auditLogService.logDataAccess({
        userId,
        action: 'SOCIAL_FEED_ACCESSED',
        resourceType: 'SOCIAL_FEED',
        resourceId: `feed_${userId}`,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          postsReturned: posts.length,
          following,
          type: type || 'all'
        }
      });

      return posts;
    } catch (error) {
      console.error('Failed to get social feed:', error);
      throw error;
    }
  }

  /**
   * Like/unlike a post
   */
  public async togglePostLike(userId: string, postId: string): Promise<boolean> {
    try {
      // Load post
      const post = await this.getPost(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      // Check if user already liked
      const userLikes = await this.getUserLikes(userId);
      const isLiked = userLikes.includes(postId);

      if (isLiked) {
        // Unlike
        post.engagement.likes = Math.max(0, post.engagement.likes - 1);
        await this.removeUserLike(userId, postId);
      } else {
        // Like
        post.engagement.likes += 1;
        await this.addUserLike(userId, postId);

        // Notify post author
        if (post.authorId !== userId) {
          await this.createNotification({
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            userId: post.authorId,
            type: 'like',
            fromUserId: userId,
            postId,
            message: 'liked your post',
            isRead: false,
            createdAt: new Date()
          });
        }
      }

      // Update post
      await this.updatePost(post);

      // Log activity
      await this.auditLogService.logDataAccess({
        userId,
        action: isLiked ? 'POST_UNLIKED' : 'POST_LIKED',
        resourceType: 'SOCIAL_POST',
        resourceId: postId,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          postAuthorId: post.authorId,
          newLikeCount: post.engagement.likes
        }
      });

      return !isLiked;
    } catch (error) {
      console.error('Failed to toggle post like:', error);
      throw error;
    }
  }

  /**
   * Add comment to post
   */
  public async addComment(
    userId: string,
    postId: string,
    content: string,
    parentCommentId?: string
  ): Promise<SocialComment> {
    try {
      const comment: SocialComment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        postId,
        authorId: userId,
        content,
        parentCommentId,
        likes: 0,
        replies: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        isEdited: false
      };

      // Save comment
      await this.saveComment(comment);

      // Update post comment count
      const post = await this.getPost(postId);
      if (post) {
        post.engagement.comments += 1;
        await this.updatePost(post);

        // Notify post author
        if (post.authorId !== userId) {
          await this.createNotification({
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            userId: post.authorId,
            type: 'comment',
            fromUserId: userId,
            postId,
            commentId: comment.id,
            message: 'commented on your post',
            isRead: false,
            createdAt: new Date()
          });
        }
      }

      // Update parent comment reply count
      if (parentCommentId) {
        const parentComment = await this.getComment(parentCommentId);
        if (parentComment) {
          parentComment.replies += 1;
          await this.updateComment(parentComment);
        }
      }

      // Log activity
      await this.auditLogService.logDataAccess({
        userId,
        action: 'COMMENT_ADDED',
        resourceType: 'SOCIAL_COMMENT',
        resourceId: comment.id,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          postId,
          parentCommentId,
          contentLength: content.length
        }
      });

      return comment;
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  }

  /**
   * Follow/unfollow a user
   */
  public async toggleFollow(userId: string, targetUserId: string): Promise<boolean> {
    try {
      if (userId === targetUserId) {
        throw new Error('Cannot follow yourself');
      }

      const userProfile = await this.getUserProfile(userId);
      const targetProfile = await this.getUserProfile(targetUserId);

      if (!userProfile || !targetProfile) {
        throw new Error('User profile not found');
      }

      const isFollowing = userProfile.connections.following.includes(targetUserId);

      if (isFollowing) {
        // Unfollow
        userProfile.connections.following = userProfile.connections.following.filter(id => id !== targetUserId);
        targetProfile.connections.followers = targetProfile.connections.followers.filter(id => id !== userId);
      } else {
        // Follow
        userProfile.connections.following.push(targetUserId);
        targetProfile.connections.followers.push(userId);

        // Notify target user
        await this.createNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          userId: targetUserId,
          type: 'follow',
          fromUserId: userId,
          message: 'started following you',
          isRead: false,
          createdAt: new Date()
        });
      }

      // Save updated profiles
      await this.saveUserProfile(userProfile);
      await this.saveUserProfile(targetProfile);

      // Log activity
      await this.auditLogService.logDataAccess({
        userId,
        action: isFollowing ? 'USER_UNFOLLOWED' : 'USER_FOLLOWED',
        resourceType: 'SOCIAL_CONNECTION',
        resourceId: `${userId}_${targetUserId}`,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          targetUserId,
          targetDisplayName: targetProfile.displayName
        }
      });

      return !isFollowing;
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      throw error;
    }
  }

  /**
   * Create community challenge
   */
  public async createChallenge(
    userId: string,
    challengeData: Omit<CommunityChallenge, 'id' | 'createdBy' | 'participants' | 'isActive'>
  ): Promise<CommunityChallenge> {
    try {
      const challenge: CommunityChallenge = {
        id: `challenge_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        createdBy: userId,
        participants: [],
        isActive: true,
        ...challengeData
      };

      // Save challenge
      await this.saveChallenge(challenge);

      // Log activity
      await this.auditLogService.logDataAccess({
        userId,
        action: 'CHALLENGE_CREATED',
        resourceType: 'COMMUNITY_CHALLENGE',
        resourceId: challenge.id,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          title: challenge.title,
          category: challenge.category,
          difficulty: challenge.difficulty,
          duration: challenge.duration,
          isPublic: challenge.isPublic
        }
      });

      return challenge;
    } catch (error) {
      console.error('Failed to create challenge:', error);
      throw error;
    }
  }

  /**
   * Join a community challenge
   */
  public async joinChallenge(userId: string, challengeId: string): Promise<void> {
    try {
      const challenge = await this.getChallenge(challengeId);
      if (!challenge) {
        throw new Error('Challenge not found');
      }

      if (!challenge.isActive) {
        throw new Error('Challenge is not active');
      }

      // Check if user already joined
      const existingParticipant = challenge.participants.find(p => p.userId === userId);
      if (existingParticipant) {
        throw new Error('Already joined this challenge');
      }

      // Add participant
      challenge.participants.push({
        userId,
        joinedAt: new Date(),
        progress: 0,
        completed: false
      });

      // Save updated challenge
      await this.saveChallenge(challenge);

      // Create activity post
      await this.createPost({
        id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        authorId: userId,
        type: 'challenge',
        content: {
          title: `Joined "${challenge.title}" Challenge`,
          description: `I'm taking on the ${challenge.title} challenge! Who's with me?`,
          challengeId,
          tags: ['challenge', challenge.category],
          media: []
        },
        engagement: { likes: 0, comments: 0, shares: 0, saves: 0 },
        visibility: 'public',
        createdAt: new Date(),
        updatedAt: new Date(),
        isEdited: false
      });

      // Log activity
      await this.auditLogService.logDataAccess({
        userId,
        action: 'CHALLENGE_JOINED',
        resourceType: 'COMMUNITY_CHALLENGE',
        resourceId: challengeId,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          challengeTitle: challenge.title,
          participantCount: challenge.participants.length
        }
      });
    } catch (error) {
      console.error('Failed to join challenge:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard
   */
  public async getLeaderboard(
    type: 'points' | 'streaks' | 'tips_completed' | 'challenges',
    period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'weekly',
    limit: number = 50
  ): Promise<LeaderboardEntry[]> {
    try {
      // In real implementation, this would query the database
      // For now, we'll return mock data
      const leaderboard: LeaderboardEntry[] = [];

      // Log leaderboard access
      await this.auditLogService.logDataAccess({
        userId: 'system',
        action: 'LEADERBOARD_ACCESSED',
        resourceType: 'LEADERBOARD',
        resourceId: `${type}_${period}`,
        ipAddress: 'mobile_app',
        userAgent: 'BioReceipt',
        success: true,
        details: {
          type,
          period,
          limit
        }
      });

      return leaderboard;
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   */
  public async getNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<SocialNotification[]> {
    try {
      const { limit = 20, offset = 0, unreadOnly = false } = options;

      let notifications = this.notificationsCache.get(userId) || [];

      if (unreadOnly) {
        notifications = notifications.filter(n => !n.isRead);
      }

      // Apply pagination
      const paginatedNotifications = notifications.slice(offset, offset + limit);

      return paginatedNotifications;
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  public async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      const notifications = this.notificationsCache.get(userId) || [];
      const notification = notifications.find(n => n.id === notificationId);

      if (notification) {
        notification.isRead = true;
        await this.saveNotifications(userId, notifications);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  // Private helper methods
  private async loadUserProfile(userId: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(`social_profile_${userId}`);
      if (stored) {
        const profile = JSON.parse(stored);
        profile.joinedDate = new Date(profile.joinedDate);
        this.userProfile = profile;
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }

  private async saveUserProfile(profile: SocialUserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(`social_profile_${profile.userId}`, JSON.stringify(profile));
    } catch (error) {
      console.error('Failed to save user profile:', error);
      throw error;
    }
  }

  private async getUserProfile(userId: string): Promise<SocialUserProfile | null> {
    try {
      if (this.userProfile && this.userProfile.userId === userId) {
        return this.userProfile;
      }

      const stored = await AsyncStorage.getItem(`social_profile_${userId}`);
      if (stored) {
        const profile = JSON.parse(stored);
        profile.joinedDate = new Date(profile.joinedDate);
        return profile;
      }

      return null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  private async shareToExternalPlatform(
    platform: string,
    shareData: { title: string; description: string; tipId: string }
  ): Promise<boolean> {
    try {
      const shareUrl = `https://healthytip.app/tips/${shareData.tipId}`;
      const shareContent = `${shareData.title}\n\n${shareData.description}\n\n${shareUrl}`;

      switch (platform) {
        case 'facebook':
          await Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
          return true;
        case 'twitter':
          await Linking.openURL(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareContent)}`);
          return true;
        case 'whatsapp':
          await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(shareContent)}`);
          return true;
        default:
          // Use native share
          const result = await Share.share({
            message: shareContent,
            url: shareUrl,
            title: shareData.title
          });
          return result.action === Share.sharedAction;
      }
    } catch (error) {
      console.error(`Failed to share to ${platform}:`, error);
      return false;
    }
  }

  private async updateUserStats(userId: string, stats: Partial<SocialUserProfile['stats']>): Promise<void> {
    try {
      const profile = await this.getUserProfile(userId);
      if (profile) {
        Object.keys(stats).forEach(key => {
          if (key in profile.stats) {
            (profile.stats as any)[key] += (stats as any)[key];
          }
        });
        await this.saveUserProfile(profile);
      }
    } catch (error) {
      console.error('Failed to update user stats:', error);
    }
  }

  private async createPost(post: SocialPost): Promise<void> {
    try {
      await this.savePost(post);
      
      // Add to cache
      const userPosts = this.postsCache.get(post.authorId) || [];
      userPosts.unshift(post);
      this.postsCache.set(post.authorId, userPosts);

      // Notify followers if public
      if (post.visibility === 'public' || post.visibility === 'followers') {
        await this.notifyFollowers(post.authorId, post);
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      throw error;
    }
  }

  private async savePost(post: SocialPost): Promise<void> {
    try {
      await AsyncStorage.setItem(`social_post_${post.id}`, JSON.stringify(post));
    } catch (error) {
      console.error('Failed to save post:', error);
      throw error;
    }
  }

  private async getPost(postId: string): Promise<SocialPost | null> {
    try {
      const stored = await AsyncStorage.getItem(`social_post_${postId}`);
      if (stored) {
        const post = JSON.parse(stored);
        post.createdAt = new Date(post.createdAt);
        post.updatedAt = new Date(post.updatedAt);
        return post;
      }
      return null;
    } catch (error) {
      console.error('Failed to get post:', error);
      return null;
    }
  }

  private async updatePost(post: SocialPost): Promise<void> {
    try {
      post.updatedAt = new Date();
      await this.savePost(post);
    } catch (error) {
      console.error('Failed to update post:', error);
      throw error;
    }
  }

  private async loadPosts(options: {
    authorIds?: string[];
    type?: SocialPost['type'];
    limit?: number;
    visibility?: SocialPost['visibility'][];
  }): Promise<SocialPost[]> {
    // In real implementation, this would query the database
    // For now, return empty array
    return [];
  }

  private async getUserLikes(userId: string): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(`user_likes_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get user likes:', error);
      return [];
    }
  }

  private async addUserLike(userId: string, postId: string): Promise<void> {
    try {
      const likes = await this.getUserLikes(userId);
      if (!likes.includes(postId)) {
        likes.push(postId);
        await AsyncStorage.setItem(`user_likes_${userId}`, JSON.stringify(likes));
      }
    } catch (error) {
      console.error('Failed to add user like:', error);
      throw error;
    }
  }

  private async removeUserLike(userId: string, postId: string): Promise<void> {
    try {
      const likes = await this.getUserLikes(userId);
      const updatedLikes = likes.filter(id => id !== postId);
      await AsyncStorage.setItem(`user_likes_${userId}`, JSON.stringify(updatedLikes));
    } catch (error) {
      console.error('Failed to remove user like:', error);
      throw error;
    }
  }

  private async saveComment(comment: SocialComment): Promise<void> {
    try {
      await AsyncStorage.setItem(`social_comment_${comment.id}`, JSON.stringify(comment));
    } catch (error) {
      console.error('Failed to save comment:', error);
      throw error;
    }
  }

  private async getComment(commentId: string): Promise<SocialComment | null> {
    try {
      const stored = await AsyncStorage.getItem(`social_comment_${commentId}`);
      if (stored) {
        const comment = JSON.parse(stored);
        comment.createdAt = new Date(comment.createdAt);
        comment.updatedAt = new Date(comment.updatedAt);
        return comment;
      }
      return null;
    } catch (error) {
      console.error('Failed to get comment:', error);
      return null;
    }
  }

  private async updateComment(comment: SocialComment): Promise<void> {
    try {
      comment.updatedAt = new Date();
      await this.saveComment(comment);
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw error;
    }
  }

  private async createNotification(notification: SocialNotification): Promise<void> {
    try {
      const notifications = this.notificationsCache.get(notification.userId) || [];
      notifications.unshift(notification);
      
      // Keep only last 100 notifications
      if (notifications.length > 100) {
        notifications.splice(100);
      }
      
      this.notificationsCache.set(notification.userId, notifications);
      await this.saveNotifications(notification.userId, notifications);
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  }

  private async loadNotifications(userId: string): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(`social_notifications_${userId}`);
      if (stored) {
        const notifications = JSON.parse(stored).map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        }));
        this.notificationsCache.set(userId, notifications);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  private async saveNotifications(userId: string, notifications: SocialNotification[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`social_notifications_${userId}`, JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }

  private async notifyFollowers(userId: string, post: SocialPost): Promise<void> {
    try {
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) return;

      // Notify followers about new post
      for (const followerId of userProfile.connections.followers) {
        await this.createNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          userId: followerId,
          type: 'share',
          fromUserId: userId,
          postId: post.id,
          message: `shared a new ${post.type.replace('_', ' ')}`,
          isRead: false,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to notify followers:', error);
    }
  }

  private async saveChallenge(challenge: CommunityChallenge): Promise<void> {
    try {
      await AsyncStorage.setItem(`community_challenge_${challenge.id}`, JSON.stringify(challenge));
    } catch (error) {
      console.error('Failed to save challenge:', error);
      throw error;
    }
  }

  private async getChallenge(challengeId: string): Promise<CommunityChallenge | null> {
    try {
      const stored = await AsyncStorage.getItem(`community_challenge_${challengeId}`);
      if (stored) {
        const challenge = JSON.parse(stored);
        challenge.startDate = new Date(challenge.startDate);
        challenge.endDate = new Date(challenge.endDate);
        challenge.participants = challenge.participants.map((p: any) => ({
          ...p,
          joinedAt: new Date(p.joinedAt),
          completedAt: p.completedAt ? new Date(p.completedAt) : undefined
        }));
        return challenge;
      }
      return null;
    } catch (error) {
      console.error('Failed to get challenge:', error);
      return null;
    }
  }
}