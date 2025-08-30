"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { registrationSchema, type RegistrationInput } from "@/lib/types"
import { PasswordStrengthIndicator } from "./password-strength-indicator"
import { FormErrorDisplay, type FormError, parseAuthError } from "./form-error-display"
import { cn } from "@/lib/utils"

interface RegistrationFormProps {
  onSubmit: (data: RegistrationInput) => Promise<void>
  isLoading?: boolean
  error?: string | Error | FormError | null
}

export function RegistrationForm({ 
  onSubmit, 
  isLoading = false, 
  error 
}: RegistrationFormProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [formError, setFormError] = React.useState<FormError | null>(null)

  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      city: "",
      state: "",
      agreeToTerms: false,
    },
    mode: "onSubmit", // Only validate on form submission
  })

  // Watch password for strength indicator
  const password = form.watch("password")

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

  const handleSubmit = async (data: RegistrationInput) => {
    try {
      setFormError(null)
      await onSubmit(data)
    } catch (error) {
      const parsedError = parseAuthError(error)
      setFormError(parsedError)
      console.error("Registration form submission error:", error)
    }
  }

  const handleRetry = React.useCallback(() => {
    setFormError(null)
    // Re-submit the form
    form.handleSubmit(handleSubmit)()
  }, [form, handleSubmit])

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className={cn(
          "text-2xl font-bold tracking-tight text-foreground",
          "sm:text-3xl",
          "transition-all duration-200 ease-in-out"
        )}>
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Enter your information to get started with Talent Tracker
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Display form error with enhanced styling */}
          <FormErrorDisplay 
            error={formError} 
            onRetry={formError?.retryable ? handleRetry : undefined}
            className="animate-in slide-in-from-top-2 duration-300"
          />
          {/* Name Fields with enhanced styling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-semibold text-foreground">
                    First Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John"
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
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-semibold text-foreground">
                    Last Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Doe"
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
          </div>

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
                {/* Password strength indicator with enhanced styling */}
                <PasswordStrengthIndicator 
                  password={password} 
                  className="mt-3 animate-in slide-in-from-bottom-2 duration-300"
                />
              </FormItem>
            )}
          />

          {/* Phone Field with enhanced styling */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-semibold text-foreground">
                  Phone Number
                </FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
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

          {/* Location Fields with enhanced styling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-semibold text-foreground">
                    City
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="New York"
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
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-semibold text-foreground">
                    State
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="NY"
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
          </div>

          {/* Terms and Conditions */}
          <FormField
            control={form.control}
            name="agreeToTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-xs font-normal leading-tight">
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      className="text-primary underline-offset-4 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      className="text-primary underline-offset-4 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy Policy
                    </Link>
                  </FormLabel>
                  <FormMessage />
                </div>
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
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </Form>

      {/* Login Link with enhanced styling */}
      <div className="text-center text-sm pt-1">
        <span className="text-muted-foreground">Already have an account? </span>
        <Link
          href="/login"
          className={cn(
            "text-primary font-semibold underline-offset-4",
            "hover:underline hover:text-primary/80",
            "transition-colors duration-200 ease-in-out",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:rounded-sm"
          )}
        >
          Sign in
        </Link>
      </div>
    </div>
  )
}