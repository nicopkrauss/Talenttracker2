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

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import { Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

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
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload')

  const [talentRecords, setTalentRecords] = useState<TalentRecord[]>([])
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [isImporting, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState<{
    created: number
    updated: number
    skipped: number
    failed: number
    errors: string[]
    skippedNames?: string[]
    updatedNames?: string[]
  } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = () => {
    setStep('upload')
    setTalentRecords([])
    setFieldMapping({})
    setIsImporting(false)
    setImportResults(null)
    setIsDragOver(false)
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

  const processData = (data: CSVRow[]) => {
    const headers = Object.keys(data[0] || {})

    if (headers.length === 0 || data.length === 0) {
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
      return
    }

    // Process and validate records
    const records: TalentRecord[] = data.map((row, index) => {
      const record: TalentRecord = {
        first_name: String(row[mapping.first_name] || '').trim(),
        last_name: String(row[mapping.last_name] || '').trim(),
        rep_name: String(row[mapping.rep_name] || '').trim(),
        rep_email: String(row[mapping.rep_email] || '').trim(),
        rep_phone: String(row[mapping.rep_phone] || '').trim(),
        notes: mapping.notes ? String(row[mapping.notes] || '').trim() : '',
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
  }

  const processFile = (file: File) => {
    const fileName = file.name.toLowerCase()
    
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx')) {
      return
    }

    if (fileName.endsWith('.csv')) {
      // Handle CSV files
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            return
          }
          processData(results.data as CSVRow[])
        },
        error: (error) => {
          console.error('CSV parsing error:', error)
        }
      })
    } else if (fileName.endsWith('.xlsx')) {
      // Handle Excel files
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          
          // Get the first worksheet
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          
          // Convert to JSON with header row
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          if (jsonData.length < 2) {
            return
          }
          
          // Convert to object format with headers
          const headers = jsonData[0] as string[]
          const rows = jsonData.slice(1) as any[][]
          
          const processedData: CSVRow[] = rows
            .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
            .map(row => {
              const obj: CSVRow = {}
              headers.forEach((header, index) => {
                obj[header] = String(row[index] || '').trim()
              })
              return obj
            })
          
          processData(processedData)
        } catch (error) {
          console.error('Excel parsing error:', error)
        }
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    processFile(file)
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(event.dataTransfer.files)
    const supportedFile = files.find(file => {
      const name = file.name.toLowerCase()
      return name.endsWith('.csv') || name.endsWith('.xlsx')
    })
    
    if (supportedFile) {
      processFile(supportedFile)
    }
  }

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click()
  }

  const handleImport = async () => {
    const validRecords = talentRecords.filter(r => r.isValid)
    
    if (validRecords.length === 0) {
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
        created: result.created || 0,
        updated: result.updated || 0,
        skipped: result.skipped || 0,
        failed: result.failed || 0,
        errors: result.errors || [],
        skippedNames: result.skippedNames || [],
        updatedNames: result.updatedNames || []
      })

      onImportComplete()

    } catch (error) {
      console.error('Import error:', error)
      setImportResults({
        created: 0,
        updated: 0,
        skipped: 0,
        failed: validRecords.length,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        updatedNames: []
      })
    } finally {
      setIsImporting(false)
      setStep('complete')
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
            Import Talent from CSV/Excel
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel (.xlsx) file to bulk import talent records. Required fields will be automatically detected.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {step === 'upload' && (
            <div className="space-y-6">
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:bg-muted/50 ${
                  isDragOver 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleUploadAreaClick}
              >
                <Upload className={`h-12 w-12 mx-auto mb-4 ${
                  isDragOver ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    {isDragOver ? 'Drop your file here' : 'Click to upload or drag & drop'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    CSV or Excel (.xlsx) file containing talent information
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
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
                    Your CSV or Excel file should include columns for: First Name, Last Name, Rep Name, Rep Email, Rep Phone, and optionally Notes. Field names are automatically detected and case-insensitive.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
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
              <div className="text-sm text-muted-foreground">
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

              {/* Scrollable records area with fixed height */}
              <div 
                className="border rounded-lg overflow-y-auto bg-background"
                style={{ height: '300px' }}
              >
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
                <Alert variant="destructive" className="border-destructive/20 bg-destructive/5 dark:border-destructive/30 dark:bg-destructive/10">
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

          {step === 'complete' && importResults && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Import Complete</h3>
              
              {/* Show detailed breakdown if there are multiple categories or failures */}
              {importResults.failed > 0 || importResults.created + importResults.updated + importResults.skipped > 1 ? (
                <div className={`grid gap-4 ${
                  // Calculate grid columns based on how many categories have data
                  (() => {
                    const activeCategories = [
                      importResults.created > 0,
                      importResults.updated > 0, 
                      importResults.skipped > 0,
                      importResults.failed > 0
                    ].filter(Boolean).length
                    
                    if (activeCategories === 1) return 'grid-cols-1'
                    if (activeCategories === 2) return 'grid-cols-2'
                    if (activeCategories === 3) return 'grid-cols-3'
                    return 'grid-cols-2 md:grid-cols-4'
                  })()
                }`}>
                  {importResults.created > 0 && (
                    <div className="p-4 border rounded-lg bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="font-medium text-green-800 dark:text-green-300">Created</span>
                      </div>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {importResults.created}
                      </p>
                    </div>
                  )}
                  
                  {importResults.updated > 0 && (
                    <div className="p-4 border rounded-lg bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium text-blue-800 dark:text-blue-300">Updated</span>
                      </div>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {importResults.updated}
                      </p>
                    </div>
                  )}
                  
                  {importResults.skipped > 0 && (
                    <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200 dark:bg-yellow-950/50 dark:border-yellow-800 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        <span className="font-medium text-yellow-800 dark:text-yellow-300">Skipped</span>
                      </div>
                      <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {importResults.skipped}
                      </p>
                    </div>
                  )}
                  
                  {importResults.failed > 0 && (
                    <div className="p-4 border rounded-lg bg-destructive/5 border-destructive/20 dark:bg-destructive/10 dark:border-destructive/30 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <span className="font-medium text-destructive">Failed</span>
                      </div>
                      <p className="text-3xl font-bold text-destructive">
                        {importResults.failed}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-green-800 dark:text-green-300">
                      {importResults.created > 0 && `Created ${importResults.created} new talent records`}
                      {importResults.updated > 0 && `Updated ${importResults.updated} existing talent records`}
                      {importResults.skipped > 0 && `Skipped ${importResults.skipped} duplicate records`}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Show updated names if any */}
              {importResults.updated > 0 && importResults.updatedNames && importResults.updatedNames.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300">Updated (existing records with new information):</h4>
                  <div className="border rounded-lg bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800">
                    <div className="p-3 space-y-1">
                      {importResults.updatedNames.map((name, index) => (
                        <p key={index} className="text-sm text-blue-800 dark:text-blue-300">
                          • {name}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Show skipped names if any */}
              {importResults.skipped > 0 && importResults.skippedNames && importResults.skippedNames.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-300">Skipped (already exists with same information):</h4>
                  <div className="border rounded-lg bg-yellow-50 border-yellow-200 dark:bg-yellow-950/50 dark:border-yellow-800">
                    <div className="p-3 space-y-1">
                      {importResults.skippedNames.map((name, index) => (
                        <p key={index} className="text-sm text-yellow-800 dark:text-yellow-300">
                          • {name}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {importResults.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-destructive">Errors:</h4>
                  <div className="border rounded-lg bg-destructive/5 border-destructive/20 dark:bg-destructive/10 dark:border-destructive/30">
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
              <Button variant="outline" onClick={() => {
                resetState()
                setIsOpen(false)
              }}>
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
            {step === 'complete' && (
              <Button onClick={() => {
                resetState()
                setIsOpen(false)
              }}>
                Close
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}