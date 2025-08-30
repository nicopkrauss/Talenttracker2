"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { loginSchema, type LoginInput } from "@/lib/types"
import { FormErrorDisplay, type FormError, parseAuthError } from "./form-error-display"
import { cn } from "@/lib/utils"

interface LoginFormProps {
  onSubmit: (data: LoginInput) => Promise<void>
  isLoading?: boolean
  error?: string | Error | FormError | null
}

export function LoginForm({ onSubmit, isLoading = false, error }: LoginFormProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [formError, setFormError] = React.useState<FormError | null>(null)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onSubmit", // Only validate on form submission
  })

  // Parse and set form error when error prop changes
  React.useEffect(() => {
    if (error) {
      if (typeof error === 'string') {
        setFormError(parseAuthError({ message: error }))
      } else if (error instanceof Error) {
        setFormError(parseAuthError(error))
      } else {
        // Already a FormError
        setFormError(error)
      }
    } else {
      setFormError(null)
    }
  }, [error])

  const handleSubmit = async (data: LoginInput) => {
    try {
      setFormError(null)
      await onSubmit(data)
    } catch (error) {
      const parsedError = parseAuthError(error)
      setFormError(parsedError)
      console.error("Login form submission error:", error)
    }
  }

  const handleRetry = React.useCallback(() => {
    setFormError(null)
    // Re-submit the form if it's valid
    if (form.formState.isValid) {
      form.handleSubmit(handleSubmit)()
    }
  }, [form])

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h1 className={cn(
          "text-2xl font-bold tracking-tight text-foreground",
          "sm:text-3xl",
          "transition-all duration-200 ease-in-out"
        )}>
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Enter your credentials to access Talent Tracker
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Display form error with enhanced styling */}
          <FormErrorDisplay 
            error={formError} 
            onRetry={formError?.retryable ? handleRetry : undefined}
            className="animate-in slide-in-from-top-2 duration-300"
          />

          {/* Email Field with enhanced styling */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-semibold text-foreground">
                  Email Address
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="john.doe@example.com"
                    disabled={isLoading}
                    className={cn(
                      "h-12 sm:h-11 transition-all duration-200 ease-in-out",
                      "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "text-base sm:text-sm", // Prevent zoom on iOS
                      isLoading && "animate-pulse"
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs animate-in slide-in-from-left-2 duration-200" />
              </FormItem>
            )}
          />

          {/* Password Field with enhanced styling */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-semibold text-foreground">
                  Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      disabled={isLoading}
                      className={cn(
                        "h-12 sm:h-11 pr-12 transition-all duration-200 ease-in-out",
                        "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "text-base sm:text-sm", // Prevent zoom on iOS
                        isLoading && "animate-pulse"
                      )}
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "absolute right-0 top-0 h-12 sm:h-11 px-3",
                        "hover:bg-transparent hover:text-primary",
                        "transition-colors duration-200 ease-in-out",
                        "disabled:opacity-50",
                        "min-w-[44px]" // Minimum touch target size
                      )}
                      onClick={togglePasswordVisibility}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {showPassword ? "Hide password" : "Show password"}
                      </span>
                    </Button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs animate-in slide-in-from-left-2 duration-200" />
              </FormItem>
            )}
          />

          {/* Submit Button with enhanced styling */}
          <Button
            type="submit"
            className={cn(
              "w-full h-12 sm:h-11 font-semibold",
              "transition-all duration-200 ease-in-out",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "min-h-[44px]" // Minimum touch target size
            )}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </Form>

      {/* Registration Link with enhanced styling */}
      <div className="text-center text-sm pt-2">
        <span className="text-muted-foreground">Don't have an account? </span>
        <Link
          href="/register"
          className={cn(
            "text-primary font-semibold underline-offset-4",
            "hover:underline hover:text-primary/80",
            "transition-colors duration-200 ease-in-out",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:rounded-sm"
          )}
        >
          Create account
        </Link>
      </div>
    </div>
  )
}