# Component Theme Examples

This document provides comprehensive examples of theme-aware components in the Talent Tracker application. Each example demonstrates proper color usage, accessibility considerations, and testing patterns.

## Table of Contents

1. [Form Components](#form-components)
2. [Navigation Components](#navigation-components)
3. [Data Display Components](#data-display-components)
4. [Feedback Components](#feedback-components)
5. [Layout Components](#layout-components)
6. [Interactive Components](#interactive-components)
7. [Status and Badge Components](#status-and-badge-components)
8. [Modal and Dialog Components](#modal-and-dialog-components)

## Form Components

### Input Field with Validation

```tsx
interface InputFieldProps {
  label: string;
  error?: string;
  success?: boolean;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  success,
  disabled,
  placeholder,
  type = "text",
  value,
  onChange
}) => {
  const getInputClasses = () => {
    const baseClasses = `
      w-full px-3 py-2 rounded-md border transition-colors duration-200
      bg-background text-foreground placeholder:text-muted-foreground
      focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    if (error) {
      return `${baseClasses} border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400`;
    }
    
    if (success) {
      return `${baseClasses} border-green-500 dark:border-green-400 focus:border-green-500 dark:focus:border-green-400`;
    }

    return `${baseClasses} border-input hover:border-ring`;
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {label}
      </label>
      
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={getInputClasses()}
      />
      
      {error && (
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-green-600 dark:text-green-400">Valid input</p>
        </div>
      )}
    </div>
  );
};

// Usage Example
const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});

  return (
    <form className="space-y-6 bg-card text-card-foreground p-6 rounded-lg border border-border">
      <h2 className="text-2xl font-bold text-foreground">Sign In</h2>
      
      <InputField
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        error={errors.email}
      />
      
      <InputField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        error={errors.password}
      />
      
      <button
        type="submit"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded-md font-medium transition-colors"
      >
        Sign In
      </button>
    </form>
  );
};
```

### Select Dropdown

```tsx
interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  error,
  disabled
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {label}
      </label>
      
      <select
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 rounded-md border transition-colors
          bg-background text-foreground
          focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error 
            ? 'border-red-500 dark:border-red-400' 
            : 'border-input hover:border-ring'
          }
        `}
      >
        <option value="" className="text-muted-foreground">
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};
```

## Navigation Components

### Navigation Bar

```tsx
interface NavigationItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}

interface NavigationBarProps {
  items: NavigationItem[];
  logo?: React.ReactNode;
  userMenu?: React.ReactNode;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ items, logo, userMenu }) => {
  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            {logo || (
              <h1 className="text-xl font-bold text-foreground">
                Talent Tracker
              </h1>
            )}
          </div>
          
          {/* Navigation Items */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {items.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`
                    px-3 py-2 rounded-md text-sm font-medium transition-colors
                    flex items-center space-x-2
                    ${item.isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }
                  `}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </div>
          
          {/* User Menu */}
          <div className="flex items-center">
            {userMenu}
          </div>
        </div>
      </div>
    </nav>
  );
};
```

### Mobile Navigation Dock

```tsx
interface DockItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  isActive?: boolean;
  badge?: number;
}

interface MobileNavigationDockProps {
  items: DockItem[];
}

const MobileNavigationDock: React.FC<MobileNavigationDockProps> = ({ items }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border md:hidden">
      <div className="grid grid-cols-5 h-16">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`
              flex flex-col items-center justify-center space-y-1 relative
              transition-colors
              ${item.isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <div className="relative">
              {item.icon}
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
};
```

## Data Display Components

### Data Table

```tsx
interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
}

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = "No data available"
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-background divide-y divide-border">
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="hover:bg-muted/50 transition-colors"
            >
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className="px-6 py-4 text-sm text-foreground"
                >
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Usage Example
const TalentTable = () => {
  const columns: Column<Talent>[] = [
    { key: 'name', header: 'Name' },
    { key: 'role', header: 'Role' },
    {
      key: 'status',
      header: 'Status',
      render: (status) => (
        <StatusBadge status={status.toLowerCase()}>
          {status}
        </StatusBadge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, talent) => (
        <div className="flex space-x-2">
          <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
            Edit
          </button>
          <button className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
            Remove
          </button>
        </div>
      )
    }
  ];

  return <DataTable data={talentData} columns={columns} />;
};
```

### Card Component

```tsx
interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  className?: string;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  actions,
  variant = 'default',
  className = ''
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'elevated':
        return 'bg-card text-card-foreground shadow-lg border border-border';
      case 'outlined':
        return 'bg-background text-foreground border-2 border-border';
      default:
        return 'bg-card text-card-foreground border border-border';
    }
  };

  return (
    <div className={`rounded-lg ${getVariantClasses()} ${className}`}>
      {(title || subtitle || actions) && (
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex space-x-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

// Usage Example
const ProjectCard = ({ project }) => {
  return (
    <Card
      title={project.name}
      subtitle={`${project.talentCount} talent members`}
      variant="elevated"
      actions={
        <div className="flex space-x-2">
          <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
            Edit
          </button>
          <button className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
            Archive
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-muted-foreground">{project.description}</p>
        
        <div className="flex items-center justify-between">
          <StatusBadge status={project.status}>
            {project.status}
          </StatusBadge>
          <span className="text-sm text-muted-foreground">
            Updated {project.updatedAt}
          </span>
        </div>
      </div>
    </Card>
  );
};
```

## Feedback Components

### Alert Component

```tsx
interface AlertProps {
  type: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Alert: React.FC<AlertProps> = ({
  type,
  title,
  children,
  dismissible = false,
  onDismiss
}) => {
  const getAlertClasses = () => {
    const baseClasses = 'rounded-lg border p-4';
    
    switch (type) {
      case 'success':
        return `${baseClasses} bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800`;
      case 'warning':
        return `${baseClasses} bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800`;
      case 'error':
        return `${baseClasses} bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800`;
      case 'info':
        return `${baseClasses} bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800`;
      default:
        return `${baseClasses} bg-muted border-border`;
    }
  };

  const getTextClasses = () => {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-300';
      case 'warning':
        return 'text-amber-700 dark:text-amber-300';
      case 'error':
        return 'text-red-700 dark:text-red-300';
      case 'info':
        return 'text-blue-700 dark:text-blue-300';
      default:
        return 'text-foreground';
    }
  };

  const getIconClasses = () => {
    switch (type) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={getAlertClasses()}>
      <div className="flex">
        <div className={`flex-shrink-0 ${getIconClasses()}`}>
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${getTextClasses()}`}>
              {title}
            </h3>
          )}
          <div className={`${title ? 'mt-2' : ''} text-sm ${getTextClasses()}`}>
            {children}
          </div>
        </div>
        {dismissible && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className={`inline-flex rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${getIconClasses()}`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Usage Examples
const AlertExamples = () => {
  return (
    <div className="space-y-4">
      <Alert type="success" title="Success!">
        Your project has been created successfully.
      </Alert>
      
      <Alert type="warning" title="Warning">
        Please review your timecard before submitting.
      </Alert>
      
      <Alert type="error" title="Error" dismissible onDismiss={() => {}}>
        Failed to save changes. Please try again.
      </Alert>
      
      <Alert type="info">
        New features are available in this update.
      </Alert>
    </div>
  );
};
```

## Status and Badge Components

### Status Badge

```tsx
interface StatusBadgeProps {
  status: 'active' | 'pending' | 'inactive' | 'error' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  children
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs';
      case 'lg':
        return 'px-3 py-1 text-sm';
      default:
        return 'px-2.5 py-0.5 text-xs';
    }
  };

  const getStatusClasses = () => {
    const baseClasses = 'inline-flex items-center font-medium rounded-full border';
    
    switch (status) {
      case 'active':
      case 'success':
        return `${baseClasses} bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800`;
      case 'pending':
      case 'warning':
        return `${baseClasses} bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800`;
      case 'inactive':
        return `${baseClasses} bg-gray-50 dark:bg-gray-950/20 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800`;
      case 'error':
        return `${baseClasses} bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800`;
      default:
        return `${baseClasses} bg-muted text-muted-foreground border-border`;
    }
  };

  return (
    <span className={`${getStatusClasses()} ${getSizeClasses()}`}>
      {children}
    </span>
  );
};
```

### Progress Indicator

```tsx
interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  label,
  showPercentage = false,
  variant = 'default'
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  const getProgressClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-600 dark:bg-green-400';
      case 'warning':
        return 'bg-amber-600 dark:bg-amber-400';
      case 'error':
        return 'bg-red-600 dark:bg-red-400';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className="space-y-2">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center">
          {label && (
            <span className="text-sm font-medium text-foreground">{label}</span>
          )}
          {showPercentage && (
            <span className="text-sm text-muted-foreground">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getProgressClasses()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
```

## Modal and Dialog Components

### Modal Component

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'max-w-sm';
      case 'lg':
        return 'max-w-2xl';
      case 'xl':
        return 'max-w-4xl';
      default:
        return 'max-w-md';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative bg-card text-card-foreground rounded-lg shadow-xl w-full ${getSizeClasses()}`}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-border">
            {title && (
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Usage Example
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-muted-foreground">{message}</p>
        
        <div className="flex space-x-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 rounded-md transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
};
```

## Testing Examples

### Component Theme Testing

```tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';

const TestWrapper = ({ theme, children }) => (
  <ThemeProvider attribute="class" defaultTheme={theme}>
    <div className={theme}>{children}</div>
  </ThemeProvider>
);

describe('InputField Theme Tests', () => {
  it('renders correctly in light theme', () => {
    render(
      <TestWrapper theme="light">
        <InputField label="Test Input" value="test" />
      </TestWrapper>
    );
    
    const input = screen.getByLabelText('Test Input');
    expect(input).toHaveClass('bg-background', 'text-foreground');
  });

  it('renders correctly in dark theme', () => {
    render(
      <TestWrapper theme="dark">
        <InputField label="Test Input" value="test" />
      </TestWrapper>
    );
    
    const input = screen.getByLabelText('Test Input');
    expect(input).toHaveClass('bg-background', 'text-foreground');
  });

  it('shows error state with proper colors', () => {
    render(
      <TestWrapper theme="light">
        <InputField label="Test Input" error="Required field" />
      </TestWrapper>
    );
    
    const errorMessage = screen.getByText('Required field');
    expect(errorMessage).toHaveClass('text-red-600');
  });

  it('shows error state with proper colors in dark theme', () => {
    render(
      <TestWrapper theme="dark">
        <InputField label="Test Input" error="Required field" />
      </TestWrapper>
    );
    
    const errorMessage = screen.getByText('Required field');
    expect(errorMessage).toHaveClass('dark:text-red-400');
  });
});

describe('StatusBadge Theme Tests', () => {
  it('renders success status with proper colors', () => {
    render(
      <TestWrapper theme="light">
        <StatusBadge status="success">Active</StatusBadge>
      </TestWrapper>
    );
    
    const badge = screen.getByText('Active');
    expect(badge).toHaveClass('bg-green-50', 'text-green-700', 'border-green-200');
  });

  it('renders success status with proper dark colors', () => {
    render(
      <TestWrapper theme="dark">
        <StatusBadge status="success">Active</StatusBadge>
      </TestWrapper>
    );
    
    const badge = screen.getByText('Active');
    expect(badge).toHaveClass('dark:bg-green-950/20', 'dark:text-green-300', 'dark:border-green-800');
  });
});
```

## Accessibility Testing

```tsx
import { validateContrastRatio } from '@/lib/__tests__/contrast-validation';

describe('Component Accessibility', () => {
  it('maintains proper contrast ratios in light theme', async () => {
    render(
      <TestWrapper theme="light">
        <Alert type="error" title="Error">Error message</Alert>
      </TestWrapper>
    );
    
    const errorText = screen.getByText('Error message');
    const contrastRatio = await validateContrastRatio(errorText);
    
    expect(contrastRatio).toBeGreaterThanOrEqual(4.5); // WCAG AA standard
  });

  it('maintains proper contrast ratios in dark theme', async () => {
    render(
      <TestWrapper theme="dark">
        <Alert type="error" title="Error">Error message</Alert>
      </TestWrapper>
    );
    
    const errorText = screen.getByText('Error message');
    const contrastRatio = await validateContrastRatio(errorText);
    
    expect(contrastRatio).toBeGreaterThanOrEqual(4.5); // WCAG AA standard
  });
});
```

## Summary

These component examples demonstrate:

1. **Proper theme token usage** - Using semantic color tokens instead of hardcoded colors
2. **Dark mode support** - Including dark variants for all semantic colors
3. **Accessibility compliance** - Maintaining proper contrast ratios
4. **Interactive states** - Theme-aware hover, focus, and active states
5. **Consistent patterns** - Reusable color patterns across similar components
6. **Comprehensive testing** - Both manual and automated testing approaches

Each component follows the established theme system and provides a solid foundation for building theme-aware interfaces in the Talent Tracker application.