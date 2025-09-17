/**
 * Example usage of CriteriaValidator
 * 
 * This file demonstrates how to use the CriteriaValidator class
 * in different scenarios within the project lifecycle management system.
 */

import { CriteriaValidator } from '../criteria-validator'

// Example 1: Basic usage in an API route
export async function validateProjectPhaseTransition(projectId: string, targetPhase: string) {
  const validator = new CriteriaValidator()
  
  try {
    switch (targetPhase) {
      case 'staffing':
        const prepResult = await validator.validatePrepCompletion(projectId)
        return {
          canTransition: prepResult.isComplete,
          blockers: prepResult.blockers,
          pendingItems: prepResult.pendingItems
        }
        
      case 'pre_show':
        const staffingResult = await validator.validateStaffingCompletion(projectId)
        return {
          canTransition: staffingResult.isComplete,
          blockers: staffingResult.blockers,
          pendingItems: staffingResult.pendingItems
        }
        
      case 'active':
        const preShowResult = await validator.validatePreShowReadiness(projectId)
        return {
          canTransition: preShowResult.isComplete,
          blockers: preShowResult.blockers,
          pendingItems: preShowResult.pendingItems
        }
        
      case 'complete':
        const timecardResult = await validator.validateTimecardCompletion(projectId)
        return {
          canTransition: timecardResult.isComplete,
          blockers: timecardResult.blockers,
          pendingItems: timecardResult.pendingItems
        }
        
      default:
        throw new Error(`Unknown target phase: ${targetPhase}`)
    }
  } catch (error) {
    console.error('Phase validation failed:', error)
    return {
      canTransition: false,
      blockers: ['Validation system error'],
      pendingItems: []
    }
  }
}

// Example 2: Usage in a React component or hook
export async function usePhaseValidation(projectId: string, currentPhase: string) {
  const validator = new CriteriaValidator()
  
  const validationResults = {
    prep: null,
    staffing: null,
    preShow: null,
    timecard: null
  }
  
  try {
    // Validate all phases to show progress
    validationResults.prep = await validator.validatePrepCompletion(projectId)
    validationResults.staffing = await validator.validateStaffingCompletion(projectId)
    validationResults.preShow = await validator.validatePreShowReadiness(projectId)
    validationResults.timecard = await validator.validateTimecardCompletion(projectId)
    
    return validationResults
  } catch (error) {
    console.error('Phase validation failed:', error)
    return validationResults
  }
}

// Example 3: Validation summary for dashboard
export async function getProjectValidationSummary(projectId: string) {
  const validator = new CriteriaValidator()
  
  try {
    const [prep, staffing, preShow, timecard] = await Promise.all([
      validator.validatePrepCompletion(projectId),
      validator.validateStaffingCompletion(projectId),
      validator.validatePreShowReadiness(projectId),
      validator.validateTimecardCompletion(projectId)
    ])
    
    return {
      phases: {
        prep: {
          complete: prep.isComplete,
          progress: prep.completedItems.length / (prep.completedItems.length + prep.pendingItems.length),
          blockers: prep.blockers.length
        },
        staffing: {
          complete: staffing.isComplete,
          progress: staffing.completedItems.length / (staffing.completedItems.length + staffing.pendingItems.length),
          blockers: staffing.blockers.length
        },
        preShow: {
          complete: preShow.isComplete,
          progress: preShow.completedItems.length / (preShow.completedItems.length + preShow.pendingItems.length),
          blockers: preShow.blockers.length
        },
        timecard: {
          complete: timecard.isComplete,
          progress: timecard.completedItems.length / (timecard.completedItems.length + timecard.pendingItems.length),
          blockers: timecard.blockers.length
        }
      },
      overallReadiness: {
        totalBlockers: prep.blockers.length + staffing.blockers.length + preShow.blockers.length + timecard.blockers.length,
        completedPhases: [prep, staffing, preShow, timecard].filter(phase => phase.isComplete).length,
        totalPhases: 4
      }
    }
  } catch (error) {
    console.error('Validation summary failed:', error)
    return null
  }
}