/**
 * Transition Monitoring Service
 * 
 * This service provides monitoring and alerting capabilities for the automatic
 * transition system. It tracks transition health, performance metrics, and
 * provides alerting for issues.
 * 
 * Requirements Coverage:
 * - 1.3, 1.4, 1.5, 1.6: Monitoring automatic transitions
 * - 5.3, 5.4: Monitoring timezone-aware calculations
 * 
 * @author Phase Engine Team
 * @version 1.0.0
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ProjectPhase } from './phase-engine'
import { TransitionMonitoringResult } from './automatic-transition-evaluator'

export interface TransitionMetrics {
  totalTransitions: number
  successfulTransitions: number
  failedTransitions: number
  averageEvaluationTime: number
  transitionsByPhase: Record<string, number>
  errorsByType: Record<string, number>
  timeRange: {
    start: Date
    end: Date
  }
}

export interface TransitionAlert {
  id: string
  type: 'failure' | 'performance' | 'configuration' | 'system'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  projectId?: string
  metadata?: Record<string, any>
  timestamp: Date
  resolved: boolean
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: Array<{
    name: string
    status: 'pass' | 'fail' | 'warn'
    message: string
    duration?: number
  }>
  timestamp: Date
}

/**
 * Transition Monitoring Service
 * Provides comprehensive monitoring and alerting for automatic transitions
 */
export class TransitionMonitoring {
  private supabase: any

  constructor() {
    this.supabase = null
  }

