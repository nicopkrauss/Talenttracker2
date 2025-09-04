'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import { Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react'
import Papa from 'papaparse'
import { toast } from 'sonner'

interface CSVRow {
  [key: string]: string
}

interface TalentRecord {
  first_name: string
  last_name: string
  rep_name: string
  rep_email: string
  rep_phone: string
  notes?: string
  rowIndex: number
  isValid: boolean
  errors: string[]
}

interface CSVImportDialogProps {
  onImportComplete: () => void
  trigger?: React.ReactNode
}

export function CSVImportDialog({ onImportComplete, trigger }: CSVImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload')

  const [talentRecords, setTalentRecords] = useState<TalentRecord[]>([])
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [isImporting, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState<{
    successful: number
    failed: number
    errors: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setStep('upload')
    setTalentRecords([])
    setFieldMapping({})
    setIsImporting(false)
    setImportResults(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Enhanced field matching - looks for common variations and patterns
  const findField = (headers: string[], targetField: string): string | null => {
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z]/g, '')
    
    // Define comprehensive field patterns
    const fieldPatterns: Record<string, string[]> = {
      first_name: [
        'first_name', 'firstname', 'first name', 'fname', 'given_name', 'givenname'
      ],
      last_name: [
        'last_name', 'lastname', 'last name', 'lname', 'surname', 'family_name', 'familyname'
      ],
      rep_name: [
        'rep_name', 'repname', 'rep name', 'representative_name', 'representativename', 'representative name',
        'agent_name', 'agentname', 'agent name', 'manager_name', 'managername', 'manager name'
      ],
      rep_email: [
        'rep_email', 'repemail', 'rep email', 'representative_email', 'representativeemail', 'representative email',
        'agent_email', 'agentemail', 'agent email', 'manager_email', 'manageremail', 'manager email'
      ],
      rep_phone: [
        'rep_phone', 'repphone', 'rep phone', 'representative_phone', 'representativephone', 'representative phone',
        'agent_phone', 'agentphone', 'agent phone', 'manager_phone', 'managerphone', 'manager phone'
      ],
      notes: [
        'notes', 'note', 'comments', 'comment', 'description', 'bio', 'biography'
      ]
    }
    
    const patterns = fieldPatterns[targetField] || [targetField]
    
    // Find matching header
    for (const header of headers) {
      const normalizedHeader = normalize(header)
      for (const pattern of patterns) {
        if (normalizedHeader === normalize(pattern)) {
          return header
        }
      }
    }
    
    return null
  }

  // Simple validation
  const validateRecord = (record: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (!record.first_name?.trim()) errors.push('First name is required')
    if (!record.last_name?.trim()) errors.push('Last name is required')
    if (!record.rep_name?.trim()) errors.push('Representative name is required')
    if (!record.rep_email?.trim()) errors.push('Representative email is required')
    if (!record.rep_phone?.trim()) errors.push('Representative phone is required')
    
    // Simple email validation
    if (record.rep_email && !/\S+@\S+\.\S+/.test(record.rep_email)) {
      errors.push('Invalid email format')
    }
    
    // Phone validation - check if it has at least 10 digits
    if (record.rep_phone) {
      const digitsOnly = record.rep_phone.replace(/\D/g, '')
      if (digitsOnly.length < 10) {
        errors.push('Phone number must contain at least 10 digits')
      }
    }
    
    return { isValid: errors.length === 0, errors }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast.error('Error parsing CSV file')
          return
        }

        const data = results.data as CSVRow[]
        const headers = Object.keys(data[0] || {})

        if (headers.length === 0 || data.length === 0) {
          toast.error('CSV file appears to be empty')
          return
        }



        // Auto-detect fields
        const mapping: Record<string, string> = {}
        const requiredFields = ['first_name', 'last_name', 'rep_name', 'rep_email', 'rep_phone']
        const optionalFields = ['notes']
        
        requiredFields.concat(optionalFields).forEach(field => {
          const found = findField(headers, field)
          if (found) {
            mapping[field] = found
          }
        })

        setFieldMapping(mapping)

        // Check if all required fields are found
        const missingFields = requiredFields.filter(field => !mapping[field])
        
        if (missingFields.length > 0) {
          toast.error(`Missing required fields: ${missingFields.join(', ')}`)
          return
        }

        // Process and validate records
        const records: TalentRecord[] = data.map((row, index) => {
          const record: TalentRecord = {
            first_name: row[mapping.first_name]?.trim() || '',
            last_name: row[mapping.last_name]?.trim() || '',
            rep_name: row[mapping.rep_name]?.trim() || '',
            rep_email: row[mapping.rep_email]?.trim() || '',
            rep_phone: row[mapping.rep_phone]?.trim() || '',
            notes: mapping.notes ? row[mapping.notes]?.trim() || '' : '',
            rowIndex: index + 2, // +2 because row 1 is header
            isValid: false,
            errors: []
          }

          const validation = validateRecord(record)
          record.isValid = validation.isValid
          record.errors = validation.errors

          return record
        })

        setTalentRecords(records)
        setStep('preview')
        
        const validCount = records.filter(r => r.isValid).length
        toast.success(`Loaded ${data.length} records, ${validCount} valid`)
      },
      error: (error) => {
        toast.error('Failed to parse CSV file')
        console.error('CSV parsing error:', error)
      }
    })
  }

  const handleImport = async () => {
    const validRecords = talentRecords.filter(r => r.isValid)
    
    if (validRecords.length === 0) {
      toast.error('No valid records to import')
      return
    }

    setIsImporting(true)
    setStep('importing')

    try {
      const response = await fetch('/api/talent/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talent: validRecords.map(({ rowIndex, isValid, errors, ...record }) => record)
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      setImportResults({
        successful: result.successful || 0,
        failed: result.failed || 0,
        errors: result.errors || []
      })

      toast.success(`Successfully imported ${result.successful} talent records`)
      onImportComplete()

    } catch (error) {
      console.error('Import error:', error)
      toast.error(error instanceof Error ? error.message : 'Import failed')
      setImportResults({
        successful: 0,
        failed: validRecords.length,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      })
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = [
      {
        first_name: 'John',
        last_name: 'Doe',
        rep_name: 'Jane Smith',
        rep_email: 'jane.smith@agency.com',
        rep_phone: '(555) 123-4567',
        notes: 'Optional notes about the talent'
      }
    ]

    const csv = Papa.unparse(template)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'talent_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const validCount = talentRecords.filter(r => r.isValid).length
  const invalidCount = talentRecords.filter(r => !r.isValid).length

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open) resetState()
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Talent from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import talent records. Required fields will be automatically detected.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Upload CSV File</p>
                  <p className="text-sm text-muted-foreground">
                    Select a CSV file containing talent information
                  </p>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="mt-4 max-w-xs mx-auto"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Need a template?</h3>
                  <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Your CSV should include columns for: First Name, Last Name, Rep Name, Rep Email, Rep Phone, and optionally Notes. Field names are automatically detected and case-insensitive.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Preview Import Data</h3>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                    <CheckCircle className="h-3 w-3" />
                    {validCount} Valid
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {invalidCount} Invalid
                    </Badge>
                  )}
                </div>
              </div>

              {/* Show detected fields */}
              <div className="text-sm text-muted-foreground mb-4">
                <p className="font-medium mb-2">Detected Fields:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(fieldMapping).map(([field, csvColumn]) => (
                    <div key={field} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span className="capitalize">{field.replace('_', ' ')}: </span>
                      <code className="text-xs bg-muted px-1 rounded">{csvColumn}</code>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 min-h-0 border rounded-lg overflow-y-auto">
                <div className="p-4 space-y-3">
                  {talentRecords.map((record, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border transition-colors ${
                        record.isValid
                          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50'
                          : 'border-destructive/20 bg-destructive/5 dark:border-destructive/30 dark:bg-destructive/10'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {record.first_name} {record.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Rep: {record.rep_name} ({record.rep_email}, {record.rep_phone})
                          </p>
                          {record.notes && (
                            <p className="text-sm text-muted-foreground">Notes: {record.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Row {record.rowIndex}</span>
                          {record.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      </div>
                      {!record.isValid && record.errors.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {record.errors.map((error, errorIndex) => (
                            <p key={errorIndex} className="text-xs text-destructive">
                              • {error}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {invalidCount > 0 && (
                <Alert variant="destructive" className="mt-4 border-destructive/20 bg-destructive/5 dark:border-destructive/30 dark:bg-destructive/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-destructive">
                    {invalidCount} records have validation errors and will be skipped during import.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-lg font-medium">Importing talent records...</p>
              <p className="text-sm text-muted-foreground">Please wait while we process your data</p>
            </div>
          )}

          {importResults && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Import Complete</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-800 dark:text-green-300">Successful</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {importResults.successful}
                  </p>
                </div>
                
                {importResults.failed > 0 && (
                  <div className="p-4 border rounded-lg bg-destructive/5 border-destructive/20 dark:bg-destructive/10 dark:border-destructive/30">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      <span className="font-medium text-destructive">Failed</span>
                    </div>
                    <p className="text-2xl font-bold text-destructive mt-1">
                      {importResults.failed}
                    </p>
                  </div>
                )}
              </div>

              {importResults.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-destructive">Errors:</h4>
                  <div className="max-h-32 border rounded-lg bg-destructive/5 border-destructive/20 dark:bg-destructive/10 dark:border-destructive/30 overflow-y-auto">
                    <div className="p-3 space-y-1">
                      {importResults.errors.map((error, index) => (
                        <p key={index} className="text-sm text-destructive">
                          • {error}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {step === 'preview' && (
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {step === 'upload' && (
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
            )}
            {step === 'preview' && (
              <Button 
                onClick={handleImport} 
                disabled={validCount === 0 || isImporting}
              >
                Import {validCount} Records
              </Button>
            )}
            {importResults && (
              <Button onClick={() => setIsOpen(false)}>
                Close
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}