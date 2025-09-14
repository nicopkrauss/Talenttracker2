"use client"

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, FileText, Image, File } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Progress } from '@/components/ui/progress'

interface FileUploadProps {
  projectId: string
  onUploadComplete: () => void
  disabled?: boolean
}

interface UploadingFile {
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

export function FileUpload({ projectId, onUploadComplete, disabled = false }: FileUploadProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]

  const maxSize = 10 * 1024 * 1024 // 10MB

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4" />
    }
    if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return 'File type not allowed. Please upload images, PDFs, or documents.'
    }
    if (file.size > maxSize) {
      return 'File too large. Maximum size is 10MB.'
    }
    return null
  }

  const uploadFile = async (file: File) => {
    const uploadingFile: UploadingFile = {
      file,
      progress: 0,
      status: 'uploading'
    }

    setUploadingFiles(prev => [...prev, uploadingFile])

    try {
      const formData = new FormData()
      formData.append('file', file)

      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadingFiles(prev => 
            prev.map(f => 
              f.file === file ? { ...f, progress } : f
            )
          )
        }
      })

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          setUploadingFiles(prev => 
            prev.map(f => 
              f.file === file ? { ...f, status: 'success', progress: 100 } : f
            )
          )
          
          toast({
            title: "Success",
            description: `${file.name} uploaded successfully`,
          })

          // Remove from uploading list after a delay
          setTimeout(() => {
            setUploadingFiles(prev => prev.filter(f => f.file !== file))
            onUploadComplete()
          }, 2000)
        } else {
          const errorData = JSON.parse(xhr.responseText)
          throw new Error(errorData.error || 'Upload failed')
        }
      })

      // Handle errors
      xhr.addEventListener('error', () => {
        throw new Error('Network error during upload')
      })

      // Start upload
      xhr.open('POST', `/api/projects/${projectId}/upload`)
      xhr.send(formData)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file === file ? { ...f, status: 'error', error: errorMessage } : f
        )
      )

      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      })

      // Remove from uploading list after a delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.file !== file))
      }, 5000)
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    Array.from(files).forEach(file => {
      const error = validateFile(file)
      if (error) {
        toast({
          title: "Invalid File",
          description: error,
          variant: "destructive",
        })
        return
      }

      uploadFile(file)
    })
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file))
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!disabled ? handleButtonClick : undefined}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">
          {disabled 
            ? 'File upload is disabled'
            : 'Drag and drop files here, or click to select files'
          }
        </p>
        <p className="text-xs text-muted-foreground">
          Supports: Images, PDFs, Documents (Max 10MB)
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Upload Button */}
      <Button 
        onClick={handleButtonClick} 
        disabled={disabled}
        variant="outline" 
        className="w-full gap-2"
      >
        <Upload className="h-4 w-4" />
        Choose Files
      </Button>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploading Files</h4>
          {uploadingFiles.map((uploadingFile, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
              {getFileIcon(uploadingFile.file.type)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">
                    {uploadingFile.file.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUploadingFile(uploadingFile.file)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground mb-2">
                  {formatFileSize(uploadingFile.file.size)}
                </div>

                {uploadingFile.status === 'uploading' && (
                  <div className="space-y-1">
                    <Progress value={uploadingFile.progress} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {uploadingFile.progress}% uploaded
                    </div>
                  </div>
                )}

                {uploadingFile.status === 'success' && (
                  <div className="text-xs text-green-600">
                    ✓ Upload complete
                  </div>
                )}

                {uploadingFile.status === 'error' && (
                  <div className="text-xs text-red-600">
                    ✗ {uploadingFile.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}