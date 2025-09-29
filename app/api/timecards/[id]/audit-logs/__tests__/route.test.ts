import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock AuditLogService
const mockAuditLogService = {
  getAuditLogs: vi.fn(),
  getGroupedAuditLogs: vi.fn()
};

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
};

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name: string) => ({ value: 'mock-cookie-value' }))
  }))
}));

// Mock Supabase client creation
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient)
}));

vi.mock('@/lib/audit-log-service', () => ({
  AuditLogService: vi.fn(() => mockAuditLogService)
}));

describe('/api/timecards/[id]/audit-logs', () => {
  const mockTimecardId = 'timecard-123';
  const mockUserId = 'user-123';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (searchParams: Record<string, string> = {}) => {
    const url = new URL('http://localhost:3000/api/timecards/timecard-123/audit-logs');
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    
    return new NextRequest(url);
  };

  describe('Authentication and Authorization', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      });

      const request = createMockRequest();
      const response = await GET(request, { params: { id: mockTimecardId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 when user profile is not found', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Profile not found')
            })
          }))
        }))
      });

      const request = createMockRequest();
      const response = await GET(request, { params: { id: mockTimecardId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('User profile not found');
      expect(data.code).toBe('PROFILE_NOT_FOUND');
    });

    it('should return 404 when timecard does not exist', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null
      });

      let callCount = 0;
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call for user profile
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockUserId, role: 'admin' },
                  error: null
                })
              }))
            }))
          };
        } else {
          // Second call for timecard
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: new Error('Timecard not found')
                })
              }))
            }))
          };
        }
      });

      const request = createMockRequest();
      const response = await GET(request, { params: { id: mockTimecardId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Timecard not found');
      expect(data.code).toBe('NOT_FOUND');
    });

    it('should return 403 when regular user tries to access another user\'s timecard', async () => {
      const otherUserId = 'other-user-123';

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null
      });

      let callCount = 0;
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call for user profile (regular user)
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockUserId, role: null },
                  error: null
                })
              }))
            }))
          };
        } else {
          // Second call for timecard owned by different user
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockTimecardId, user_id: otherUserId },
                  error: null
                })
              }))
            }))
          };
        }
      });

      const request = createMockRequest();
      const response = await GET(request, { params: { id: mockTimecardId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden: Insufficient permissions');
      expect(data.code).toBe('FORBIDDEN');
    });
  });

  describe('Query Parameter Validation', () => {
    beforeEach(() => {
      // Setup successful auth for validation tests
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null
      });

      let callCount = 0;
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockUserId, role: 'admin' },
                  error: null
                })
              }))
            }))
          };
        } else if (callCount === 2) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockTimecardId, user_id: mockUserId },
                  error: null
                })
              }))
            }))
          };
        } else {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                head: vi.fn().mockResolvedValue({
                  count: 0
                })
              }))
            }))
          };
        }
      });

      mockAuditLogService.getAuditLogs.mockResolvedValue([]);
    });

    it('should return 400 for invalid limit parameter', async () => {
      const request = createMockRequest({ limit: '0' });
      const response = await GET(request, { params: { id: mockTimecardId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details.limit).toBeDefined();
    });

    it('should return 400 for invalid date format', async () => {
      const request = createMockRequest({ date_from: 'invalid-date' });
      const response = await GET(request, { params: { id: mockTimecardId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details.date_from).toBeDefined();
    });

    it('should accept valid query parameters', async () => {
      const request = createMockRequest({
        action_type: 'user_edit,admin_edit',
        field_name: 'check_in_time',
        date_from: '2024-01-01T00:00:00Z',
        date_to: '2024-01-31T23:59:59Z',
        limit: '25',
        offset: '10',
        grouped: 'false'
      });

      const response = await GET(request, { params: { id: mockTimecardId } });

      expect(response.status).toBe(200);
      expect(mockAuditLogService.getAuditLogs).toHaveBeenCalledWith(
        mockTimecardId,
        expect.objectContaining({
          action_type: ['user_edit', 'admin_edit'],
          field_name: ['check_in_time'],
          date_from: new Date('2024-01-01T00:00:00Z'),
          date_to: new Date('2024-01-31T23:59:59Z'),
          limit: 25,
          offset: 10
        })
      );
    });

    it('should accept status_change action_type', async () => {
      const request = createMockRequest({
        action_type: 'status_change'
      });

      const response = await GET(request, { params: { id: mockTimecardId } });

      expect(response.status).toBe(200);
      expect(mockAuditLogService.getAuditLogs).toHaveBeenCalledWith(
        mockTimecardId,
        expect.objectContaining({
          action_type: ['status_change']
        })
      );
    });

    it('should accept mixed action types including status_change', async () => {
      const request = createMockRequest({
        action_type: 'user_edit,status_change,admin_edit'
      });

      const response = await GET(request, { params: { id: mockTimecardId } });

      expect(response.status).toBe(200);
      expect(mockAuditLogService.getAuditLogs).toHaveBeenCalledWith(
        mockTimecardId,
        expect.objectContaining({
          action_type: ['user_edit', 'status_change', 'admin_edit']
        })
      );
    });

    it('should return 400 for invalid action_type', async () => {
      const request = createMockRequest({ action_type: 'invalid_action' });
      const response = await GET(request, { params: { id: mockTimecardId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details.action_type).toBeDefined();
    });
  });

  describe('Data Fetching', () => {
    beforeEach(() => {
      // Setup successful auth and authorization
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUserId } },
        error: null
      });
    });

    it('should return regular audit logs when grouped=false', async () => {
      const mockAuditLogs = [
        {
          id: 'audit-1',
          timecard_id: mockTimecardId,
          field_name: 'check_in_time',
          old_value: '09:00',
          new_value: '09:15',
          action_type: 'user_edit',
          changed_at: '2024-01-15T10:00:00.000Z',
          changed_by: mockUserId
        }
      ];

      let callCount = 0;
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockUserId, role: 'admin' },
                  error: null
                })
              }))
            }))
          };
        } else if (callCount === 2) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockTimecardId, user_id: mockUserId },
                  error: null
                })
              }))
            }))
          };
        } else {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                head: vi.fn().mockResolvedValue({
                  count: 1,
                  data: null,
                  error: null
                })
              }))
            }))
          };
        }
      });

      mockAuditLogService.getAuditLogs.mockResolvedValue(mockAuditLogs);

      const request = createMockRequest({ grouped: 'false' });
      const response = await GET(request, { params: { id: mockTimecardId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockAuditLogs);
      expect(data.pagination).toEqual({
        total: 1,
        limit: 50,
        offset: 0,
        has_more: false
      });
    });

    it('should handle pagination correctly', async () => {
      let callCount = 0;
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockUserId, role: 'admin' },
                  error: null
                })
              }))
            }))
          };
        } else if (callCount === 2) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockTimecardId, user_id: mockUserId },
                  error: null
                })
              }))
            }))
          };
        } else {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                head: vi.fn().mockResolvedValue({
                  count: 100,
                  data: null,
                  error: null
                })
              }))
            }))
          };
        }
      });

      mockAuditLogService.getAuditLogs.mockResolvedValue([]);

      const request = createMockRequest({ limit: '25', offset: '50' });
      const response = await GET(request, { params: { id: mockTimecardId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination).toEqual({
        total: 100,
        limit: 25,
        offset: 50,
        has_more: true
      });
    });

    it('should return mixed audit logs with proper chronological ordering', async () => {
      const mockMixedAuditLogs = [
        {
          id: 'audit-3',
          timecard_id: mockTimecardId,
          field_name: null,
          old_value: 'submitted',
          new_value: 'approved',
          action_type: 'status_change',
          changed_at: '2024-01-15T12:00:00.000Z',
          changed_by: 'admin-123',
          changed_by_profile: { full_name: 'Admin User' }
        },
        {
          id: 'audit-2',
          timecard_id: mockTimecardId,
          field_name: 'check_in_time',
          old_value: '09:00',
          new_value: '09:15',
          action_type: 'admin_edit',
          changed_at: '2024-01-15T11:00:00.000Z',
          changed_by: 'admin-123',
          changed_by_profile: { full_name: 'Admin User' }
        },
        {
          id: 'audit-1',
          timecard_id: mockTimecardId,
          field_name: null,
          old_value: 'draft',
          new_value: 'submitted',
          action_type: 'status_change',
          changed_at: '2024-01-15T10:00:00.000Z',
          changed_by: mockUserId,
          changed_by_profile: { full_name: 'Test User' }
        }
      ];

      let callCount = 0;
      mockSupabaseClient.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockUserId, role: 'admin' },
                  error: null
                })
              }))
            }))
          };
        } else if (callCount === 2) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: mockTimecardId, user_id: mockUserId },
                  error: null
                })
              }))
            }))
          };
        } else {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                head: vi.fn().mockResolvedValue({
                  count: 3,
                  data: null,
                  error: null
                })
              }))
            }))
          };
        }
      });

      mockAuditLogService.getAuditLogs.mockResolvedValue(mockMixedAuditLogs);

      const request = createMockRequest();
      const response = await GET(request, { params: { id: mockTimecardId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual(mockMixedAuditLogs);
      
      // Verify chronological ordering (most recent first)
      expect(data.data[0].action_type).toBe('status_change');
      expect(data.data[0].new_value).toBe('approved');
      expect(data.data[1].action_type).toBe('admin_edit');
      expect(data.data[2].action_type).toBe('status_change');
      expect(data.data[2].new_value).toBe('submitted');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 for unexpected errors', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest();
      const response = await GET(request, { params: { id: mockTimecardId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.code).toBe('INTERNAL_ERROR');
      expect(data.details).toBe('Database connection failed');
    });
  });
});