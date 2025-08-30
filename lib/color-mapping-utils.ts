/**
 * Color Mapping Utilities for Theme-Aware Development
 * 
 * This module provides utilities to help developers identify and use
 * the correct theme-aware color replacements for hardcoded color classes.
 */

export type ColorType = 'text' | 'background' | 'border' | 'semantic';
export type SemanticColorType = 'success' | 'warning' | 'error' | 'info';
export type Priority = 'high' | 'medium' | 'low';

export interface ColorMapping {
  hardcodedClass: string;
  themeAwareReplacement: string;
  colorType: ColorType;
  description: string;
  example?: string;
}

export interface SemanticColorMapping {
  colorType: SemanticColorType;
  lightClass: string;
  darkClass: string;
  combined: string;
  description: string;
  usage: string;
}

/**
 * Comprehensive mapping of hardcoded colors to theme-aware replacements
 */
export const COLOR_MAPPINGS: ColorMapping[] = [
  // Text Colors - Grayscale
  {
    hardcodedClass: 'text-gray-900',
    themeAwareReplacement: 'text-foreground',
    colorType: 'text',
    description: 'Primary text color - darkest gray becomes theme foreground',
    example: '<h1 className="text-foreground">Main Heading</h1>'
  },
  {
    hardcodedClass: 'text-gray-800',
    themeAwareReplacement: 'text-foreground',
    colorType: 'text',
    description: 'Primary text color - dark gray becomes theme foreground',
    example: '<p className="text-foreground">Body text</p>'
  },
  {
    hardcodedClass: 'text-gray-700',
    themeAwareReplacement: 'text-foreground',
    colorType: 'text',
    description: 'Primary text color - medium-dark gray becomes theme foreground',
    example: '<span className="text-foreground">Label text</span>'
  },
  {
    hardcodedClass: 'text-gray-600',
    themeAwareReplacement: 'text-muted-foreground',
    colorType: 'text',
    description: 'Secondary text color - medium gray becomes muted foreground',
    example: '<p className="text-muted-foreground">Helper text</p>'
  },
  {
    hardcodedClass: 'text-gray-500',
    themeAwareReplacement: 'text-muted-foreground',
    colorType: 'text',
    description: 'Secondary text color - light-medium gray becomes muted foreground',
    example: '<span className="text-muted-foreground">Placeholder text</span>'
  },
  {
    hardcodedClass: 'text-gray-400',
    themeAwareReplacement: 'text-muted-foreground',
    colorType: 'text',
    description: 'Tertiary text color - light gray becomes muted foreground',
    example: '<small className="text-muted-foreground">Caption text</small>'
  },
  {
    hardcodedClass: 'text-white',
    themeAwareReplacement: 'text-primary-foreground',
    colorType: 'text',
    description: 'Text on colored backgrounds - use primary-foreground for contrast',
    example: '<button className="bg-primary text-primary-foreground">Button</button>'
  },
  {
    hardcodedClass: 'text-black',
    themeAwareReplacement: 'text-foreground',
    colorType: 'text',
    description: 'Primary text color - black becomes theme foreground',
    example: '<div className="text-foreground">Content</div>'
  },

  // Background Colors - Grayscale
  {
    hardcodedClass: 'bg-white',
    themeAwareReplacement: 'bg-background',
    colorType: 'background',
    description: 'Main background color - white becomes theme background',
    example: '<div className="bg-background">Main content area</div>'
  },
  {
    hardcodedClass: 'bg-gray-50',
    themeAwareReplacement: 'bg-muted',
    colorType: 'background',
    description: 'Light background for sections - very light gray becomes muted',
    example: '<section className="bg-muted">Content section</section>'
  },
  {
    hardcodedClass: 'bg-gray-100',
    themeAwareReplacement: 'bg-muted',
    colorType: 'background',
    description: 'Light background for cards - light gray becomes muted',
    example: '<div className="bg-muted rounded-lg">Card content</div>'
  },
  {
    hardcodedClass: 'bg-gray-200',
    themeAwareReplacement: 'bg-border',
    colorType: 'background',
    description: 'Subtle background for dividers - medium-light gray becomes border color',
    example: '<hr className="bg-border h-px" />'
  },
  {
    hardcodedClass: 'bg-gray-800',
    themeAwareReplacement: 'bg-card',
    colorType: 'background',
    description: 'Dark background for cards in dark theme context',
    example: '<div className="bg-card">Card in dark theme</div>'
  },
  {
    hardcodedClass: 'bg-gray-900',
    themeAwareReplacement: 'bg-background',
    colorType: 'background',
    description: 'Dark background in dark theme context',
    example: '<div className="bg-background">Dark theme background</div>'
  },

  // Border Colors
  {
    hardcodedClass: 'border-gray-200',
    themeAwareReplacement: 'border-border',
    colorType: 'border',
    description: 'Standard border color - light gray becomes theme border',
    example: '<div className="border border-border">Bordered element</div>'
  },
  {
    hardcodedClass: 'border-gray-300',
    themeAwareReplacement: 'border-border',
    colorType: 'border',
    description: 'Standard border color - medium-light gray becomes theme border',
    example: '<input className="border border-border" />'
  },
  {
    hardcodedClass: 'border-gray-400',
    themeAwareReplacement: 'border-input',
    colorType: 'border',
    description: 'Input border color - medium gray becomes input border',
    example: '<input className="border border-input focus:border-ring" />'
  }
];

