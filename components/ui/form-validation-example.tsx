"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from "lucide-react"

import { Button } from "./button"
import { Input } from "./input"
import { Textarea } from "./textarea"
import { Checkbox } from "./checkbox"
import { RadioGroup, RadioGroupItem } from "./radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "./form"
import { Alert, AlertDescription } from "./alert"
import { Badge } from "./badge"
import { cn } from "@/lib/utils"

// Validation schema with comprehensive rules
const formSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: z.string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  bio: z.string()
    .min(10, "Bio must be at least 10 characters")
    .max(500, "Bio must be less than 500 characters"),
  role: z.string().min(1, "Please select a role"),
  notifications: z.boolean(),
  terms: z.boolean().refine(val => val === true, "You must accept the terms"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type FormData = z.infer<typeof formSchema>

interface FormValidationExampleProps {
  onSubmit?: (data: FormData) => void
  className?: string
}

export function FormValidationExample({ 
  onSubmit,
  className 
}: FormValidationExampleProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      bio: "",
      role: "",
      notifications: false,
      terms: false,
    },
    mode: "onChange", // Real-time validation
  })

  const handleSubmit = async (data: FormData) => {
    setSubmitStatus('loading')
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (onSubmit) {
        onSubmit(data)
      }
      
      setSubmitStatus('success')
      
      // Reset form after success
      setTimeout(() => {
        form.reset()
        setSubmitStatus('idle')
      }, 2000)
    } catch (error) {
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus('idle'), 3000)
    }
  }

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    
    if (score < 2) return { level: 'weak', color: 'red' }
    if (score < 4) return { level: 'medium', color: 'amber' }
    return { level: 'strong', color: 'green' }
  }

  const password = form.watch("password")
  const passwordStrength = getPasswordStrength(password)

  return (
    <div className={cn("max-w-2xl mx-auto p-6", className)}>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Form Validation Example
          </h2>
          <p className="text-muted-foreground">
            Demonstrates theme-aware form validation with interactive states
          </p>
        </div>

        {/* Status Alert */}
        {submitStatus === 'success' && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-300">
              Form submitted successfully! All validation passed.
            </AlertDescription>
          </Alert>
        )}

        {submitStatus === 'error' && (
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-300">
              Something went wrong. Please try again.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className={cn(
                    "text-sm font-semibold transition-colors duration-200",
                    fieldState.error ? "text-destructive" : "text-foreground"
                  )}>
                    Full Name *
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Enter your full name"
                        className={cn(
                          "transition-all duration-200 ease-in-out",
                          "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                          fieldState.error && [
                            "border-destructive",
                            "focus:border-destructive",
                            "focus:ring-destructive/20",
                            "dark:focus:ring-destructive/40"
                          ]
                        )}
                        {...field}
                      />
                      {!fieldState.error && field.value && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage className="animate-in slide-in-from-left-2 duration-200" />
                </FormItem>
              )}
            />

            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className={cn(
                    "text-sm font-semibold transition-colors duration-200",
                    fieldState.error ? "text-destructive" : "text-foreground"
                  )}>
                    Email Address *
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        className={cn(
                          "transition-all duration-200 ease-in-out",
                          "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                          fieldState.error && [
                            "border-destructive",
                            "focus:border-destructive",
                            "focus:ring-destructive/20",
                            "dark:focus:ring-destructive/40"
                          ]
                        )}
                        {...field}
                      />
                      {!fieldState.error && field.value && z.string().email().safeParse(field.value).success && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage className="animate-in slide-in-from-left-2 duration-200" />
                </FormItem>
              )}
            />

            {/* Password Field with Strength Indicator */}
            <FormField
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className={cn(
                    "text-sm font-semibold transition-colors duration-200",
                    fieldState.error ? "text-destructive" : "text-foreground"
                  )}>
                    Password *
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className={cn(
                          "pr-10 transition-all duration-200 ease-in-out",
                          "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                          fieldState.error && [
                            "border-destructive",
                            "focus:border-destructive",
                            "focus:ring-destructive/20",
                            "dark:focus:ring-destructive/40"
                          ]
                        )}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-9 px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  
                  {/* Password Strength Indicator */}
                  {field.value && (
                    <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-300 ease-in-out",
                              passwordStrength.color === 'red' && "bg-red-500 dark:bg-red-600 w-1/3",
                              passwordStrength.color === 'amber' && "bg-amber-500 dark:bg-amber-600 w-2/3",
                              passwordStrength.color === 'green' && "bg-green-500 dark:bg-green-600 w-full"
                            )}
                          />
                        </div>
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-xs transition-colors duration-200",
                            passwordStrength.color === 'red' && "border-red-200 text-red-700 dark:border-red-800 dark:text-red-300",
                            passwordStrength.color === 'amber' && "border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-300",
                            passwordStrength.color === 'green' && "border-green-200 text-green-700 dark:border-green-800 dark:text-green-300"
                          )}
                        >
                          {passwordStrength.level}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  <FormMessage className="animate-in slide-in-from-left-2 duration-200" />
                </FormItem>
              )}
            />

            {/* Confirm Password Field */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className={cn(
                    "text-sm font-semibold transition-colors duration-200",
                    fieldState.error ? "text-destructive" : "text-foreground"
                  )}>
                    Confirm Password *
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        className={cn(
                          "pr-10 transition-all duration-200 ease-in-out",
                          "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                          fieldState.error && [
                            "border-destructive",
                            "focus:border-destructive",
                            "focus:ring-destructive/20",
                            "dark:focus:ring-destructive/40"
                          ]
                        )}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-9 px-3 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage className="animate-in slide-in-from-left-2 duration-200" />
                </FormItem>
              )}
            />

            {/* Bio Textarea */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className={cn(
                    "text-sm font-semibold transition-colors duration-200",
                    fieldState.error ? "text-destructive" : "text-foreground"
                  )}>
                    Bio *
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about yourself..."
                      className={cn(
                        "min-h-20 transition-all duration-200 ease-in-out",
                        "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        fieldState.error && [
                          "border-destructive",
                          "focus:border-destructive",
                          "focus:ring-destructive/20",
                          "dark:focus:ring-destructive/40"
                        ]
                      )}
                      {...field}
                    />
                  </FormControl>
                  <div className="flex justify-between items-center">
                    <FormMessage className="animate-in slide-in-from-left-2 duration-200" />
                    <span className={cn(
                      "text-xs transition-colors duration-200",
                      field.value?.length > 450 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                    )}>
                      {field.value?.length || 0}/500
                    </span>
                  </div>
                </FormItem>
              )}
            />

            {/* Role Select */}
            <FormField
              control={form.control}
              name="role"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className={cn(
                    "text-sm font-semibold transition-colors duration-200",
                    fieldState.error ? "text-destructive" : "text-foreground"
                  )}>
                    Role *
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className={cn(
                        "transition-all duration-200 ease-in-out",
                        "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        fieldState.error && [
                          "border-destructive",
                          "focus:border-destructive",
                          "focus:ring-destructive/20",
                          "dark:focus:ring-destructive/40"
                        ]
                      )}>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="escort">Talent Escort</SelectItem>
                      <SelectItem value="tlc">Talent Logistics Coordinator</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="animate-in slide-in-from-left-2 duration-200" />
                </FormItem>
              )}
            />

            {/* Notifications Checkbox */}
            <FormField
              control={form.control}
              name="notifications"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="transition-all duration-200 ease-in-out"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      Email Notifications
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Receive email notifications about important updates
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Terms Checkbox */}
            <FormField
              control={form.control}
              name="terms"
              render={({ field, fieldState }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className={cn(
                        "transition-all duration-200 ease-in-out",
                        fieldState.error && [
                          "border-destructive",
                          "focus-visible:border-destructive",
                          "focus-visible:ring-destructive/20",
                          "dark:focus-visible:ring-destructive/40"
                        ]
                      )}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className={cn(
                      "text-sm font-medium transition-colors duration-200",
                      fieldState.error ? "text-destructive" : "text-foreground"
                    )}>
                      Accept Terms and Conditions *
                    </FormLabel>
                    <FormDescription className="text-xs">
                      You must accept our terms and conditions to continue
                    </FormDescription>
                    <FormMessage className="animate-in slide-in-from-left-2 duration-200" />
                  </div>
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className={cn(
                "w-full transition-all duration-200 ease-in-out",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                submitStatus === 'loading' && "animate-pulse"
              )}
              disabled={submitStatus === 'loading'}
            >
              {submitStatus === 'loading' ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "Submit Form"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}