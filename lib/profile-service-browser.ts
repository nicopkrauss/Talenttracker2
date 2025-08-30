/**
 * Browser-Safe Profile Service
 * Handles profile operations that can run in the browser using API routes
 */

import type { UserProfile, RegistrationData, ProfileServiceResponse } from './auth-types'

export class BrowserProfileService {
  /**
   * Get user profile by ID (browser-safe)
   */
  static async getProfile(userId: string): Promise<ProfileServiceResponse<UserProfile>> {
    try {
      const response = await fetch(`/api/auth/profile?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          success: false,
          error: errorData.error || 'Failed to fetch profile'
        }
      }

      const result = await response.json()
      return result

    } catch (error) {
      console.error('Error fetching profile:', error)
      return {
        success: false,
        error: 'Failed to fetch user profile'
      }
    }
  }

  /**
   * Create a new user profile (browser-safe)
   */
  static async createProfile(
    userId: string, 
    data: Omit<RegistrationData, 'password'>
  ): Promise<ProfileServiceResponse<UserProfile>> {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          profileData: {
            full_name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            phone: data.phone,
            city: data.city,
            state: data.state,
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        return {
          success: false,
          error: errorData.error || 'Failed to create profile'
        }
      }

      const result = await response.json()
      return result

    } catch (error) {
      console.error('Error creating profile:', error)
      return {
        success: false,
        error: 'Failed to create user profile'
      }
    }
  }
}