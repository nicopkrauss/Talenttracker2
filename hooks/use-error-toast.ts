"use client"

import { useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import { FormError } from "@/components/auth/form-error-display"

interface UseErrorToastOptions {
  showToast?: boolean
  toastDuration?: number
}

export function useErrorToast(
  error: FormError | null, 
  options: UseErrorToastOptions = {}
) {
  const { showToast = true, toastDuration = 5000 } = options

  useEffect(() => {
    if (!error || !showToast) return

    const getToastVariant = () => {
      switch (error.type) {
        case 'network':
          return 'default'
        case 'validation':
        case 'auth':
        case 'server':
        case 'unknown':
        default:
          return 'destructive'
      }
    }

    const getToastTitle = () => {
      switch (error.type) {
        case 'network':
          return 'Connection Error'
        case 'validation':
          return 'Validation Error'
        case 'auth':
          return 'Authentication Error'
        case 'server':
          return 'Server Error'
        case 'unknown':
        default:
          return 'Error'
      }
    }

    toast({
      variant: getToastVariant() as any,
      title: getToastTitle(),
      description: error.message,
      duration: toastDuration,
    })
  }, [error, showToast, toastDuration])
}

// Utility function for success messages
export function useSuccessToast() {
  const showSuccess = (message: string, title: string = 'Success') => {
    toast({
      title,
      description: message,
      duration: 3000,
    })
  }

  return { showSuccess }
}