/**
 * Semantic color mappings with dark mode variants
 */
export const SEMANTIC_COLOR_MAPPINGS: SemanticColorMapping[] = [
  {
    colorType: 'success',
    lightClass: 'text-green-600',
    darkClass: 'dark:text-green-400',
    combined: 'text-green-600 dark:text-green-400',
    description: 'Success state text color with proper contrast in both themes',
    usage: 'Use for success messages, completed states, positive feedback'
  },
  {
    colorType: 'success',
    lightClass: 'text-green-700',
    darkClass: 'dark:text-green-300',
    combined: 'text-green-700 dark:text-green-300',
    description: 'Darker success text for emphasis',
    usage: 'Use for important success messages or headings'
  },
  {
    colorType: 'success',
    lightClass: 'bg-green-50',
    darkClass: 'dark:bg-green-950/20',
    combined: 'bg-green-50 dark:bg-green-950/20',
    description: 'Success background color with subtle opacity in dark mode',
    usage: 'Use for success alert backgrounds or highlight areas'
  },
  {
    colorType: 'warning',
    lightClass: 'text-amber-600',
    darkClass: 'dark:text-amber-400',
    combined: 'text-amber-600 dark:text-amber-400',
    description: 'Warning state text color with proper contrast in both themes',
    usage: 'Use for warning messages, caution states, attention-needed feedback'
  },
  {
    colorType: 'warning',
    lightClass: 'text-amber-700',
    darkClass: 'dark:text-amber-300',
    combined: 'text-amber-700 dark:text-amber-300',
    description: 'Darker warning text for emphasis',
    usage: 'Use for important warning messages or headings'
  },
  {
    colorType: 'warning',
    lightClass: 'bg-amber-50',
    darkClass: 'dark:bg-amber-950/20',
    combined: 'bg-amber-50 dark:bg-amber-950/20',
    description: 'Warning background color with subtle opacity in dark mode',
    usage: 'Use for warning alert backgrounds or highlight areas'
  },
  {
    colorType: 'error',
    lightClass: 'text-red-600',
    darkClass: 'dark:text-red-400',
    combined: 'text-red-600 dark:text-red-400',
    description: 'Error state text color with proper contrast in both themes',
    usage: 'Use for error messages, failed states, destructive actions'
  },
  {
    colorType: 'error',
    lightClass: 'text-red-700',
    darkClass: 'dark:text-red-300',
    combined: 'text-red-700 dark:text-red-300',
    description: 'Darker error text for emphasis',
    usage: 'Use for critical error messages or headings'
  },
  {
    colorType: 'error',
    lightClass: 'bg-red-50',
    darkClass: 'dark:bg-red-950/20',
    combined: 'bg-red-50 dark:bg-red-950/20',
    description: 'Error background color with subtle opacity in dark mode',
    usage: 'Use for error alert backgrounds or highlight areas'
  },
  {
    colorType: 'info',
    lightClass: 'text-blue-600',
    darkClass: 'dark:text-blue-400',
    combined: 'text-blue-600 dark:text-blue-400',
    description: 'Info state text color with proper contrast in both themes',
    usage: 'Use for informational messages, neutral states, helpful tips'
  },
  {
    colorType: 'info',
    lightClass: 'text-blue-700',
    darkClass: 'dark:text-blue-300',
    combined: 'text-blue-700 dark:text-blue-300',
    description: 'Darker info text for emphasis',
    usage: 'Use for important informational messages or headings'
  },
  {
    colorType: 'info',
    lightClass: 'bg-blue-50',
    darkClass: 'dark:bg-blue-950/20',
    combined: 'bg-blue-50 dark:bg-blue-950/20',
    description: 'Info background color with subtle opacity in dark mode',
    usage: 'Use for info alert backgrounds or highlight areas'
  }
];

