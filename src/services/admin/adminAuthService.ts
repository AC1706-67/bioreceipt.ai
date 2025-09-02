/**
 * Admin Authentication Service
 * Provides secure authentication and authorization for admin users
 */

import { SecureStorageService } from '../security/secureStorage';
import { EncryptionService } from '../security/encryption';
import { AuditLogService } from '../compliance/auditLogService';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermission[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    loginAttempts: number;
    lastFailedLogin?: Date;
    passwordLastChanged?: Date;
    twoFactorEnabled: boolean;
  };
}

export type AdminRole = 'super_admin' | 'content_admin' | 'analytics_admin' | 'support_admin';

export type AdminPermission = 
  | 'content.create'
  | 'content.read'
  | 'content.update'
  | 'content.delete'
  | 'content.publish'
  | 'analytics.read'
  | 'analytics.export'
  | 'users.read'
  | 'users.manage'
  | 'system.configure'
  | 'audit.read'
  | 'feedback.read'
  | 'feedback.respond';

export interface AdminSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

export interface AdminLoginRequest {
  username: string;
  password: string;
  ipAddress: string;
  userAgent: string;
  twoFactorCode?: string;
}

export interface AdminLoginResult {
  success: boolean;
  user?: AdminUser;
  session?: AdminSession;
  error?: string;
  requiresTwoFactor?: boolean;
}

export class AdminAuthService {
  private static instance: AdminAuthService;
  private secureStorage: SecureStorageService;
  private encryptionService: EncryptionService;
  private auditLogService: AuditLogService;
  private currentSession: AdminSession | null = null;

  private constructor() {
    this.secureStorage = SecureStorageService.getInstance();
    this.encryptionService = EncryptionService.getInstance();
    this.auditLogService = AuditLogService.getInstance();
  }

  public static getInstance(): AdminAuthService {
    if (!AdminAuthService.instance) {
      AdminAuthService.instance = new AdminAuthService();
    }
    return AdminAuthService.instance;
  }

  /**
   * Initialize admin authentication system
   */
  public async initialize(): Promise<void> {
    try {
      // Create default super admin if none exists
      const existingAdmins = await this.getAllAdminUsers();
      if (existingAdmins.length === 0) {
        await this.createDefaultSuperAdmin();
      }

      // Clean up expired sessions
      await this.cleanupExpiredSessions();

      console.log('Admin authentication system initialized');
    } catch (error) {
      console.error('Failed to initialize admin authentication:', error);
      throw error;
    }
  }

  /**
   * Authenticate admin user
   */
  public async login(request: AdminLoginRequest): Promise<AdminLoginResult> {
    try {
      // Log login attempt
      await this.auditLogService.logAuthenticationEvent(
        request.username,
        'LOGIN',
        request.ipAddress,
        request.userAgent,
        false // Will update to true if successful
      );

      // Get user by username
      const user = await this.getUserByUsername(request.username);
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is disabled'
        };
      }

      // Check for account lockout
      if (this.isAccountLocked(user)) {
        return {
          success: false,
          error: 'Account is temporarily locked due to failed login attempts'
        };
      }

