/**
 * Transition Scheduler Service
 * 
 * This service provides background job functionality for periodic phase evaluation
 * and automatic transitions. It can be used with cron jobs, serverless functions,
 * or other scheduling mechanisms.
 * 
 * Requirements Coverage:
 * - 1.3, 1.4, 1.5, 1.6: Automatic transitions based on dates and completion
 * - 5.3, 5.4: Timezone-aware transition calculations
 * 
 * @author Phase Engine Team
 * @version 1.0.0
 */

import { AutomaticTransitionEvaluator, TransitionMonitoringResult } from './automatic-transition-evaluator'
import { ProjectPhase } from './phase-engine'

export interface SchedulerConfig {
  intervalMinutes: number
  enabledEnvironments: string[]
  maxConcurrentEvaluations: number
  retryFailedTransitions: boolean
  notificationWebhook?: string
}

export interface SchedulerStatus {
  isRunning: boolean
  lastRun?: Date
  nextRun?: Date
  lastResult?: TransitionMonitoringResult
  consecutiveFailures: number
}

/**
 * Transition Scheduler
 * Manages periodic evaluation and execution of automatic transitions
 */
export class TransitionScheduler {
  private evaluator: AutomaticTransitionEvaluator
  private config: SchedulerConfig
  private status: SchedulerStatus
  private intervalId?: NodeJS.Timeout

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = {
      intervalMinutes: 15,
      enabledEnvironments: ['production', 'staging'],
      maxConcurrentEvaluations: 5,
      retryFailedTransitions: true,
      ...config
    }

    this.evaluator = new AutomaticTransitionEvaluator({
      evaluationIntervalMinutes: this.config.intervalMinutes,
      alertOnFailure: true,
      dryRun: !this.isEnabledEnvironment()
    })

    this.status = {
      isRunning: false,
      consecutiveFailures: 0
    }
  }

  /**
   * Start the periodic evaluation scheduler
   */
  start(): void {
    if (this.status.isRunning) {
      console.log('Transition scheduler is already running')
      return
    }

    if (!this.isEnabledEnvironment()) {
      console.log(`Transition scheduler disabled in ${process.env.NODE_ENV} environment`)
      return
    }

    console.log(`Starting transition scheduler with ${this.config.intervalMinutes} minute intervals`)
    
    this.status.isRunning = true
    this.status.nextRun = new Date(Date.now() + this.config.intervalMinutes * 60 * 1000)

    // Run immediately on start
    this.runEvaluation()

    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      this.runEvaluation()
    }, this.config.intervalMinutes * 60 * 1000)
  }

  /**
   * Stop the periodic evaluation scheduler
   */
  stop(): void {
    if (!this.status.isRunning) {
      console.log('Transition scheduler is not running')
      return
    }

    console.log('Stopping transition scheduler')
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }

    this.status.isRunning = false
    this.status.nextRun = undefined
  }

  /**
   * Run a single evaluation cycle
   */
  async runEvaluation(): Promise<TransitionMonitoringResult> {
    const startTime = new Date()
    console.log(`Starting transition evaluation cycle at ${startTime.toISOString()}`)

    try {
      const result = await this.evaluator.evaluateAllProjects()
      
      this.status.lastRun = startTime
      this.status.lastResult = result
      this.status.consecutiveFailures = 0
      
      if (this.status.isRunning) {
        this.status.nextRun = new Date(Date.now() + this.config.intervalMinutes * 60 * 1000)
      }

      console.log(`Evaluation cycle completed: ${result.successfulTransitions} transitions, ${result.failedTransitions} failures`)

      // Send notification if configured
      if (this.config.notificationWebhook && (result.successfulTransitions > 0 || result.failedTransitions > 0)) {
        await this.sendNotification(result)
      }

      return result

    } catch (error) {
      this.status.consecutiveFailures++
      console.error('Evaluation cycle failed:', error)

      // Stop scheduler after too many consecutive failures
      if (this.status.consecutiveFailures >= 5) {
        console.error('Too many consecutive failures, stopping scheduler')
        this.stop()
      }

      throw error
    }
  }

  /**
   * Get current scheduler status
   */
  getStatus(): SchedulerStatus {
    return { ...this.status }
  }

  /**
   * Get upcoming scheduled transitions
   */
  async getUpcomingTransitions(hoursAhead: number = 24) {
    return await this.evaluator.getScheduledTransitions(hoursAhead)
  }

  /**
   * Force evaluation of a specific project
   */
  async evaluateProject(projectId: string) {
    return await this.evaluator.evaluateProject(projectId)
  }

  /**
   * Check if scheduler should run in current environment
   */
  private isEnabledEnvironment(): boolean {
    const currentEnv = process.env.NODE_ENV || 'development'
    return this.config.enabledEnvironments.includes(currentEnv)
  }

  /**
   * Send notification about evaluation results
   */
  private async sendNotification(result: TransitionMonitoringResult): Promise<void> {
    if (!this.config.notificationWebhook) {
      return
    }

    try {
      const payload = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        result: {
          totalProjects: result.totalProjects,
          successfulTransitions: result.successfulTransitions,
          failedTransitions: result.failedTransitions,
          scheduledTransitions: result.scheduledTransitions,
          errorCount: result.errors.length
        },
        errors: result.errors.slice(0, 5) // Limit to first 5 errors
      }

      const response = await fetch(this.config.notificationWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        console.error('Failed to send notification:', response.statusText)
      }
    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }
}

/**
 * Singleton instance for global use
 */
let schedulerInstance: TransitionScheduler | null = null

/**
 * Get or create the global scheduler instance
 */
export function getTransitionScheduler(config?: Partial<SchedulerConfig>): TransitionScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new TransitionScheduler(config)
  }
  return schedulerInstance
}

/**
 * Utility function for serverless/cron job environments
 * Can be called directly from API routes or cron handlers
 */
export async function runScheduledEvaluation(): Promise<TransitionMonitoringResult> {
  const evaluator = new AutomaticTransitionEvaluator({
    alertOnFailure: true,
    dryRun: process.env.NODE_ENV !== 'production'
  })

  console.log('Running scheduled transition evaluation')
  const result = await evaluator.evaluateAllProjects()
  
  console.log(`Scheduled evaluation complete: ${result.successfulTransitions} successful, ${result.failedTransitions} failed`)
  return result
}

/**
 * Utility function to check for imminent transitions
 * Useful for dashboard warnings or notifications
 */
export async function getImminentTransitions(minutesAhead: number = 60): Promise<Array<{
  projectId: string
  projectName: string
  currentPhase: ProjectPhase
  targetPhase: ProjectPhase
  scheduledAt: Date
  minutesUntilTransition: number
}>> {
  const evaluator = new AutomaticTransitionEvaluator()
  const hoursAhead = Math.ceil(minutesAhead / 60)
  const scheduled = await evaluator.getScheduledTransitions(hoursAhead)
  
  const now = new Date()
  const cutoffTime = new Date(now.getTime() + minutesAhead * 60 * 1000)
  
  return scheduled
    .filter(transition => transition.scheduledAt <= cutoffTime)
    .map(transition => ({
      ...transition,
      minutesUntilTransition: Math.ceil((transition.scheduledAt.getTime() - now.getTime()) / (1000 * 60))
    }))
    .sort((a, b) => a.minutesUntilTransition - b.minutesUntilTransition)
}