/**
 * Find the appropriate theme-aware replacement for a hardcoded color class
 */
export function findColorReplacement(hardcodedClass: string): ColorMapping | null {
  return COLOR_MAPPINGS.find(mapping => mapping.hardcodedClass === hardcodedClass) || null;
}

/**
 * Get semantic color mapping by type and class
 */
export function findSemanticColorReplacement(
  colorType: SemanticColorType,
  hardcodedClass: string
): SemanticColorMapping | null {
  return SEMANTIC_COLOR_MAPPINGS.find(
    mapping => mapping.colorType === colorType && 
    (mapping.lightClass === hardcodedClass || hardcodedClass.includes(mapping.lightClass.split('-')[1]))
  ) || null;
}

/**
 * Generate suggestions for replacing hardcoded colors in a given text
 */
export function generateColorSuggestions(codeText: string): Array<{
  original: string;
  suggestion: string;
  line: number;
  type: ColorType;
  description: string;
}> {
  const suggestions: Array<{
    original: string;
    suggestion: string;
    line: number;
    type: ColorType;
    description: string;
  }> = [];

  const lines = codeText.split('\n');
  
  lines.forEach((line, index) => {
    COLOR_MAPPINGS.forEach(mapping => {
      if (line.includes(mapping.hardcodedClass)) {
        suggestions.push({
          original: mapping.hardcodedClass,
          suggestion: mapping.themeAwareReplacement,
          line: index + 1,
          type: mapping.colorType,
          description: mapping.description
        });
      }
    });
  });

  return suggestions;
}

/**
 * Validate if a color class is theme-aware
 */
export function isThemeAware(colorClass: string): boolean {
  const themeAwarePatterns = [
    /^(text|bg|border)-(foreground|background|muted|card|primary|secondary|accent|destructive)/,
    /^(text|bg|border)-(muted-foreground|card-foreground|primary-foreground|secondary-foreground|accent-foreground|destructive-foreground)/,
    /^(text|bg|border)-(border|input|ring)/,
    /dark:/  // Contains dark mode variant
  ];

  return themeAwarePatterns.some(pattern => pattern.test(colorClass));
}

/**
 * Extract all color classes from a string of code
 */
export function extractColorClasses(codeText: string): string[] {
  const colorClassRegex = /(text|bg|border)-(gray|slate|zinc|neutral|stone|red|green|blue|yellow|amber|orange|purple|pink|indigo|cyan|teal|lime|emerald|sky|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900)/g;
  const matches = codeText.match(colorClassRegex) || [];
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Get priority level for a component based on its path
 */
export function getComponentPriority(filePath: string): Priority {
  const highPriorityPaths = [
    'components/navigation/',
    'components/auth/',
    'components/projects/',
    'app/(app)/'
  ];
  
  const mediumPriorityPaths = [
    'components/talent/',
    'components/ui/',
    'app/'
  ];

  if (highPriorityPaths.some(path => filePath.includes(path))) {
    return 'high';
  }
  
  if (mediumPriorityPaths.some(path => filePath.includes(path))) {
    return 'medium';
  }
  
  return 'low';
}