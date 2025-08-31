import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button'
import { Input } from '../input'
import { Textarea } from '../textarea'
import { Checkbox } from '../checkbox'
import { RadioGroup, RadioGroupItem } from '../radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../form'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

// Test schema for form validation
const testSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  email: z.string().email('Invalid email'),
  textarea: z.string().min(1, 'Textarea is required'),
  checkbox: z.boolean().refine(val => val === true, 'Checkbox must be checked'),
  radio: z.string().min(1, 'Radio selection required'),
  select: z.string().min(1, 'Select option required'),
})

type TestFormData = z.infer<typeof testSchema>

// Test form component
function TestForm() {
  const form = useForm<TestFormData>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      text: '',
      email: '',
      textarea: '',
      checkbox: false,
      radio: '',
      select: '',
    },
  })

  const onSubmit = (data: TestFormData) => {
    console.log(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Text Input</FormLabel>
              <FormControl>
                <Input placeholder="Enter text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Input</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="textarea"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Textarea</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="checkbox"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Accept terms</FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="radio"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Radio Group</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option1" id="option1" />
                    <label htmlFor="option1">Option 1</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="option2" id="option2" />
                    <label htmlFor="option2">Option 2</label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="select"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}

describe('Form Components Theme Integration', () => {
  describe('Button Component', () => {
    it('should have proper theme-aware styling for all variants', () => {
      const { rerender } = render(<Button>Default</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground')
      
      // Test destructive variant
      rerender(<Button variant="destructive">Destructive</Button>)
      expect(button).toHaveClass('bg-destructive', 'text-white')
      
      // Test outline variant
      rerender(<Button variant="outline">Outline</Button>)
      expect(button).toHaveClass('bg-background', 'hover:bg-accent')
      
      // Test secondary variant
      rerender(<Button variant="secondary">Secondary</Button>)
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground')
      
      // Test ghost variant
      rerender(<Button variant="ghost">Ghost</Button>)
      expect(button).toHaveClass('hover:bg-accent', 'hover:text-accent-foreground')
    })

    it('should have proper focus states', async () => {
      const user = userEvent.setup()
      render(<Button>Focus Test</Button>)
      
      const button = screen.getByRole('button')
      await user.tab()
      
      expect(button).toHaveClass('focus-visible:ring-ring/50')
    })

    it('should have proper disabled states', () => {
      render(<Button disabled>Disabled</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('disabled:opacity-50')
      expect(button).toBeDisabled()
    })
  })

  describe('Input Component', () => {
    it('should have proper theme-aware styling', () => {
      render(<Input placeholder="Test input" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass(
        'border-input',
        'bg-transparent',
        'placeholder:text-muted-foreground'
      )
    })

    it('should have proper focus states', async () => {
      const user = userEvent.setup()
      render(<Input placeholder="Focus test" />)
      
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      expect(input).toHaveClass(
        'focus-visible:border-ring',
        'focus-visible:ring-ring/50'
      )
    })

    it('should have proper error states', () => {
      render(<Input aria-invalid="true" placeholder="Error test" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass(
        'aria-invalid:border-destructive',
        'aria-invalid:ring-destructive/20'
      )
    })
  })

  describe('Textarea Component', () => {
    it('should have proper theme-aware styling', () => {
      render(<Textarea placeholder="Test textarea" />)
      
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass(
        'border-input',
        'bg-transparent',
        'placeholder:text-muted-foreground'
      )
    })

    it('should have proper focus and error states', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<Textarea placeholder="Focus test" />)
      
      const textarea = screen.getByRole('textbox')
      await user.click(textarea)
      
      expect(textarea).toHaveClass(
        'focus-visible:border-ring',
        'focus-visible:ring-ring/50'
      )

      // Test error state
      rerender(<Textarea aria-invalid="true" placeholder="Error test" />)
      expect(textarea).toHaveClass(
        'aria-invalid:border-destructive',
        'aria-invalid:ring-destructive/20'
      )
    })
  })

  describe('Checkbox Component', () => {
    it('should have proper theme-aware styling', () => {
      render(<Checkbox />)
      
      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveClass(
        'border-input',
        'data-[state=checked]:bg-primary',
        'data-[state=checked]:text-primary-foreground'
      )
    })

    it('should have proper focus states', async () => {
      const user = userEvent.setup()
      render(<Checkbox />)
      
      const checkbox = screen.getByRole('checkbox')
      await user.tab()
      
      expect(checkbox).toHaveClass(
        'focus-visible:border-ring',
        'focus-visible:ring-ring/50'
      )
    })
  })

  describe('RadioGroup Component', () => {
    it('should have proper theme-aware styling', () => {
      render(
        <RadioGroup defaultValue="option1">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="option1" id="r1" />
            <label htmlFor="r1">Option 1</label>
          </div>
        </RadioGroup>
      )
      
      const radio = screen.getByRole('radio')
      expect(radio).toHaveClass(
        'border-input',
        'text-primary'
      )
    })
  })

  describe('Select Component', () => {
    it('should have proper theme-aware styling', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveClass(
        'border-input',
        'bg-transparent',
        'data-[placeholder]:text-muted-foreground'
      )
    })
  })

  describe('Form Integration', () => {
    it('should display validation errors with proper theme styling', async () => {
      const user = userEvent.setup()
      render(<TestForm />)
      
      // Submit form without filling required fields
      const submitButton = screen.getByRole('button', { name: /submit/i })
      await user.click(submitButton)
      
      // Wait for validation errors to appear
      await waitFor(() => {
        const errorMessages = screen.getAllByText(/required/i)
        expect(errorMessages.length).toBeGreaterThan(0)
        
        // Check that error messages have proper theme styling
        errorMessages.forEach(message => {
          expect(message).toHaveClass('text-destructive')
        })
      })
    })

    it('should show proper focus states on form fields', async () => {
      const user = userEvent.setup()
      render(<TestForm />)
      
      const textInput = screen.getByLabelText('Text Input')
      await user.click(textInput)
      
      expect(textInput).toHaveClass(
        'focus-visible:border-ring',
        'focus-visible:ring-ring/50'
      )
    })

    it('should handle form submission with proper styling', async () => {
      const user = userEvent.setup()
      render(<TestForm />)
      
      // Fill out the form
      await user.type(screen.getByLabelText('Text Input'), 'test')
      await user.type(screen.getByPlaceholderText('Enter email'), 'test@example.com')
      await user.type(screen.getByLabelText('Textarea'), 'textarea content')
      await user.click(screen.getByRole('checkbox'))
      await user.click(screen.getByLabelText('Option 1'))
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /submit/i })
      expect(submitButton).toHaveClass(
        'bg-primary',
        'text-primary-foreground',
        'hover:bg-primary/90'
      )
    })
  })

  describe('Interactive States', () => {
    it('should have proper hover states for all interactive elements', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <Button>Hover Button</Button>
          <Input placeholder="Hover Input" />
          <Checkbox />
        </div>
      )
      
      const button = screen.getByRole('button')
      const input = screen.getByRole('textbox')
      const checkbox = screen.getByRole('checkbox')
      
      // Test button hover
      await user.hover(button)
      expect(button).toHaveClass('hover:bg-primary/90')
      
      // Test input focus
      await user.click(input)
      expect(input).toHaveClass('focus-visible:border-ring')
      
      // Test checkbox focus
      await user.tab()
      expect(checkbox).toHaveClass('focus-visible:ring-ring/50')
    })

    it('should maintain accessibility with proper contrast ratios', () => {
      render(
        <div>
          <Button variant="destructive">Destructive</Button>
          <Button variant="secondary">Secondary</Button>
          <div className="text-muted-foreground">Muted text</div>
          <div className="text-destructive">Error text</div>
        </div>
      )
      
      // These classes should provide proper contrast ratios
      const destructiveButton = screen.getByRole('button', { name: /destructive/i })
      expect(destructiveButton).toHaveClass('bg-destructive', 'text-white')
      
      const secondaryButton = screen.getByRole('button', { name: /secondary/i })
      expect(secondaryButton).toHaveClass('bg-secondary', 'text-secondary-foreground')
    })
  })
})