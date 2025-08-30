"use client"

import { useState, useEffect, useCallback } from "react"
import { z } from "zod"
// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null
  
  const debounced = ((...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T & { cancel: () => void }
  
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }
  
  return debounced
}

interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
  fieldErrors: Record<string, string[]>
}

interface UseFormValidationOptions {
  debounceMs?: number
  validateOnChange?: boolean
  validateOnBlur?: boolean
}

export function useFormValidation<T extends z.ZodSchema>(
  schema: T,
  options: UseFormValidationOptions = {}
) {
  const {
    debounceMs = 300,
    validateOnChange = true,
    validateOnBlur = true
  } = options

  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: false,
    errors: {},
    fieldErrors: {}
  })

  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())

  // Debounced validation function
  const debouncedValidate = useCallback(
    debounce((data: any) => {
      try {
        schema.parse(data)
        setValidationResult({
          isValid: true,
          errors: {},
          fieldErrors: {}
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors: Record<string, string> = {}
          const fieldErrors: Record<string, string[]> = {}

          error.errors.forEach((err) => {
            const path = err.path.join('.')
            if (!fieldErrors[path]) {
              fieldErrors[path] = []
            }
            fieldErrors[path].push(err.message)
            
            // Use the first error as the main error for the field
            if (!errors[path]) {
              errors[path] = err.message
            }
          })

          setValidationResult({
            isValid: false,
            errors,
            fieldErrors
          })
        }
      }
    }, debounceMs),
    [schema, debounceMs]
  )

  // Validate function for immediate validation (e.g., on blur)
  const validateImmediate = useCallback((data: any) => {
    try {
      schema.parse(data)
      setValidationResult({
        isValid: true,
        errors: {},
        fieldErrors: {}
      })
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        const fieldErrors: Record<string, string[]> = {}

        error.errors.forEach((err) => {
          const path = err.path.join('.')
          if (!fieldErrors[path]) {
            fieldErrors[path] = []
          }
          fieldErrors[path].push(err.message)
          
          if (!errors[path]) {
            errors[path] = err.message
          }
        })

        setValidationResult({
          isValid: false,
          errors,
          fieldErrors
        })
      }
      return false
    }
  }, [schema])

  // Validate a single field
  const validateField = useCallback((fieldName: string, value: any, allData: any) => {
    try {
      // Create a partial schema for just this field - simplified approach
      const fieldData = { [fieldName]: value }
      schema.parse(fieldData)
      
      // Remove error for this field if validation passes
      setValidationResult(prev => {
        const newErrors = { ...prev.errors }
        const newFieldErrors = { ...prev.fieldErrors }
        delete newErrors[fieldName]
        delete newFieldErrors[fieldName]
        
        return {
          ...prev,
          errors: newErrors,
          fieldErrors: newFieldErrors,
          isValid: Object.keys(newErrors).length === 0
        }
      })
      
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find(err => err.path[0] === fieldName)
        if (fieldError) {
          setValidationResult(prev => ({
            ...prev,
            errors: {
              ...prev.errors,
              [fieldName]: fieldError.message
            },
            fieldErrors: {
              ...prev.fieldErrors,
              [fieldName]: [fieldError.message]
            },
            isValid: false
          }))
        }
      }
      return false
    }
  }, [schema])

  // Mark field as touched
  const touchField = useCallback((fieldName: string) => {
    setTouchedFields(prev => new Set([...prev, fieldName]))
  }, [])

  // Check if field should show error (only if touched)
  const shouldShowFieldError = useCallback((fieldName: string) => {
    return touchedFields.has(fieldName) && validationResult.errors[fieldName]
  }, [touchedFields, validationResult.errors])

  // Get error message for a field (only if touched)
  const getFieldError = useCallback((fieldName: string) => {
    return shouldShowFieldError(fieldName) ? validationResult.errors[fieldName] : undefined
  }, [shouldShowFieldError, validationResult.errors])

  // Reset validation state
  const resetValidation = useCallback(() => {
    setValidationResult({
      isValid: false,
      errors: {},
      fieldErrors: {}
    })
    setTouchedFields(new Set())
  }, [])

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedValidate.cancel()
    }
  }, [debouncedValidate])

  return {
    validationResult,
    touchedFields,
    validateImmediate,
    validateField,
    touchField,
    shouldShowFieldError,
    getFieldError,
    resetValidation,
    debouncedValidate: validateOnChange ? debouncedValidate : () => {},
  }
}