      // Verify password
      const passwordValid = await this.verifyPassword(request.password, user.id);
      if (!passwordValid) {
        await this.recordFailedLogin(user.id);
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Check two-factor authentication if enabled
      if (user.metadata?.twoFactorEnabled && !request.twoFactorCode) {
        return {
          success: false,
          requiresTwoFactor: true,
          error: 'Two-factor authentication required'
        };
      }

      if (user.metadata?.twoFactorEnabled && request.twoFactorCode) {
        const twoFactorValid = await this.verifyTwoFactorCode(user.id, request.twoFactorCode);
        if (!twoFactorValid) {
          return {
            success: false,
            error: 'Invalid two-factor authentication code'
          };
        }
      }

      // Create session
      const session = await this.createSession(user, request.ipAddress, request.userAgent);

      // Update user login info
      await this.updateUserLoginInfo(user.id);

      // Reset failed login attempts
      await this.resetFailedLoginAttempts(user.id);

      // Log successful login
      await this.auditLogService.logAuthenticationEvent(
        user.username,
        'LOGIN',
        request.ipAddress,
        request.userAgent,
        true
      );

      this.currentSession = session;

      return {
        success: true,
        user,
        session
      };
    } catch (error) {
      console.error('Admin login failed:', error);
      return {
        success: false,
        error: 'Login failed due to system error'
      };
    }
  }

  /**
   * Logout admin user
   */
  public async logout(sessionId?: string): Promise<boolean> {
    try {
      const targetSessionId = sessionId || this.currentSession?.id;
      if (!targetSessionId) {
        return false;
      }

      const session = await this.getSession(targetSessionId);
      if (session) {
        // Deactivate session
        await this.deactivateSession(targetSessionId);

        // Log logout
        await this.auditLogService.logAuthenticationEvent(
          session.userId,
          'LOGOUT',
          session.ipAddress,
          session.userAgent,
          true
        );
      }

      if (this.currentSession?.id === targetSessionId) {
        this.currentSession = null;
      }

      return true;
    } catch (error) {
      console.error('Admin logout failed:', error);
      return false;
    }
  }

  /**
   * Validate session and get current user
   */
  public async validateSession(token: string): Promise<AdminUser | null> {
    try {
      const session = await this.getSessionByToken(token);
      if (!session || !session.isActive || session.expiresAt < new Date()) {
        return null;
      }

      const user = await this.getUserById(session.userId);
      if (!user || !user.isActive) {
        await this.deactivateSession(session.id);
        return null;
      }

      return user;
    } catch (error) {
      console.error('Session validation failed:', error);
      return null;
    }
  }

  /**
   * Check if user has specific permission
   */
  public async hasPermission(userId: string, permission: AdminPermission): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      if (!user || !user.isActive) {
        return false;
      }

      // Super admin has all permissions
      if (user.role === 'super_admin') {
        return true;
      }

      return user.permissions.includes(permission);
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Create new admin user
   */
  public async createAdminUser(userData: {
    username: string;
    email: string;
    password: string;
    role: AdminRole;
    permissions?: AdminPermission[];
  }): Promise<AdminUser> {
    try {
      // Check if username already exists
      const existingUser = await this.getUserByUsername(userData.username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Generate user ID
      const userId = this.generateUserId();
      const now = new Date();

      // Get default permissions for role
      const permissions = userData.permissions || this.getDefaultPermissions(userData.role);

      const newUser: AdminUser = {
        id: userId,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        permissions,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        metadata: {
          loginAttempts: 0,
          twoFactorEnabled: false
        }
      };

      // Store user
      await this.storeUser(newUser);

      // Store encrypted password
      await this.storePassword(userId, userData.password);

      // Log user creation
      await this.auditLogService.logSystemEvent('ADMIN_USER_CREATED', {
        createdUserId: userId,
        username: userData.username,
        role: userData.role
      });

      return newUser;
    } catch (error) {
      console.error('Failed to create admin user:', error);
      throw error;
    }
  }

  /**
   * Get current authenticated user
   */
  public getCurrentUser(): AdminUser | null {
    return this.currentSession ? null : null; // Would need to fetch user from session
  }

  /**
   * Get current session
   */
  public getCurrentSession(): AdminSession | null {
    return this.currentSession;
  }

  /**
   * Refresh session token
   */
  public async refreshSession(refreshToken: string): Promise<AdminSession | null> {
    try {
      const session = await this.getSessionByRefreshToken(refreshToken);
      if (!session || !session.isActive || session.expiresAt < new Date()) {
        return null;
      }

      // Generate new tokens
      const newToken = this.generateToken();
      const newRefreshToken = this.generateToken();
      const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const updatedSession: AdminSession = {
        ...session,
        token: newToken,
        refreshToken: newRefreshToken,
        expiresAt: newExpiresAt
      };

      await this.storeSession(updatedSession);

      return updatedSession;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return null;
    }
  }

  // Private helper methods
  private async createDefaultSuperAdmin(): Promise<void> {
    const defaultAdmin = {
      username: 'admin',
      email: 'admin@healthytip.app',
      password: 'Admin123!', // Should be changed on first login
      role: 'super_admin' as AdminRole
    };

    await this.createAdminUser(defaultAdmin);
    console.log('Default super admin created with username: admin, password: Admin123!');
  }

  private async getUserByUsername(username: string): Promise<AdminUser | null> {
    try {
      const users = await this.getAllAdminUsers();
      return users.find(user => user.username === username) || null;
    } catch (error) {
      console.error('Failed to get user by username:', error);
      return null;
    }
  }

  private async getUserById(userId: string): Promise<AdminUser | null> {
    try {
      const stored = await this.secureStorage.getItem(`admin_user_${userId}`);
      if (!stored) return null;

      const user = JSON.parse(stored);
      return {
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
        lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined
      };
    } catch (error) {
      console.error('Failed to get user by ID:', error);
      return null;
    }
  }

  private async getAllAdminUsers(): Promise<AdminUser[]> {
    try {
      const keys = await this.secureStorage.getAllKeys();
      const userKeys = keys.filter(key => key.startsWith('admin_user_'));
      
      const users: AdminUser[] = [];
      for (const key of userKeys) {
        const stored = await this.secureStorage.getItem(key);
        if (stored) {
          const user = JSON.parse(stored);
          users.push({
            ...user,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
            lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined
          });
        }
      }

      return users;
    } catch (error) {
      console.error('Failed to get all admin users:', error);
      return [];
    }
  }

  private async storeUser(user: AdminUser): Promise<void> {
    await this.secureStorage.setItem(`admin_user_${user.id}`, JSON.stringify(user));
  }

  private async storePassword(userId: string, password: string): Promise<void> {
    const hashedPassword = this.encryptionService.hash(password);
    await this.secureStorage.setItem(`admin_password_${userId}`, hashedPassword);
  }

  private async verifyPassword(password: string, userId: string): Promise<boolean> {
    try {
      const storedHash = await this.secureStorage.getItem(`admin_password_${userId}`);
      if (!storedHash) return false;

      const inputHash = this.encryptionService.hash(password);
      return inputHash === storedHash;
    } catch (error) {
      console.error('Password verification failed:', error);
      return false;
    }
  }

  private async createSession(user: AdminUser, ipAddress: string, userAgent: string): Promise<AdminSession> {
    const sessionId = this.generateSessionId();
    const token = this.generateToken();
    const refreshToken = this.generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const session: AdminSession = {
      id: sessionId,
      userId: user.id,
      token,
      refreshToken,
      expiresAt,
      createdAt: new Date(),
      ipAddress,
      userAgent,
      isActive: true
    };

    await this.storeSession(session);
    return session;
  }

  private async storeSession(session: AdminSession): Promise<void> {
    await this.secureStorage.setItem(`admin_session_${session.id}`, JSON.stringify(session));
    await this.secureStorage.setItem(`admin_token_${session.token}`, session.id);
    await this.secureStorage.setItem(`admin_refresh_${session.refreshToken}`, session.id);
  }

  private async getSession(sessionId: string): Promise<AdminSession | null> {
    try {
      const stored = await this.secureStorage.getItem(`admin_session_${sessionId}`);
      if (!stored) return null;

      const session = JSON.parse(stored);
      return {
        ...session,
        expiresAt: new Date(session.expiresAt),
        createdAt: new Date(session.createdAt)
      };
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  private async getSessionByToken(token: string): Promise<AdminSession | null> {
    try {
      const sessionId = await this.secureStorage.getItem(`admin_token_${token}`);
      if (!sessionId) return null;

      return await this.getSession(sessionId);
    } catch (error) {
      console.error('Failed to get session by token:', error);
      return null;
    }
  }

  private async getSessionByRefreshToken(refreshToken: string): Promise<AdminSession | null> {
    try {
      const sessionId = await this.secureStorage.getItem(`admin_refresh_${refreshToken}`);
      if (!sessionId) return null;

      return await this.getSession(sessionId);
    } catch (error) {
      console.error('Failed to get session by refresh token:', error);
      return null;
    }
  }

  private async deactivateSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (session) {
        session.isActive = false;
        await this.storeSession(session);

        // Remove token mappings
        await this.secureStorage.removeItem(`admin_token_${session.token}`);
        await this.secureStorage.removeItem(`admin_refresh_${session.refreshToken}`);
      }
    } catch (error) {
      console.error('Failed to deactivate session:', error);
    }
  }

  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const keys = await this.secureStorage.getAllKeys();
      const sessionKeys = keys.filter(key => key.startsWith('admin_session_'));
      
      for (const key of sessionKeys) {
        const stored = await this.secureStorage.getItem(key);
        if (stored) {
          const session = JSON.parse(stored);
          if (new Date(session.expiresAt) < new Date()) {
            await this.deactivateSession(session.id);
            await this.secureStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }

  private isAccountLocked(user: AdminUser): boolean {
    if (!user.metadata) return false;
    
    const maxAttempts = 5;
    const lockoutDuration = 30 * 60 * 1000; // 30 minutes
    
    if (user.metadata.loginAttempts >= maxAttempts) {
      const lastFailedLogin = user.metadata.lastFailedLogin;
      if (lastFailedLogin && (Date.now() - lastFailedLogin.getTime()) < lockoutDuration) {
        return true;
      }
    }
    
    return false;
  }

  private async recordFailedLogin(userId: string): Promise<void> {
    try {
      const user = await this.getUserById(userId);
      if (user) {
        user.metadata = user.metadata || { loginAttempts: 0, twoFactorEnabled: false };
        user.metadata.loginAttempts += 1;
        user.metadata.lastFailedLogin = new Date();
        user.updatedAt = new Date();
        
        await this.storeUser(user);
      }
    } catch (error) {
      console.error('Failed to record failed login:', error);
    }
  }

  private async resetFailedLoginAttempts(userId: string): Promise<void> {
    try {
      const user = await this.getUserById(userId);
      if (user && user.metadata) {
        user.metadata.loginAttempts = 0;
        user.metadata.lastFailedLogin = undefined;
        user.updatedAt = new Date();
        
        await this.storeUser(user);
      }
    } catch (error) {
      console.error('Failed to reset failed login attempts:', error);
    }
  }

  private async updateUserLoginInfo(userId: string): Promise<void> {
    try {
      const user = await this.getUserById(userId);
      if (user) {
        user.lastLogin = new Date();
        user.updatedAt = new Date();
        
        await this.storeUser(user);
      }
    } catch (error) {
      console.error('Failed to update user login info:', error);
    }
  }

  private async verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {
    // Simplified 2FA verification - in production would use TOTP
    // For now, accept any 6-digit code
    return /^\d{6}$/.test(code);
  }

  private getDefaultPermissions(role: AdminRole): AdminPermission[] {
    const permissionSets: Record<AdminRole, AdminPermission[]> = {
      super_admin: [
        'content.create', 'content.read', 'content.update', 'content.delete', 'content.publish',
        'analytics.read', 'analytics.export',
        'users.read', 'users.manage',
        'system.configure',
        'audit.read',
        'feedback.read', 'feedback.respond'
      ],
      content_admin: [
        'content.create', 'content.read', 'content.update', 'content.delete', 'content.publish',
        'analytics.read'
      ],
      analytics_admin: [
        'content.read',
        'analytics.read', 'analytics.export',
        'users.read'
      ],
      support_admin: [
        'content.read',
        'users.read',
        'feedback.read', 'feedback.respond'
      ]
    };

    return permissionSets[role] || [];
  }

  private generateUserId(): string {
    return `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateToken(): string {
    return this.encryptionService.generateKey();
  }
}