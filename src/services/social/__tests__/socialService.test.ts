/**
 * Social Service Tests
 * Comprehensive tests for social features functionality
 */
import { SocialService, SocialUserProfile, SocialPost } from '../socialService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}));

// Mock React Native modules
jest.mock('react-native', () => ({
  Share: {
    share: jest.fn().mockResolvedValue({ action: 'sharedAction' }),
    sharedAction: 'sharedAction'
  },
  Linking: {
    openURL: jest.fn().mockResolvedValue(true)
  }
}));

// Mock audit log service
jest.mock('../../compliance/auditLogService', () => ({
  AuditLogService: {
    getInstance: jest.fn().mockReturnValue({
      logDataAccess: jest.fn().mockResolvedValue(undefined)
    })
  }
}));

// Mock analytics service
jest.mock('../../analytics/analyticsService', () => ({
  AnalyticsService: {
    getInstance: jest.fn().mockReturnValue({
      trackEvent: jest.fn()
    })
  }
}));

describe('SocialService', () => {
  let socialService: SocialService;
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    // Reset the singleton instance to ensure clean state
    (SocialService as any).instance = undefined;
    socialService = SocialService.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await expect(socialService.initialize(mockUserId)).resolves.not.toThrow();
    });

    it('should load existing user profile during initialization', async () => {
      const mockProfile = {
        id: 'profile-123',
        userId: mockUserId,
        displayName: 'Test User',
        isPublic: true,
        joinedDate: new Date().toISOString(),
        stats: {
          tipsShared: 5,
          tipsCompleted: 10,
          streakDays: 3,
          points: 150,
          level: 2,
          badges: ['early-adopter']
        },
        preferences: {
          allowDirectMessages: true,
          showActivity: true,
          shareProgress: true,
          allowTagging: true
        },
        connections: {
          following: ['user-456'],
          followers: ['user-789'],
          blocked: []
        }
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockProfile));

      await socialService.initialize(mockUserId);

      expect(AsyncStorage.getItem).toHaveBeenCalledWith(`social_profile_${mockUserId}`);
    });
  });

  describe('Profile Management', () => {
    it('should create a new user profile', async () => {
      // Clear all mocks and reset to null for new profile test
      jest.clearAllMocks();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const profileData = {
        displayName: 'New User',
        bio: 'Health enthusiast',
        isPublic: true
      };

      const profile = await socialService.createOrUpdateProfile(mockUserId, profileData);

      expect(profile).toMatchObject({
        userId: mockUserId,
        displayName: 'New User',
        bio: 'Health enthusiast',
        isPublic: true
      });

      // For new profiles, stats should start at zero
      expect(profile.stats.tipsShared).toBe(0);
      expect(profile.stats.tipsCompleted).toBe(0);
      expect(profile.stats.streakDays).toBe(0);
      expect(profile.stats.points).toBe(0);
      expect(profile.stats.level).toBe(1);
      expect(Array.isArray(profile.stats.badges)).toBe(true);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `social_profile_${mockUserId}`,
        expect.any(String)
      );
    });
  });

  describe('Tip Sharing', () => {
    beforeEach(async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      await socialService.initialize(mockUserId);
    });

    it('should share a tip to native platform', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const shareData = {
        title: 'Great Health Tip',
        description: 'This tip will change your life',
        personalNote: 'I love this tip!',
        tags: ['health', 'wellness'],
        visibility: 'public' as const,
        platforms: ['native' as const]
      };

      const result = await socialService.shareTip(mockUserId, 'tip-123', shareData);

      expect(result.postId).toBeDefined();
      expect(result.shareResults.native).toBe(true);
    });
  });

  describe('Social Feed', () => {
    beforeEach(async () => {
      await socialService.initialize(mockUserId);
    });

    it('should get social feed for user', async () => {
      const feed = await socialService.getSocialFeed(mockUserId, {
        limit: 10,
        following: true
      });

      expect(Array.isArray(feed)).toBe(true);
      expect(feed.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Post Interactions', () => {
    const mockPost: SocialPost = {
      id: 'post-123',
      authorId: 'author-456',
      type: 'tip_share',
      content: {
        title: 'Test Post',
        description: 'Test description',
        tags: ['test'],
        media: []
      },
      engagement: {
        likes: 5,
        comments: 2,
        shares: 1,
        saves: 0
      },
      visibility: 'public',
      createdAt: new Date(),
      updatedAt: new Date(),
      isEdited: false
    };

    beforeEach(async () => {
      await socialService.initialize(mockUserId);
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === `social_post_${mockPost.id}`) {
          return Promise.resolve(JSON.stringify(mockPost));
        }
        if (key === `user_likes_${mockUserId}`) {
          return Promise.resolve(JSON.stringify([]));
        }
        return Promise.resolve(null);
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    });

    it('should like a post', async () => {
      const isLiked = await socialService.togglePostLike(mockUserId, mockPost.id);

      expect(isLiked).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `user_likes_${mockUserId}`,
        expect.stringContaining(mockPost.id)
      );
    });

    it('should add a comment to a post', async () => {
      const comment = await socialService.addComment(
        mockUserId,
        mockPost.id,
        'Great post!'
      );

      expect(comment).toMatchObject({
        postId: mockPost.id,
        authorId: mockUserId,
        content: 'Great post!',
        likes: 0,
        replies: 0
      });

      expect(comment.id).toBeDefined();
      expect(comment.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Notifications', () => {
    beforeEach(async () => {
      await socialService.initialize(mockUserId);
    });

    it('should get user notifications', async () => {
      const notifications = await socialService.getNotifications(mockUserId);

      expect(Array.isArray(notifications)).toBe(true);
    });

    it('should mark notification as read', async () => {
      const notificationId = 'notif-123';
      
      await socialService.markNotificationAsRead(mockUserId, notificationId);

      // Should not throw an error
      expect(true).toBe(true);
    });
  });

  describe('Leaderboard', () => {
    beforeEach(async () => {
      await socialService.initialize(mockUserId);
    });

    it('should get leaderboard data', async () => {
      const leaderboard = await socialService.getLeaderboard('points', 'weekly', 10);

      expect(Array.isArray(leaderboard)).toBe(true);
      expect(leaderboard.length).toBeLessThanOrEqual(10);
    });
  });
});