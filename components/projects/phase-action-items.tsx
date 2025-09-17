"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Info
} from 'lucide-react'
import { ProjectPhase } from '@/lib/types/project-phase'
import { cn } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface ActionItem {
  id: string
  title: string
  description: string
  category: string
  priority: 'high' | 'medium' | 'low'
  completed: boolean
  requiredForTransition: boolean
  source?: 'phase' | 'readiness'
}

interface ActionItemsSummary {
  total: number
  completed: number
  required: number
  requiredCompleted: number
  byPriority: {
    high: number
    medium: number
    low: number
  }
  byCategory: Record<string, number>
}

interface PhaseActionItemsProps {
  projectId: string
  currentPhase: ProjectPhase
  className?: string
  showFilters?: boolean
  showSummary?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

const priorityConfig = {
  high: {
    label: 'High',
    color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
    icon: AlertTriangle
  },
  medium: {
    label: 'Medium',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
    icon: Clock
  },
  low: {
    label: 'Low',
    color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
    icon: Info
  }
}

export function PhaseActionItems({
  projectId,
  currentPhase,
  className,
  showFilters = true,
  showSummary = true,
  autoRefresh = false,
  refreshInterval = 30000
}: PhaseActionItemsProps) {
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [phaseItems, setPhaseItems] = useState<ActionItem[]>([])
  const [readinessItems, setReadinessItems] = useState<ActionItem[]>([])
  const [summary, setSummary] = useState<ActionItemsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [showRequiredOnly, setShowRequiredOnly] = useState(false)
  const [showCompletedItems, setShowCompletedItems] = useState(false)
  const [activeTab, setActiveTab] = useState('combined')
  
  // Collapsible sections
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['all']))

  useEffect(() => {
    fetchActionItems()
  }, [projectId, currentPhase])

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchActionItems(true)
      }, refreshInterval)
      
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, projectId, currentPhase])

  const fetchActionItems = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const params = new URLSearchParams({
        phase: currentPhase,
        includeReadiness: 'true'
      })

      const response = await fetch(`/api/projects/${projectId}/phase/action-items?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch action items')
      }

      const result = await response.json()
      
      setActionItems(result.data.actionItems || [])
      setPhaseItems(result.data.phaseItems || [])
      setReadinessItems(result.data.readinessItems || [])
      setSummary(result.data.summary || null)
    } catch (err: any) {
      console.error('Error fetching action items:', err)
      setError(err.message || 'Failed to load action items')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleItemToggle = async (itemId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/phase/action-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemId,
          action: completed ? 'complete' : 'uncomplete'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update action item')
      }

      // Optimistically update the UI
      const updateItems = (items: ActionItem[]) =>
        items.map(item =>
          item.id === itemId ? { ...item, completed } : item
        )

      setActionItems(updateItems)
      setPhaseItems(updateItems)
      setReadinessItems(updateItems)

      // Refresh to get updated summary
      setTimeout(() => fetchActionItems(true), 500)
    } catch (err: any) {
      console.error('Error updating action item:', err)
      // Revert optimistic update on error
      fetchActionItems(true)
    }
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const filterItems = (items: ActionItem[]) => {
    return items.filter(item => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false
      if (selectedPriority !== 'all' && item.priority !== selectedPriority) return false
      if (showRequiredOnly && !item.requiredForTransition) return false
      if (!showCompletedItems && item.completed) return false
      return true
    })
  }

  const groupItemsByCategory = (items: ActionItem[]) => {
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    }, {} as Record<string, ActionItem[]>)

    // Sort categories by priority (categories with high priority items first)
    return Object.entries(grouped).sort(([, itemsA], [, itemsB]) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const maxPriorityA = Math.max(...itemsA.map(item => priorityOrder[item.priority]))
      const maxPriorityB = Math.max(...itemsB.map(item => priorityOrder[item.priority]))
      return maxPriorityB - maxPriorityA
    })
  }

  const getUniqueCategories = (items: ActionItem[]) => {
    return Array.from(new Set(items.map(item => item.category))).sort()
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const filteredActionItems = filterItems(actionItems)
  const filteredPhaseItems = filterItems(phaseItems)
  const filteredReadinessItems = filterItems(readinessItems)
  const categories = getUniqueCategories(actionItems)

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Action Items</CardTitle>
          <div className="flex items-center gap-2">
            {refreshing && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchActionItems(true)}
              disabled={refreshing}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {showSummary && summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{summary.completed}</div>
              <div className="text-sm text-muted-foreground">of {summary.total} completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{summary.requiredCompleted}</div>
              <div className="text-sm text-muted-foreground">of {summary.required} required</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.byPriority.high}</div>
              <div className="text-sm text-muted-foreground">high priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{summary.byPriority.medium}</div>
              <div className="text-sm text-muted-foreground">medium priority</div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {showFilters && (
          <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1 text-sm border rounded-md bg-background"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-1 text-sm border rounded-md bg-background"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={showRequiredOnly}
                onCheckedChange={setShowRequiredOnly}
              />
              Required only
            </label>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={showCompletedItems}
                onCheckedChange={setShowCompletedItems}
              />
              Show completed
            </label>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="combined">
              All Items ({filteredActionItems.length})
            </TabsTrigger>
            <TabsTrigger value="phase">
              Phase Items ({filteredPhaseItems.length})
            </TabsTrigger>
            <TabsTrigger value="readiness">
              Readiness Items ({filteredReadinessItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="combined" className="space-y-4">
            <ActionItemsList
              items={filteredActionItems}
              onItemToggle={handleItemToggle}
              expandedCategories={expandedCategories}
              onToggleCategory={toggleCategory}
            />
          </TabsContent>

          <TabsContent value="phase" className="space-y-4">
            <ActionItemsList
              items={filteredPhaseItems}
              onItemToggle={handleItemToggle}
              expandedCategories={expandedCategories}
              onToggleCategory={toggleCategory}
            />
          </TabsContent>

          <TabsContent value="readiness" className="space-y-4">
            <ActionItemsList
              items={filteredReadinessItems}
              onItemToggle={handleItemToggle}
              expandedCategories={expandedCategories}
              onToggleCategory={toggleCategory}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

interface ActionItemsListProps {
  items: ActionItem[]
  onItemToggle: (itemId: string, completed: boolean) => void
  expandedCategories: Set<string>
  onToggleCategory: (category: string) => void
}

function ActionItemsList({
  items,
  onItemToggle,
  expandedCategories,
  onToggleCategory
}: ActionItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
        <p className="text-lg font-medium">All caught up!</p>
        <p className="text-sm">No action items match your current filters.</p>
      </div>
    )
  }

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, ActionItem[]>)

  return (
    <div className="space-y-4">
      {Object.entries(groupedItems).map(([category, categoryItems]) => {
        const isExpanded = expandedCategories.has(category)
        const completedCount = categoryItems.filter(item => item.completed).length
        const requiredCount = categoryItems.filter(item => item.requiredForTransition).length

        return (
          <div key={category} className="border rounded-lg">
            <button
              onClick={() => onToggleCategory(category)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <h3 className="font-medium capitalize">{category}</h3>
                <Badge variant="outline" className="text-xs">
                  {completedCount}/{categoryItems.length}
                </Badge>
                {requiredCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {requiredCount} required
                  </Badge>
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t">
                {categoryItems.map((item, index) => (
                  <ActionItemRow
                    key={item.id}
                    item={item}
                    onToggle={onItemToggle}
                    isLast={index === categoryItems.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface ActionItemRowProps {
  item: ActionItem
  onToggle: (itemId: string, completed: boolean) => void
  isLast: boolean
}

function ActionItemRow({ item, onToggle, isLast }: ActionItemRowProps) {
  const priorityConfig = {
    high: { color: 'text-red-600', icon: AlertTriangle },
    medium: { color: 'text-yellow-600', icon: Clock },
    low: { color: 'text-blue-600', icon: Info }
  }

  const config = priorityConfig[item.priority]
  const PriorityIcon = config.icon

  return (
    <div className={cn(
      "flex items-start gap-3 p-4",
      !isLast && "border-b",
      item.completed && "opacity-60"
    )}>
      <Checkbox
        checked={item.completed}
        onCheckedChange={(checked) => onToggle(item.id, !!checked)}
        className="mt-1"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={cn(
            "font-medium text-sm",
            item.completed && "line-through text-muted-foreground"
          )}>
            {item.title}
          </h4>
          
          <div className="flex items-center gap-1">
            <PriorityIcon className={cn("h-3 w-3", config.color)} />
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs capitalize",
                priorityConfig[item.priority].color
              )}
            >
              {item.priority}
            </Badge>
            
            {item.requiredForTransition && (
              <Badge variant="destructive" className="text-xs">
                Required
              </Badge>
            )}
            
            {item.source && (
              <Badge variant="secondary" className="text-xs">
                {item.source}
              </Badge>
            )}
          </div>
        </div>
        
        <p className={cn(
          "text-sm text-muted-foreground leading-relaxed",
          item.completed && "line-through"
        )}>
          {item.description}
        </p>
      </div>
    </div>
  )
}