  private async getSupabaseClient() {
    if (!this.supabase) {
      const cookieStore = await cookies()
      this.supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
          },
        }
      )
    }
    return this.supabase
  }

  /**
   * Get transition metrics for a time period
   */
  async getTransitionMetrics(
    startDate: Date, 
    endDate: Date = new Date()
  ): Promise<TransitionMetrics> {
    try {
      const supabase = await this.getSupabaseClient()

      // Get transition logs from audit table
      const { data: transitions, error } = await supabase
        .from('project_audit_log')
        .select('*')
        .eq('action_type', 'phase_transition')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch transition metrics: ${error.message}`)
      }

      // Get automatic transition attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from('project_audit_log')
        .select('*')
        .eq('action_type', 'automatic_transition_attempt')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (attemptsError) {
        console.warn('Failed to fetch transition attempts:', attemptsError)
      }

      // Calculate metrics
      const totalTransitions = transitions?.length || 0
      const successfulAttempts = attempts?.filter(a => a.action_details?.success === true) || []
      const failedAttempts = attempts?.filter(a => a.action_details?.success === false) || []

      // Count transitions by phase
      const transitionsByPhase: Record<string, number> = {}
      transitions?.forEach(t => {
        const toPhase = t.action_details?.to_phase
        if (toPhase) {
          transitionsByPhase[toPhase] = (transitionsByPhase[toPhase] || 0) + 1
        }
      })

      // Count errors by type
      const errorsByType: Record<string, number> = {}
      failedAttempts.forEach(a => {
        const error = a.action_details?.error || 'Unknown error'
        const errorType = this.categorizeError(error)
        errorsByType[errorType] = (errorsByType[errorType] || 0) + 1
      })

      return {
        totalTransitions,
        successfulTransitions: successfulAttempts.length,
        failedTransitions: failedAttempts.length,
        averageEvaluationTime: 0, // Would need to track evaluation times
        transitionsByPhase,
        errorsByType,
        timeRange: { start: startDate, end: endDate }
      }

    } catch (error) {
      console.error('Error getting transition metrics:', error)
      throw error
    }
  }

  /**
   * Perform health check on transition system
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = []
    let overallStatus: HealthCheckResult['status'] = 'healthy'

    try {
      const supabase = await this.getSupabaseClient()

      // Check 1: Database connectivity
      const dbStart = Date.now()
      try {
        await supabase.from('projects').select('id').limit(1)
        checks.push({
          name: 'Database Connectivity',
          status: 'pass',
          message: 'Database is accessible',
          duration: Date.now() - dbStart
        })
      } catch (error) {
        checks.push({
          name: 'Database Connectivity',
          status: 'fail',
          message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
        overallStatus = 'unhealthy'
      }

      // Check 2: Recent transition activity
      const activityStart = Date.now()
      try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const { data: recentActivity } = await supabase
          .from('project_audit_log')
          .select('id')
          .eq('action_type', 'automatic_transition_attempt')
          .gte('created_at', oneDayAgo.toISOString())

        const activityCount = recentActivity?.length || 0
        
        if (activityCount > 0) {
          checks.push({
            name: 'Recent Transition Activity',
            status: 'pass',
            message: `${activityCount} transition attempts in last 24 hours`,
            duration: Date.now() - activityStart
          })
        } else {
          checks.push({
            name: 'Recent Transition Activity',
            status: 'warn',
            message: 'No transition attempts in last 24 hours',
            duration: Date.now() - activityStart
          })
          if (overallStatus === 'healthy') overallStatus = 'degraded'
        }
      } catch (error) {
        checks.push({
          name: 'Recent Transition Activity',
          status: 'fail',
          message: `Failed to check activity: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
        overallStatus = 'unhealthy'
      }

      // Check 3: Failed transitions in last hour
      const failureStart = Date.now()
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        const { data: recentFailures } = await supabase
          .from('project_audit_log')
          .select('id')
          .eq('action_type', 'automatic_transition_attempt')
          .eq('action_details->success', false)
          .gte('created_at', oneHourAgo.toISOString())

        const failureCount = recentFailures?.length || 0
        
        if (failureCount === 0) {
          checks.push({
            name: 'Recent Failures',
            status: 'pass',
            message: 'No failed transitions in last hour',
            duration: Date.now() - failureStart
          })
        } else if (failureCount < 5) {
          checks.push({
            name: 'Recent Failures',
            status: 'warn',
            message: `${failureCount} failed transitions in last hour`,
            duration: Date.now() - failureStart
          })
          if (overallStatus === 'healthy') overallStatus = 'degraded'
        } else {
          checks.push({
            name: 'Recent Failures',
            status: 'fail',
            message: `${failureCount} failed transitions in last hour (high failure rate)`,
            duration: Date.now() - failureStart
          })
          overallStatus = 'unhealthy'
        }
      } catch (error) {
        checks.push({
          name: 'Recent Failures',
          status: 'fail',
          message: `Failed to check failures: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
        overallStatus = 'unhealthy'
      }

      // Check 4: Configuration validation
      const configStart = Date.now()
      try {
        const requiredEnvVars = [
          'NEXT_PUBLIC_SUPABASE_URL',
          'NEXT_PUBLIC_SUPABASE_ANON_KEY'
        ]
        
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
        
        if (missingVars.length === 0) {
          checks.push({
            name: 'Configuration',
            status: 'pass',
            message: 'All required environment variables are set',
            duration: Date.now() - configStart
          })
        } else {
          checks.push({
            name: 'Configuration',
            status: 'fail',
            message: `Missing environment variables: ${missingVars.join(', ')}`,
            duration: Date.now() - configStart
          })
          overallStatus = 'unhealthy'
        }
      } catch (error) {
        checks.push({
          name: 'Configuration',
          status: 'fail',
          message: `Configuration check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
        overallStatus = 'unhealthy'
      }

      return {
        status: overallStatus,
        checks,
        timestamp: new Date()
      }

    } catch (error) {
      return {
        status: 'unhealthy',
        checks: [{
          name: 'Health Check',
          status: 'fail',
          message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        timestamp: new Date()
      }
    }
  }

  /**
   * Create an alert for transition issues
   */
  async createAlert(alert: Omit<TransitionAlert, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    try {
      const supabase = await this.getSupabaseClient()

      await supabase
        .from('project_audit_log')
        .insert({
          project_id: alert.projectId,
          action_type: 'transition_alert',
          action_details: {
            alert_type: alert.type,
            severity: alert.severity,
            title: alert.title,
            message: alert.message,
            metadata: alert.metadata,
            timestamp: new Date().toISOString()
          },
          performed_by: 'system',
          created_at: new Date().toISOString()
        })

      console.log(`Created transition alert: ${alert.title}`)
    } catch (error) {
      console.error('Failed to create transition alert:', error)
    }
  }

  /**
   * Get recent alerts
   */
  async getRecentAlerts(hours: number = 24): Promise<TransitionAlert[]> {
    try {
      const supabase = await this.getSupabaseClient()
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)

      const { data: alerts, error } = await supabase
        .from('project_audit_log')
        .select('*')
        .eq('action_type', 'transition_alert')
        .gte('created_at', cutoffTime.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch alerts: ${error.message}`)
      }

      return (alerts || []).map(alert => ({
        id: alert.id,
        type: alert.action_details?.alert_type || 'system',
        severity: alert.action_details?.severity || 'medium',
        title: alert.action_details?.title || 'Unknown Alert',
        message: alert.action_details?.message || '',
        projectId: alert.project_id,
        metadata: alert.action_details?.metadata,
        timestamp: new Date(alert.created_at),
        resolved: false // Would need additional logic to track resolution
      }))

    } catch (error) {
      console.error('Error getting recent alerts:', error)
      return []
    }
  }

  /**
   * Monitor transition performance and create alerts if needed
   */
  async monitorTransitionPerformance(result: TransitionMonitoringResult): Promise<void> {
    try {
      // Alert on high failure rate
      if (result.failedTransitions > 0 && result.evaluatedProjects > 0) {
        const failureRate = result.failedTransitions / result.evaluatedProjects
        
        if (failureRate > 0.5) {
          await this.createAlert({
            type: 'performance',
            severity: 'critical',
            title: 'High Transition Failure Rate',
            message: `${Math.round(failureRate * 100)}% of transitions failed (${result.failedTransitions}/${result.evaluatedProjects})`,
            metadata: { result }
          })
        } else if (failureRate > 0.2) {
          await this.createAlert({
            type: 'performance',
            severity: 'high',
            title: 'Elevated Transition Failure Rate',
            message: `${Math.round(failureRate * 100)}% of transitions failed (${result.failedTransitions}/${result.evaluatedProjects})`,
            metadata: { result }
          })
        }
      }

      // Alert on specific errors
      result.errors.forEach(async (error) => {
        const errorType = this.categorizeError(error.error)
        
        if (errorType === 'configuration' || errorType === 'database') {
          await this.createAlert({
            type: 'system',
            severity: 'high',
            title: `Transition System Error`,
            message: error.error,
            projectId: error.projectId,
            metadata: { error, errorType }
          })
        }
      })

    } catch (error) {
      console.error('Error monitoring transition performance:', error)
    }
  }

  /**
   * Categorize error types for better monitoring
   */
  private categorizeError(error: string): string {
    const errorLower = error.toLowerCase()
    
    if (errorLower.includes('database') || errorLower.includes('connection')) {
      return 'database'
    } else if (errorLower.includes('timezone') || errorLower.includes('date')) {
      return 'timezone'
    } else if (errorLower.includes('configuration') || errorLower.includes('environment')) {
      return 'configuration'
    } else if (errorLower.includes('permission') || errorLower.includes('unauthorized')) {
      return 'authorization'
    } else if (errorLower.includes('validation') || errorLower.includes('criteria')) {
      return 'validation'
    } else {
      return 'unknown'
    }
  }
}

/**
 * Singleton instance for global use
 */
let monitoringInstance: TransitionMonitoring | null = null

/**
 * Get or create the global monitoring instance
 */
export function getTransitionMonitoring(): TransitionMonitoring {
  if (!monitoringInstance) {
    monitoringInstance = new TransitionMonitoring()
  }
  return monitoringInstance
}