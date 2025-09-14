// Assignment-specific logging utilities for debugging

export interface AssignmentLogContext {
  projectId: string
  date?: string
  talentId?: string
  groupId?: string
  escortId?: string
  operation: string
  userId?: string
  timestamp: Date
  metadata?: Record<string, any>
}

export enum AssignmentLogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export class AssignmentLogger {
  private static instance: AssignmentLogger
  private logs: Array<{
    level: AssignmentLogLevel
    message: string
    context: AssignmentLogContext
    timestamp: Date
  }> = []

  private constructor() {}

  static getInstance(): AssignmentLogger {
    if (!AssignmentLogger.instance) {
      AssignmentLogger.instance = new AssignmentLogger()
    }
    return AssignmentLogger.instance
  }

  private log(level: AssignmentLogLevel, message: string, context: AssignmentLogContext) {
    const logEntry = {
      level,
      message,
      context: {
        ...context,
        timestamp: new Date()
      },
      timestamp: new Date()
    }

    this.logs.push(logEntry)

    // Keep only last 1000 logs to prevent memory issues
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000)
    }

    // Console logging based on level
    const consoleMessage = `[${level.toUpperCase()}] ${message}`
    const consoleContext = {
      ...context,
      logId: this.logs.length
    }

    switch (level) {
      case AssignmentLogLevel.DEBUG:
        if (process.env.NODE_ENV === 'development') {
          console.debug(consoleMessage, consoleContext)
        }
        break
      case AssignmentLogLevel.INFO:
        console.info(consoleMessage, consoleContext)
        break
      case AssignmentLogLevel.WARN:
        console.warn(consoleMessage, consoleContext)
        break
      case AssignmentLogLevel.ERROR:
        console.error(consoleMessage, consoleContext)
        break
    }

    // In production, you would send critical logs to your monitoring service
    if (level === AssignmentLogLevel.ERROR && process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      // Sentry.captureMessage(message, 'error', { extra: consoleContext })
    }
  }

  debug(message: string, context: AssignmentLogContext) {
    this.log(AssignmentLogLevel.DEBUG, message, context)
  }

  info(message: string, context: AssignmentLogContext) {
    this.log(AssignmentLogLevel.INFO, message, context)
  }

  warn(message: string, context: AssignmentLogContext) {
    this.log(AssignmentLogLevel.WARN, message, context)
  }

  error(message: string, context: AssignmentLogContext) {
    this.log(AssignmentLogLevel.ERROR, message, context)
  }

  // Assignment-specific logging methods
  logAssignmentAttempt(context: AssignmentLogContext) {
    this.info('Assignment attempt started', {
      ...context,
      operation: 'assignment_attempt'
    })
  }

  logAssignmentSuccess(context: AssignmentLogContext) {
    this.info('Assignment completed successfully', {
      ...context,
      operation: 'assignment_success'
    })
  }

  logAssignmentFailure(context: AssignmentLogContext, error: Error) {
    this.error('Assignment failed', {
      ...context,
      operation: 'assignment_failure',
      metadata: {
        ...context.metadata,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      }
    })
  }

  logValidationFailure(context: AssignmentLogContext, validationErrors: any) {
    this.warn('Assignment validation failed', {
      ...context,
      operation: 'validation_failure',
      metadata: {
        ...context.metadata,
        validationErrors
      }
    })
  }

  logOptimisticUpdate(context: AssignmentLogContext) {
    this.debug('Optimistic update applied', {
      ...context,
      operation: 'optimistic_update'
    })
  }

  logOptimisticRollback(context: AssignmentLogContext, reason: string) {
    this.warn('Optimistic update rolled back', {
      ...context,
      operation: 'optimistic_rollback',
      metadata: {
        ...context.metadata,
        rollbackReason: reason
      }
    })
  }

  logEscortAvailabilityCheck(context: AssignmentLogContext, isAvailable: boolean) {
    this.debug('Escort availability checked', {
      ...context,
      operation: 'escort_availability_check',
      metadata: {
        ...context.metadata,
        isAvailable
      }
    })
  }

  logScheduleConsistencyCheck(context: AssignmentLogContext, isConsistent: boolean, issues?: string[]) {
    this.debug('Schedule consistency checked', {
      ...context,
      operation: 'schedule_consistency_check',
      metadata: {
        ...context.metadata,
        isConsistent,
        issues
      }
    })
  }

  logDatabaseOperation(context: AssignmentLogContext, operation: string, result: any) {
    this.debug(`Database operation: ${operation}`, {
      ...context,
      operation: `db_${operation}`,
      metadata: {
        ...context.metadata,
        result: typeof result === 'object' ? JSON.stringify(result) : result
      }
    })
  }

  logApiCall(context: AssignmentLogContext, endpoint: string, method: string, duration?: number) {
    this.debug(`API call: ${method} ${endpoint}`, {
      ...context,
      operation: 'api_call',
      metadata: {
        ...context.metadata,
        endpoint,
        method,
        duration
      }
    })
  }

  // Query methods for debugging
  getLogs(filter?: {
    level?: AssignmentLogLevel
    projectId?: string
    operation?: string
    since?: Date
  }): Array<{
    level: AssignmentLogLevel
    message: string
    context: AssignmentLogContext
    timestamp: Date
  }> {
    let filteredLogs = [...this.logs]

    if (filter) {
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filter.level)
      }
      if (filter.projectId) {
        filteredLogs = filteredLogs.filter(log => log.context.projectId === filter.projectId)
      }
      if (filter.operation) {
        filteredLogs = filteredLogs.filter(log => log.context.operation === filter.operation)
      }
      if (filter.since) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.since!)
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  getAssignmentHistory(projectId: string, talentId?: string, escortId?: string): Array<{
    level: AssignmentLogLevel
    message: string
    context: AssignmentLogContext
    timestamp: Date
  }> {
    return this.getLogs({
      projectId,
      since: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    }).filter(log => {
      if (talentId && log.context.talentId !== talentId) return false
      if (escortId && log.context.escortId !== escortId) return false
      return log.context.operation.includes('assignment')
    })
  }

  getErrorSummary(projectId: string, since?: Date): {
    totalErrors: number
    errorsByOperation: Record<string, number>
    recentErrors: Array<{
      message: string
      operation: string
      timestamp: Date
    }>
  } {
    const errors = this.getLogs({
      level: AssignmentLogLevel.ERROR,
      projectId,
      since: since || new Date(Date.now() - 60 * 60 * 1000) // Last hour
    })

    const errorsByOperation = errors.reduce((acc, error) => {
      acc[error.context.operation] = (acc[error.context.operation] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalErrors: errors.length,
      errorsByOperation,
      recentErrors: errors.slice(0, 10).map(error => ({
        message: error.message,
        operation: error.context.operation,
        timestamp: error.timestamp
      }))
    }
  }

  clearLogs() {
    this.logs = []
  }

  exportLogs(projectId?: string): string {
    const logsToExport = projectId 
      ? this.getLogs({ projectId })
      : this.logs

    return JSON.stringify(logsToExport, null, 2)
  }
}

// Singleton instance
export const assignmentLogger = AssignmentLogger.getInstance()

// Utility functions for common logging patterns
export function logAssignmentOperation<T>(
  operation: string,
  context: Omit<AssignmentLogContext, 'operation' | 'timestamp'>,
  fn: () => Promise<T>
): Promise<T> {
  const fullContext: AssignmentLogContext = {
    ...context,
    operation,
    timestamp: new Date()
  }

  assignmentLogger.logAssignmentAttempt(fullContext)

  return fn()
    .then(result => {
      assignmentLogger.logAssignmentSuccess(fullContext)
      return result
    })
    .catch(error => {
      assignmentLogger.logAssignmentFailure(fullContext, error)
      throw error
    })
}

export function createAssignmentContext(
  projectId: string,
  operation: string,
  additionalContext?: Partial<AssignmentLogContext>
): AssignmentLogContext {
  return {
    projectId,
    operation,
    timestamp: new Date(),
    ...additionalContext
  }
}