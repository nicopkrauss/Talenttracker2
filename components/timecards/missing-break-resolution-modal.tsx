"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { format } from "date-fns"
import type { Timecard } from "@/lib/types"
import { parseDate } from "@/lib/timezone-utils"

interface MissingBreakData {
  timecardId: string
  date: string
  totalHours: number
  hasBreakData: boolean
}

interface MissingBreakResolutionModalProps {
  isOpen: boolean
  onClose: () => void
  missingBreaks: MissingBreakData[]
  onResolve: (resolutions: Record<string, 'add_break' | 'no_break'>) => Promise<void>
  isResolving?: boolean
}

export function MissingBreakResolutionModal({
  isOpen,
  onClose,
  missingBreaks,
  onResolve,
  isResolving = false
}: MissingBreakResolutionModalProps) {
  const [resolutions, setResolutions] = useState<Record<string, 'add_break' | 'no_break'>>({})

  const handleResolutionChange = (timecardId: string, resolution: 'add_break' | 'no_break') => {
    setResolutions(prev => ({
      ...prev,
      [timecardId]: resolution
    }))
  }

  const handleSubmit = async () => {
    // Ensure all missing breaks have resolutions
    const allResolved = missingBreaks.every(mb => resolutions[mb.timecardId])
    if (!allResolved) {
      return
    }

    await onResolve(resolutions)
    setResolutions({}) // Reset resolutions after successful submission
  }

  const allResolved = missingBreaks.every(mb => resolutions[mb.timecardId])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Missing Break Information</span>
          </DialogTitle>
          <DialogDescription>
            The following shifts are longer than 6 hours but don't have break information. 
            Please resolve each one before submitting your timecards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {missingBreaks.map((missingBreak) => (
            <Card key={missingBreak.timecardId} className="border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {parseDate(missingBreak.date) ? format(parseDate(missingBreak.date)!, "EEEE, MMMM d, yyyy") : "Invalid Date"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {missingBreak.totalHours.toFixed(1)} hours worked
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                    Requires Break Info
                  </Badge>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-3">
                    How would you like to resolve this shift?
                  </p>
                  
                  <div className="grid gap-2">
                    <Button
                      variant={resolutions[missingBreak.timecardId] === 'add_break' ? 'default' : 'outline'}
                      className="justify-start h-auto p-3"
                      onClick={() => handleResolutionChange(missingBreak.timecardId, 'add_break')}
                    >
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-4 h-4" />
                        <div className="text-left">
                          <p className="font-medium">Add Break</p>
                          <p className="text-xs text-muted-foreground">
                            I took a break but forgot to track it
                          </p>
                        </div>
                      </div>
                    </Button>

                    <Button
                      variant={resolutions[missingBreak.timecardId] === 'no_break' ? 'default' : 'outline'}
                      className="justify-start h-auto p-3"
                      onClick={() => handleResolutionChange(missingBreak.timecardId, 'no_break')}
                    >
                      <div className="flex items-center space-x-3">
                        <XCircle className="w-4 h-4" />
                        <div className="text-left">
                          <p className="font-medium">I Did Not Take a Break</p>
                          <p className="text-xs text-muted-foreground">
                            I worked through without taking a break
                          </p>
                        </div>
                      </div>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {Object.keys(resolutions).length} of {missingBreaks.length} resolved
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isResolving}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!allResolved || isResolving}
            >
              {isResolving ? "Resolving..." : "Continue with Submission"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}