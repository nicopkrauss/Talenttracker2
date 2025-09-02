"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { 
  registrationSchema, 
  type RegistrationInput, 
  REGISTRATION_ROLE_LABELS,
  MAJOR_CITIES
} from "@/lib/types"
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
  const [currentStep, setCurrentStep] = React.useState<'role-selection' | 'form'>('role-selection')

  const form = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      role: undefined,
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      nearestMajorCity: undefined,
      willingToFly: undefined,
      agreeToTerms: false,
    },
    mode: "onSubmit", // Only validate on form submission
  })

  // Watch password for strength indicator and role for conditional fields
  const password = form.watch("password")
  const selectedRole = form.watch("role")
  
  // Determine if flight willingness should be shown (covered roles only)
  const showFlightWillingness = selectedRole && ['in_house', 'supervisor', 'talent_logistics_coordinator'].includes(selectedRole)

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

  const handleRoleSelect = (role: string) => {
    form.setValue('role', role as any)
    setCurrentStep('form')
  }

  const handleBackToRoleSelection = () => {
    setCurrentStep('role-selection')
  }

  // Role Selection Step
  if (currentStep === 'role-selection') {
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
            What position have you been hired for?
          </p>
        </div>

        <div className="space-y-3">
          {/* Talent Escort - First */}
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full h-12 justify-center text-center font-medium",
              "transition-all duration-200 ease-in-out",
              "hover:!bg-primary hover:!text-primary-foreground hover:!border-primary",
              "focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            onClick={() => handleRoleSelect('talent_escort')}
            disabled={isLoading}
          >
            {REGISTRATION_ROLE_LABELS.talent_escort}
          </Button>
          
          {/* Talent Logistics Coordinator - Second */}
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full h-12 justify-center text-center font-medium",
              "transition-all duration-200 ease-in-out",
              "hover:!bg-primary hover:!text-primary-foreground hover:!border-primary",
              "focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            onClick={() => handleRoleSelect('talent_logistics_coordinator')}
            disabled={isLoading}
          >
            {REGISTRATION_ROLE_LABELS.talent_logistics_coordinator}
          </Button>
          
          {/* Supervisor - Third */}
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full h-12 justify-center text-center font-medium",
              "transition-all duration-200 ease-in-out",
              "hover:!bg-primary hover:!text-primary-foreground hover:!border-primary",
              "focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            onClick={() => handleRoleSelect('supervisor')}
            disabled={isLoading}
          >
            {REGISTRATION_ROLE_LABELS.supervisor}
          </Button>
          
          {/* In-House - Fourth */}
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full h-12 justify-center text-center font-medium",
              "transition-all duration-200 ease-in-out",
              "hover:!bg-primary hover:!text-primary-foreground hover:!border-primary",
              "focus:ring-2 focus:ring-primary/20 focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            onClick={() => handleRoleSelect('in_house')}
            disabled={isLoading}
          >
            {REGISTRATION_ROLE_LABELS.in_house}
          </Button>
        </div>

        {/* Login Link */}
        <div className="text-center text-sm pt-4">
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

  // Form Step
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {/* Back Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "mb-2 p-2 h-auto text-muted-foreground hover:text-foreground",
            "transition-colors duration-200 ease-in-out"
          )}
          onClick={handleBackToRoleSelection}
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to role selection
        </Button>
        
        <div className="text-center">
          <h1 className={cn(
            "text-2xl font-bold tracking-tight text-foreground",
            "sm:text-3xl",
            "transition-all duration-200 ease-in-out"
          )}>
            Complete your registration
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Registering as: <span className="font-semibold text-foreground">
              {selectedRole ? REGISTRATION_ROLE_LABELS[selectedRole as keyof typeof REGISTRATION_ROLE_LABELS] : ''}
            </span>
          </p>
        </div>
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

          {/* Nearest Major City Field */}
          <FormField
            control={form.control}
            name="nearestMajorCity"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-semibold text-foreground">
                  Nearest Major City
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger className={cn(
                      "h-12 sm:h-11 transition-all duration-200 ease-in-out",
                      "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "text-base sm:text-sm", // Prevent zoom on iOS
                      isLoading && "animate-pulse"
                    )}>
                      <SelectValue placeholder="Select your nearest major city" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MAJOR_CITIES.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs animate-in slide-in-from-left-2 duration-200" />
              </FormItem>
            )}
          />

          {/* Flight Willingness - Only for covered roles */}
          {showFlightWillingness && (
            <FormField
              control={form.control}
              name="willingToFly"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-semibold text-foreground">
                      I am willing to fly for projects (flights covered)
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Check this if you're available for projects that require air travel
                    </p>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          )}



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