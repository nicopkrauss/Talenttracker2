/**
 * Profile Service Tests
 * Authentication System Overhaul - Task 2.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserStatus, SystemRole, RegistrationData, ProfileUpdateData } from '../auth-types';

// Mock Prisma Client
const mockPrismaClient = {
  profiles: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrismaClient),
}));

// Import ProfileService after mocking
const { ProfileService } = await import('../profile-service');

describe('ProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createProfile', () => {
    const mockUserId = 'test-user-id';
    const mockRegistrationData: Omit<RegistrationData, 'password'> = {
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      city: 'New York',
      state: 'NY'
    };

    it('should create a new profile successfully', async () => {
      const mockProfile = {
        id: mockUserId,
        ...mockRegistrationData,
        status: 'pending',
        role: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPrismaClient.profiles.findUnique.mockResolvedValue(null);
      mockPrismaClient.profiles.findFirst.mockResolvedValue(null);
      mockPrismaClient.profiles.create.mockResolvedValue(mockProfile);

      const result = await ProfileService.createProfile(mockUserId, mockRegistrationData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProfile);
      expect(mockPrismaClient.profiles.create).toHaveBeenCalledWith({
        data: {
          id: mockUserId,
          full_name: mockRegistrationData.full_name,
          email: mockRegistrationData.email,
          phone: mockRegistrationData.phone,
          city: mockRegistrationData.city,
          state: mockRegistrationData.state,
          status: 'pending',
          role: null,
        }
      });
    });

    it('should fail if profile already exists', async () => {
      mockPrismaClient.profiles.findUnique.mockResolvedValue({ id: mockUserId });

      const result = await ProfileService.createProfile(mockUserId, mockRegistrationData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Profile already exists for this user');
    });

    it('should fail if email already exists', async () => {
      mockPrismaClient.profiles.findUnique.mockResolvedValue(null);
      mockPrismaClient.profiles.findFirst.mockResolvedValue({ id: 'other-user', email: mockRegistrationData.email });

      const result = await ProfileService.createProfile(mockUserId, mockRegistrationData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email address is already registered');
    });

    it('should fail with invalid email format', async () => {
      const invalidData = { ...mockRegistrationData, email: 'invalid-email' };

      const result = await ProfileService.createProfile(mockUserId, invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });

    it('should fail with missing required fields', async () => {
      const invalidData = { ...mockRegistrationData, full_name: '' };

      const result = await ProfileService.createProfile(mockUserId, invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Full name is required');
    });
  });

  describe('getProfile', () => {
    const mockUserId = 'test-user-id';
    const mockProfile = {
      id: mockUserId,
      full_name: 'John Doe',
      email: 'john@example.com',
      status: 'active' as UserStatus,
      role: 'admin' as SystemRole,
      created_at: new Date(),
      updated_at: new Date()
    };

    it('should retrieve profile successfully', async () => {
      mockPrismaClient.profiles.findUnique.mockResolvedValue(mockProfile);

      const result = await ProfileService.getProfile(mockUserId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProfile);
      expect(mockPrismaClient.profiles.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        include: {}
      });
    });

    it('should fail if profile not found', async () => {
      mockPrismaClient.profiles.findUnique.mockResolvedValue(null);

      const result = await ProfileService.getProfile(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Profile not found');
    });

    it('should include related data when specified', async () => {
      const options = {
        include: {
          email_notifications: true,
          projects: true
        }
      };

      mockPrismaClient.profiles.findUnique.mockResolvedValue(mockProfile);

      await ProfileService.getProfile(mockUserId, options);

      expect(mockPrismaClient.profiles.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        include: options.include
      });
    });
  });

  describe('updateProfile', () => {
    const mockUserId = 'test-user-id';
    const mockUpdatedBy = 'admin-user-id';
    const mockUpdateData: ProfileUpdateData = {
      full_name: 'Jane Doe',
      phone: '+0987654321'
    };

    const mockExistingProfile = {
      id: mockUserId,
      full_name: 'John Doe',
      email: 'john@example.com',
      status: 'active' as UserStatus,
      created_at: new Date(),
      updated_at: new Date()
    };

    it('should update profile successfully', async () => {
      const mockUpdatedProfile = { ...mockExistingProfile, ...mockUpdateData };

      mockPrisma.profiles.findUnique.mockResolvedValue(mockExistingProfile);
      mockPrisma.profiles.update.mockResolvedValue(mockUpdatedProfile);

      const result = await ProfileService.updateProfile(mockUserId, mockUpdateData, mockUpdatedBy);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedProfile);
      expect(mockPrisma.profiles.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          ...mockUpdateData,
          updated_at: expect.any(Date)
        }
      });
    });

    it('should fail if profile not found', async () => {
      mockPrisma.profiles.findUnique.mockResolvedValue(null);

      const result = await ProfileService.updateProfile(mockUserId, mockUpdateData, mockUpdatedBy);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Profile not found');
    });

    it('should validate email uniqueness when updating email', async () => {
      const updateWithEmail = { ...mockUpdateData, email: 'new@example.com' };
      
      mockPrisma.profiles.findUnique.mockResolvedValue(mockExistingProfile);
      mockPrisma.profiles.findFirst.mockResolvedValue({ id: 'other-user', email: 'new@example.com' });

      const result = await ProfileService.updateProfile(mockUserId, updateWithEmail, mockUpdatedBy);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email address is already in use');
    });
  });

  describe('updateUserStatus', () => {
    const mockUserId = 'test-user-id';
    const mockUpdatedBy = 'admin-user-id';

    const mockProfile = {
      id: mockUserId,
      status: 'pending' as UserStatus,
      full_name: 'John Doe',
      email: 'john@example.com',
      created_at: new Date(),
      updated_at: new Date()
    };

    it('should update status successfully with valid transition', async () => {
      const newStatus: UserStatus = 'active';
      const mockUpdatedProfile = { ...mockProfile, status: newStatus };

      mockPrisma.profiles.findUnique.mockResolvedValue(mockProfile);
      mockPrisma.profiles.update.mockResolvedValue(mockUpdatedProfile);

      const result = await ProfileService.updateUserStatus(mockUserId, newStatus, mockUpdatedBy);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(newStatus);
    });

    it('should fail with invalid status transition', async () => {
      const invalidStatus: UserStatus = 'pending'; // Can't go from pending to pending

      mockPrisma.profiles.findUnique.mockResolvedValue(mockProfile);

      const result = await ProfileService.updateUserStatus(mockUserId, invalidStatus, mockUpdatedBy);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid status transition');
    });
  });

  describe('getPendingUsers', () => {
    const mockPendingUsers = [
      {
        id: 'user1',
        full_name: 'User One',
        email: 'user1@example.com',
        status: 'pending' as UserStatus,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'user2',
        full_name: 'User Two',
        email: 'user2@example.com',
        status: 'pending' as UserStatus,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    it('should retrieve pending users with pagination', async () => {
      mockPrisma.profiles.findMany.mockResolvedValue(mockPendingUsers);
      mockPrisma.profiles.count.mockResolvedValue(2);

      const result = await ProfileService.getPendingUsers(1, 10);

      expect(result.success).toBe(true);
      expect(result.data?.data).toHaveLength(2);
      expect(result.data?.total).toBe(2);
      expect(result.data?.page).toBe(1);
      expect(result.data?.limit).toBe(10);
      expect(result.data?.hasMore).toBe(false);

      expect(mockPrisma.profiles.findMany).toHaveBeenCalledWith({
        where: { status: 'pending' },
        orderBy: { created_at: 'desc' },
        skip: 0,
        take: 10
      });
    });

    it('should handle pagination correctly', async () => {
      mockPrisma.profiles.findMany.mockResolvedValue([mockPendingUsers[0]]);
      mockPrisma.profiles.count.mockResolvedValue(25);

      const result = await ProfileService.getPendingUsers(2, 10);

      expect(result.success).toBe(true);
      expect(result.data?.hasMore).toBe(true);
      expect(mockPrisma.profiles.findMany).toHaveBeenCalledWith({
        where: { status: 'pending' },
        orderBy: { created_at: 'desc' },
        skip: 10,
        take: 10
      });
    });
  });

  describe('approveUsers', () => {
    const mockApprovalData = {
      user_ids: ['user1', 'user2', 'user3'],
      approved_by: 'admin-user-id'
    };

    it('should approve all users successfully', async () => {
      // Mock successful profile lookups and updates
      mockPrisma.profiles.findUnique
        .mockResolvedValueOnce({ id: 'user1', status: 'pending' })
        .mockResolvedValueOnce({ id: 'user2', status: 'pending' })
        .mockResolvedValueOnce({ id: 'user3', status: 'pending' });

      mockPrisma.profiles.update
        .mockResolvedValueOnce({ id: 'user1', status: 'active' })
        .mockResolvedValueOnce({ id: 'user2', status: 'active' })
        .mockResolvedValueOnce({ id: 'user3', status: 'active' });

      const result = await ProfileService.approveUsers(mockApprovalData);

      expect(result.success).toBe(true);
      expect(result.data?.successful).toHaveLength(3);
      expect(result.data?.failed).toHaveLength(0);
      expect(result.data?.total_processed).toBe(3);
    });

    it('should handle partial failures', async () => {
      // Mock mixed success/failure scenario
      mockPrisma.profiles.findUnique
        .mockResolvedValueOnce({ id: 'user1', status: 'pending' })
        .mockResolvedValueOnce(null) // User not found
        .mockResolvedValueOnce({ id: 'user3', status: 'pending' });

      mockPrisma.profiles.update
        .mockResolvedValueOnce({ id: 'user1', status: 'active' })
        .mockResolvedValueOnce({ id: 'user3', status: 'active' });

      const result = await ProfileService.approveUsers(mockApprovalData);

      expect(result.success).toBe(true);
      expect(result.data?.successful).toHaveLength(2);
      expect(result.data?.failed).toHaveLength(1);
      expect(result.data?.failed[0].user_id).toBe('user2');
    });
  });

  describe('searchUsers', () => {
    const mockUsers = [
      {
        id: 'user1',
        full_name: 'John Doe',
        email: 'john@example.com',
        status: 'active' as UserStatus,
        role: 'admin' as SystemRole,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    it('should search users with filters', async () => {
      const filters = {
        status: ['active' as UserStatus],
        search_term: 'john'
      };

      mockPrisma.profiles.findMany.mockResolvedValue(mockUsers);
      mockPrisma.profiles.count.mockResolvedValue(1);

      const result = await ProfileService.searchUsers(filters);

      expect(result.success).toBe(true);
      expect(result.data?.users).toHaveLength(1);
      expect(result.data?.total_count).toBe(1);

      expect(mockPrisma.profiles.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['active'] },
          OR: [
            { full_name: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } }
          ]
        },
        orderBy: { created_at: 'desc' },
        skip: 0,
        take: 20
      });
    });

    it('should handle empty search results', async () => {
      mockPrisma.profiles.findMany.mockResolvedValue([]);
      mockPrisma.profiles.count.mockResolvedValue(0);

      const result = await ProfileService.searchUsers({ search_term: 'nonexistent' });

      expect(result.success).toBe(true);
      expect(result.data?.users).toHaveLength(0);
      expect(result.data?.total_count).toBe(0);
    });
  });

  describe('deleteProfile', () => {
    const mockUserId = 'test-user-id';
    const mockDeletedBy = 'admin-user-id';

    it('should soft delete profile by setting status to inactive', async () => {
      mockPrisma.profiles.update.mockResolvedValue({
        id: mockUserId,
        status: 'inactive'
      });

      const result = await ProfileService.deleteProfile(mockUserId, mockDeletedBy);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockPrisma.profiles.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          status: 'inactive',
          updated_at: expect.any(Date)
        }
      });
    });
  });
});