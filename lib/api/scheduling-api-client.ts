"use client"

import { 
  SchedulingError, 
  SchedulingErrorHandler, 
  SchedulingErrorCode,
  parseApiError,
  handleFetchError
} from '@/lib/error-handling/scheduling-errors'

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  headers?: Record<string, string>
  timeout?: number
  retries?: number
  retryDelay?: number
}

interface ApiResponse<T = any> {
  data?: T
  error?: string
  code?: string
  details?: any
  success?: boolean
}

export class SchedulingApiClient {
  private baseUrl: string
  private defaultTimeout: number
  private defaultRetries: number

  constructor(baseUrl = '/api', timeout = 30000, retries = 3) {
    this.baseUrl = baseUrl
    this.defaultTimeout = timeout
    this.defaultRetries = retries
  }

  private async makeRequest<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      headers = {},
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = 1000
    } = options

    const url = `${this.baseUrl}${endpoint}`
    const controller = new AbortController()
    
    // Set timeout
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal: controller.signal
    }

    if (body && method !== 'GET') {
      requestOptions.body = JSON.stringify(body)
    }

    let lastError: SchedulingError | null = null
    let attempt = 0

    while (attempt <= retries) {
      try {
        const response = await fetch(url, requestOptions)
        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData: ApiResponse = await response.json().catch(() => ({}))
          const schedulingError = parseApiError(errorData)
          
          // Don't retry client errors (4xx) except for specific cases
          if (response.status >= 400 && response.status < 500) {
            if (response.status === 429) { // Rate limit - can retry
              lastError = schedulingError
              if (attempt < retries) {
                await this.delay(retryDelay * Math.pow(2, attempt))
                attempt++
                continue
              }
            }
            throw schedulingError
          }
          
          // Server errors (5xx) can be retried
          lastError = schedulingError
          if (attempt < retries) {
            await this.delay(retryDelay * Math.pow(2, attempt))
            attempt++
            continue
          }
          
          throw schedulingError
        }

        const data: ApiResponse<T> = await response.json()
        
        if (data.success === false || data.error) {
          throw parseApiError(data)
        }

        return data.data || data as T

      } catch (error: any) {
        clearTimeout(timeoutId)
        
        if (error instanceof Error && error.name === 'AbortError') {
          throw SchedulingErrorHandler.createError(
            SchedulingErrorCode.NETWORK_ERROR,
            'Request timeout'
          )
        }

        if (error.code) {
          // Already a SchedulingError
          lastError = error as SchedulingError
        } else {
          lastError = handleFetchError(error)
        }

        // Don't retry validation errors or authorization errors
        if (lastError.code === SchedulingErrorCode.VALIDATION_ERROR ||
            lastError.code === SchedulingErrorCode.UNAUTHORIZED) {
          throw lastError
        }

        if (attempt < retries && SchedulingErrorHandler.shouldRetry(lastError)) {
          await this.delay(retryDelay * Math.pow(2, attempt))
          attempt++
          continue
        }

        throw lastError
      }
    }

    throw lastError || SchedulingErrorHandler.createError(
      SchedulingErrorCode.INTERNAL_ERROR,
      'Maximum retry attempts exceeded'
    )
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Assignment API methods
  async getAssignments(projectId: string, date: string) {
    return this.makeRequest(`/projects/${projectId}/assignments/${date}`)
  }

  async updateAssignments(
    projectId: string, 
    date: string, 
    assignments: {
      talents: Array<{ talentId: string; escortIds: string[] }>
      groups: Array<{ groupId: string; escortIds: string[] }>
    }
  ) {
    return this.makeRequest(`/projects/${projectId}/assignments/${date}`, {
      method: 'POST',
      body: assignments
    })
  }

  async clearDayAssignments(projectId: string, date: string) {
    return this.makeRequest(`/projects/${projectId}/assignments/clear-day`, {
      method: 'DELETE',
      body: { date }
    })
  }

  async getAvailableEscorts(projectId: string, date: string) {
    return this.makeRequest(`/projects/${projectId}/available-escorts/${date}`)
  }

  // Staff availability API methods
  async updateStaffAvailability(
    projectId: string,
    userId: string,
    availableDates: string[]
  ) {
    return this.makeRequest(`/projects/${projectId}/team-availability`, {
      method: 'PUT',
      body: { userId, availableDates }
    })
  }

  async confirmStaffAvailability(
    projectId: string,
    userId: string,
    availableDates: string[]
  ) {
    return this.makeRequest(`/projects/${projectId}/team-availability/confirm`, {
      method: 'POST',
      body: { userId, availableDates }
    })
  }

  // Talent scheduling API methods
  async updateTalentSchedule(
    projectId: string,
    talentId: string,
    scheduledDates: string[]
  ) {
    return this.makeRequest(`/projects/${projectId}/talent-roster/${talentId}/schedule`, {
      method: 'PUT',
      body: { scheduledDates }
    })
  }

  // Talent groups API methods
  async getTalentGroups(projectId: string) {
    return this.makeRequest(`/projects/${projectId}/talent-groups`)
  }

  async createTalentGroup(
    projectId: string,
    groupData: {
      groupName: string
      members: Array<{ name: string; role: string }>
      scheduledDates?: string[]
      pointOfContactName?: string
      pointOfContactPhone?: string
    }
  ) {
    return this.makeRequest(`/projects/${projectId}/talent-groups`, {
      method: 'POST',
      body: { projectId, ...groupData }
    })
  }

  async updateTalentGroup(
    projectId: string,
    groupId: string,
    groupData: {
      groupName?: string
      members?: Array<{ name: string; role: string }>
      pointOfContactName?: string
      pointOfContactPhone?: string
    }
  ) {
    return this.makeRequest(`/projects/${projectId}/talent-groups/${groupId}`, {
      method: 'PUT',
      body: groupData
    })
  }

  async updateTalentGroupSchedule(
    projectId: string,
    groupId: string,
    scheduledDates: string[]
  ) {
    return this.makeRequest(`/projects/${projectId}/talent-groups/${groupId}/schedule`, {
      method: 'PUT',
      body: { scheduledDates }
    })
  }

  async deleteTalentGroup(projectId: string, groupId: string) {
    return this.makeRequest(`/projects/${projectId}/talent-groups/${groupId}`, {
      method: 'DELETE'
    })
  }

  // Project schedule API methods
  async getProjectSchedule(projectId: string) {
    return this.makeRequest(`/projects/${projectId}/schedule`)
  }

  // Batch operations with transaction-like behavior
  async batchUpdateAssignments(
    projectId: string,
    updates: Array<{
      date: string
      talents: Array<{ talentId: string; escortIds: string[] }>
      groups: Array<{ groupId: string; escortIds: string[] }>
    }>
  ) {
    // Process updates sequentially to maintain consistency
    const results = []
    const errors = []

    for (const update of updates) {
      try {
        const result = await this.updateAssignments(projectId, update.date, {
          talents: update.talents,
          groups: update.groups
        })
        results.push({ date: update.date, result })
      } catch (error) {
        errors.push({ date: update.date, error })
        // Continue with other updates even if one fails
      }
    }

    if (errors.length > 0) {
      throw SchedulingErrorHandler.createError(
        SchedulingErrorCode.INTERNAL_ERROR,
        `Batch update partially failed: ${errors.length} of ${updates.length} updates failed`,
        undefined,
        { results, errors }
      )
    }

    return results
  }
}

// Default instance
export const schedulingApiClient = new SchedulingApiClient()

// Utility function for handling API calls with consistent error handling
export async function withApiErrorHandling<T>(
  apiCall: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await apiCall()
  } catch (error: any) {
    // Log error with context
    if (context) {
      SchedulingErrorHandler.logError(error as SchedulingError, { context })
    }
    
    // Re-throw to allow component-level handling
    throw error
  }
}