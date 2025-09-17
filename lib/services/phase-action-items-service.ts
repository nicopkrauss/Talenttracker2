import { PhaseEngine, ProjectPhase, ActionItem } from './phase-engine'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { string } from 'zod'
import { title } from 'process'
import { string } from 'zod'
import { string } from 'zod'
import { string } from 'zod'
import { string } from 'zod'
import { boolean } from 'zod'
import { string } from 'zod'
import { string } from 'zod'
import { string } from 'zod'
import { todo } from 'node:test'
import { todo } from 'node:test'
import { todo } from 'node:test'
import { todo } from 'node:test'
import { todo } from 'node:test'
import { title } from 'process'
import { todo } from 'node:test'
import { todo } from 'node:test'
import { boolean } from 'zod'
import { string } from 'zod'
import { title } from 'process'

/**
 * Phase-Aware Action Items Service
 * Integrates phase-specific action items with existing readiness system
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */
export class PhaseActionItemsService {
  private phaseEngine: PhaseEngine
  private supabase: any

  constructor() {
    this.phaseEngine = new PhaseEngine()
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
   * Get comprehensive action items combining phase-specific and readiness-based items
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
   */
  async getActionItems(projectId: string, options?: {
    phase?: ProjectPhase
    category?: string
    priority?: 'high' | 'medium' | 'low'
    requiredOnly?: boolean
    includeReadinessItems?: boolean
  }): Promise<{
    phaseItems: ActionItem[]
    readinessItems: ActionItem[]
    combinedItems: ActionItem[]
    summary: {
      total: number
      completed: number
      pending: number
      required: number
      byPhase: Record<string, number>
      byPriority: Record<string, number>
      byCategory: Record<string, number>
    }
  }> {
    try {
      const supabase = await this.getSupabaseClient()
      
      // Get current phase
      const currentPhase = options?.phase || await this.phaseEngine.getCurrentPhase(projectId)
      
      // Get phase-specific action items
      const phaseItems = await this.phaseEngine.getPhaseActionItems(projectId, currentPhase)
      
      // Get readiness-based action items if requested
      let readinessItems: ActionItem[] = []
      if (options?.includeReadinessItems !== false) {
        readinessItems = await this.getReadinessActionItems(projectId, currentPhase)
      }

      // Combine and deduplicate items
      const combinedItems = this.combineActionItems(phaseItems, readinessItems)

      // Apply filters
      let filteredItems = combinedItems
      if (options?.category) {
        filteredItems = filteredItems.filter(item => item.category === options.category)
      }
      if (options?.priority) {
        filteredItems = filteredItems.filter(item => item.priority === options.priority)
      }
      if (options?.requiredOnly) {
        filteredItems = filteredItems.filter(item => item.requiredForTransition)
      }

      // Calculate summary statistics
      const summary = this.calculateSummary(combinedItems, currentPhase)

      return {
        phaseItems,
        readinessItems,
        combinedItems: filteredItems,
        summary
      }
    } catch (error) {
      console.error('Error getting action items:', error)
      return {
        phaseItems: [],
        readinessItems: [],
        combinedItems: [],
        summary: {
          total: 0,
          completed: 0,
          pending: 0,
          required: 0,
          byPhase: {},
          byPriority: {},
          byCategory: {}
        }
      }
    }
  }

  /**
   * Generate action items based on existing readiness system data
   * This bridges the gap between the new phase system and existing readiness logic
   */
  private async getReadinessActionItems(projectId: string, currentPhase: ProjectPhase): Promise<ActionItem[]> {
    try {
      const supabase = await this.getSupabaseClient()
      
      // Get readiness data directly from database instead of using fetch
      // This avoids the URL issue in server-side context
      const { data: readinessData, error } = await supabase
        .from('project_readiness')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (error || !readinessData) {
        console.warn('Failed to fetch readiness data for action items:', error)
        return []
      }
      // For now, return empty array since we don't have the readiness table structure
      // This can be enhanced once the readiness system is fully implemented
      return []

      // TODO: Convert existing readiness data to phase-aware action items
      // return readinessData.todoItems?.map((todo: any) => ({
      //   id: `readiness-${todo.id}`,
      //   title: todo.title,
      //   description: todo.description,
      //   category: this.mapReadinessCategoryToPhaseCategory(todo.area, currentPhase),
      //   priority: this.mapReadinessPriorityToActionPriority(todo.priority),
      //   completed: false,
      //   requiredForTransition: todo.priority === 'critical'
      // }))
    } catch (error) {
      console.error('Error getting readiness action items:', error)
      return []
    }
  }

  /**
   * Map readiness categories to phase-appropriate categories
   */
  private mapReadinessCategoryToPhaseCategory(readinessArea: string, phase: ProjectPhase): string {
    const mapping: Record<string, Record<ProjectPhase, string>> = {
      'team': {
        [ProjectPhase.PREP]: 'setup',
        [ProjectPhase.STAFFING]: 'staffing',
        [ProjectPhase.PRE_SHOW]: 'preparation',
        [ProjectPhase.ACTIVE]: 'operations',
        [ProjectPhase.POST_SHOW]: 'payroll',
        [ProjectPhase.COMPLETE]: 'completion',
        [ProjectPhase.ARCHIVED]: 'archival'
      },
      'talent': {
        [ProjectPhase.PREP]: 'setup',
        [ProjectPhase.STAFFING]: 'staffing',
        [ProjectPhase.PRE_SHOW]: 'preparation',
        [ProjectPhase.ACTIVE]: 'operations',
        [ProjectPhase.POST_SHOW]: 'completion',
        [ProjectPhase.COMPLETE]: 'completion',
        [ProjectPhase.ARCHIVED]: 'archival'
      },
      'assignments': {
        [ProjectPhase.PREP]: 'setup',
        [ProjectPhase.STAFFING]: 'staffing',
        [ProjectPhase.PRE_SHOW]: 'assignments',
        [ProjectPhase.ACTIVE]: 'operations',
        [ProjectPhase.POST_SHOW]: 'completion',
        [ProjectPhase.COMPLETE]: 'completion',
        [ProjectPhase.ARCHIVED]: 'archival'
      },
      'roles': {
        [ProjectPhase.PREP]: 'setup',
        [ProjectPhase.STAFFING]: 'staffing',
        [ProjectPhase.PRE_SHOW]: 'preparation',
        [ProjectPhase.ACTIVE]: 'operations',
        [ProjectPhase.POST_SHOW]: 'completion',
        [ProjectPhase.COMPLETE]: 'completion',
        [ProjectPhase.ARCHIVED]: 'archival'
      },
      'locations': {
        [ProjectPhase.PREP]: 'setup',
        [ProjectPhase.STAFFING]: 'setup',
        [ProjectPhase.PRE_SHOW]: 'preparation',
        [ProjectPhase.ACTIVE]: 'operations',
        [ProjectPhase.POST_SHOW]: 'completion',
        [ProjectPhase.COMPLETE]: 'completion',
        [ProjectPhase.ARCHIVED]: 'archival'
      }
    }

    return mapping[readinessArea]?.[phase] || 'general'
  }

  /**
   * Map readiness priority to action item priority
   */
  private mapReadinessPriorityToActionPriority(readinessPriority: string): 'high' | 'medium' | 'low' {
    switch (readinessPriority) {
      case 'critical':
        return 'high'
      case 'important':
        return 'medium'
      case 'optional':
        return 'low'
      default:
        return 'medium'
    }
  }

  /**
   * Combine and deduplicate action items from different sources
   */
  private combineActionItems(phaseItems: ActionItem[], readinessItems: ActionItem[]): ActionItem[] {
    const itemMap = new Map<string, ActionItem>()
    
    // Add phase items first (they take priority)
    phaseItems.forEach(item => {
      itemMap.set(item.id, item)
    })

    // Add readiness items if they don't conflict
    readinessItems.forEach(item => {
      // Check for similar items by title similarity
      const existingItem = Array.from(itemMap.values()).find(existing => 
        this.areItemsSimilar(existing, item)
      )
      
      if (!existingItem) {
        itemMap.set(item.id, item)
      }
    })

    return Array.from(itemMap.values()).sort((a, b) => {
      // Sort by priority (high -> medium -> low), then by required status
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const aPriority = priorityOrder[a.priority]
      const bPriority = priorityOrder[b.priority]
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      if (a.requiredForTransition !== b.requiredForTransition) {
        return a.requiredForTransition ? -1 : 1
      }
      
      return a.title.localeCompare(b.title)
    })
  }

  /**
   * Check if two action items are similar enough to be considered duplicates
   */
  private areItemsSimilar(item1: ActionItem, item2: ActionItem): boolean {
    // Simple similarity check based on title keywords
    const keywords1 = item1.title.toLowerCase().split(' ')
    const keywords2 = item2.title.toLowerCase().split(' ')
    
    const commonKeywords = keywords1.filter(word => 
      keywords2.includes(word) && word.length > 3
    )
    
    return commonKeywords.length >= 2
  }

  /**
   * Calculate summary statistics for action items
   */
  private calculateSummary(items: ActionItem[], currentPhase: ProjectPhase) {
    const summary = {
      total: items.length,
      completed: items.filter(item => item.completed).length,
      pending: items.filter(item => !item.completed).length,
      required: items.filter(item => item.requiredForTransition).length,
      byPhase: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      byCategory: {} as Record<string, number>
    }

    // Count by phase (current phase gets all items)
    summary.byPhase[currentPhase] = items.length

    // Count by priority
    items.forEach(item => {
      summary.byPriority[item.priority] = (summary.byPriority[item.priority] || 0) + 1
    })

    // Count by category
    items.forEach(item => {
      summary.byCategory[item.category] = (summary.byCategory[item.category] || 0) + 1
    })

    return summary
  }

  /**
   * Mark an action item as completed
   */
  async markItemCompleted(projectId: string, itemId: string): Promise<void> {
    try {
      // This would typically update the underlying data that drives the action item
      // For now, we'll just log the completion
      console.log(`Action item ${itemId} marked as completed for project ${projectId}`)
      
      // In a full implementation, this would:
      // 1. Update the relevant readiness data
      // 2. Trigger a readiness recalculation
      // 3. Potentially trigger phase transition evaluation
    } catch (error) {
      console.error('Error marking item as completed:', error)
      throw error
    }
  }

  /**
   * Get action items filtered by phase-specific criteria
   */
  async getPhaseSpecificItems(projectId: string, phase: ProjectPhase): Promise<ActionItem[]> {
    const result = await this.getActionItems(projectId, { 
      phase, 
      includeReadinessItems: true 
    })
    return result.combinedItems
  }

  /**
   * Get only critical action items that block phase transitions
   */
  async getCriticalItems(projectId: string): Promise<ActionItem[]> {
    const result = await this.getActionItems(projectId, { 
      requiredOnly: true,
      includeReadinessItems: true 
    })
    return result.combinedItems
  }
}