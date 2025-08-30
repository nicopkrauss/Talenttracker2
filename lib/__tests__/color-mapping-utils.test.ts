import { describe, it, expect } from 'vitest';
import {
  findColorReplacement,
  findSemanticColorReplacement,
  isThemeAware,
  extractColorClasses,
  generateColorSuggestions,
  getComponentPriority,
  COLOR_MAPPINGS,
  SEMANTIC_COLOR_MAPPINGS
} from '../color-mapping-utils';

describe('Color Mapping Utilities', () => {
  describe('findColorReplacement', () => {
    it('should find replacement for hardcoded text colors', () => {
      const replacement = findColorReplacement('text-gray-600');
      expect(replacement).toEqual({
        hardcodedClass: 'text-gray-600',
        themeAwareReplacement: 'text-muted-foreground',
        colorType: 'text',
        description: 'Secondary text color - medium gray becomes muted foreground',
        example: '<p className="text-muted-foreground">Helper text</p>'
      });
    });

    it('should find replacement for hardcoded background colors', () => {
      const replacement = findColorReplacement('bg-white');
      expect(replacement).toEqual({
        hardcodedClass: 'bg-white',
        themeAwareReplacement: 'bg-background',
        colorType: 'background',
        description: 'Main background color - white becomes theme background',
        example: '<div className="bg-background">Main content area</div>'
      });
    });

    it('should return null for unknown colors', () => {
      const replacement = findColorReplacement('text-purple-500');
      expect(replacement).toBeNull();
    });
  });

  describe('findSemanticColorReplacement', () => {
    it('should find semantic color replacement for success colors', () => {
      const replacement = findSemanticColorReplacement('success', 'text-green-600');
      expect(replacement).toBeDefined();
      expect(replacement?.colorType).toBe('success');
      expect(replacement?.combined).toBe('text-green-600 dark:text-green-400');
    });

    it('should find semantic color replacement for error colors', () => {
      const replacement = findSemanticColorReplacement('error', 'text-red-600');
      expect(replacement).toBeDefined();
      expect(replacement?.colorType).toBe('error');
      expect(replacement?.combined).toBe('text-red-600 dark:text-red-400');
    });

    it('should return null for unknown semantic colors', () => {
      const replacement = findSemanticColorReplacement('success', 'text-purple-600');
      expect(replacement).toBeNull();
    });
  });

  describe('isThemeAware', () => {
    it('should identify theme-aware color classes', () => {
      expect(isThemeAware('text-foreground')).toBe(true);
      expect(isThemeAware('bg-muted')).toBe(true);
      expect(isThemeAware('border-input')).toBe(true);
      expect(isThemeAware('text-primary-foreground')).toBe(true);
    });

    it('should identify classes with dark variants as theme-aware', () => {
      expect(isThemeAware('text-green-600 dark:text-green-400')).toBe(true);
      expect(isThemeAware('bg-red-50 dark:bg-red-950/20')).toBe(true);
    });

    it('should identify hardcoded colors as not theme-aware', () => {
      expect(isThemeAware('text-gray-600')).toBe(false);
      expect(isThemeAware('bg-gray-100')).toBe(false);
      expect(isThemeAware('border-gray-300')).toBe(false);
    });
  });

  describe('extractColorClasses', () => {
    it('should extract hardcoded color classes from code', () => {
      const code = `
        <div className="bg-gray-100 text-gray-800">
          <h1 className="text-gray-900">Title</h1>
          <p className="text-green-600">Success</p>
        </div>
      `;
      
      const colors = extractColorClasses(code);
      expect(colors).toContain('bg-gray-100');
      expect(colors).toContain('text-gray-800');
      expect(colors).toContain('text-gray-900');
      expect(colors).toContain('text-green-600');
    });

    it('should remove duplicate color classes', () => {
      const code = `
        <div className="text-gray-600">
          <p className="text-gray-600">Duplicate color</p>
        </div>
      `;
      
      const colors = extractColorClasses(code);
      expect(colors.filter(c => c === 'text-gray-600')).toHaveLength(1);
    });
  });

  describe('generateColorSuggestions', () => {
    it('should generate suggestions for hardcoded colors', () => {
      const code = `
        <div className="bg-gray-100 text-gray-600">
          <h1 className="text-gray-900">Title</h1>
        </div>
      `;
      
      const suggestions = generateColorSuggestions(code);
      
      expect(suggestions).toHaveLength(3);
      
      // Check that we have the expected suggestions (order may vary)
      const originals = suggestions.map(s => s.original);
      expect(originals).toContain('bg-gray-100');
      expect(originals).toContain('text-gray-600');
      expect(originals).toContain('text-gray-900');
      
      // Check specific suggestion
      const bgSuggestion = suggestions.find(s => s.original === 'bg-gray-100');
      expect(bgSuggestion).toEqual({
        original: 'bg-gray-100',
        suggestion: 'bg-muted',
        line: 2,
        type: 'background',
        description: 'Light background for cards - light gray becomes muted'
      });
    });

    it('should provide line numbers for suggestions', () => {
      const code = `Line 1
<div className="text-gray-600">Line 2</div>
<p className="bg-gray-50">Line 3</p>`;
      
      const suggestions = generateColorSuggestions(code);
      
      expect(suggestions[0].line).toBe(2);
      expect(suggestions[1].line).toBe(3);
    });
  });

  describe('getComponentPriority', () => {
    it('should assign high priority to navigation components', () => {
      expect(getComponentPriority('components/navigation/nav.tsx')).toBe('high');
      expect(getComponentPriority('components/auth/login.tsx')).toBe('high');
      expect(getComponentPriority('components/projects/detail.tsx')).toBe('high');
      expect(getComponentPriority('app/(app)/dashboard.tsx')).toBe('high');
    });

    it('should assign medium priority to feature components', () => {
      expect(getComponentPriority('components/talent/form.tsx')).toBe('medium');
      expect(getComponentPriority('components/ui/button.tsx')).toBe('medium');
      expect(getComponentPriority('app/landing.tsx')).toBe('medium');
    });

    it('should assign low priority to other components', () => {
      expect(getComponentPriority('components/debug/logger.tsx')).toBe('low');
      expect(getComponentPriority('lib/utils.ts')).toBe('low');
      expect(getComponentPriority('test/helpers.ts')).toBe('low');
    });
  });

  describe('COLOR_MAPPINGS data integrity', () => {
    it('should have valid structure for all mappings', () => {
      COLOR_MAPPINGS.forEach(mapping => {
        expect(mapping).toHaveProperty('hardcodedClass');
        expect(mapping).toHaveProperty('themeAwareReplacement');
        expect(mapping).toHaveProperty('colorType');
        expect(mapping).toHaveProperty('description');
        expect(['text', 'background', 'border']).toContain(mapping.colorType);
      });
    });

    it('should have unique hardcoded classes', () => {
      const classes = COLOR_MAPPINGS.map(m => m.hardcodedClass);
      const uniqueClasses = new Set(classes);
      expect(classes.length).toBe(uniqueClasses.size);
    });
  });

  describe('SEMANTIC_COLOR_MAPPINGS data integrity', () => {
    it('should have valid structure for all semantic mappings', () => {
      SEMANTIC_COLOR_MAPPINGS.forEach(mapping => {
        expect(mapping).toHaveProperty('colorType');
        expect(mapping).toHaveProperty('lightClass');
        expect(mapping).toHaveProperty('darkClass');
        expect(mapping).toHaveProperty('combined');
        expect(mapping).toHaveProperty('description');
        expect(mapping).toHaveProperty('usage');
        expect(['success', 'warning', 'error', 'info']).toContain(mapping.colorType);
      });
    });

    it('should have properly formatted combined classes', () => {
      SEMANTIC_COLOR_MAPPINGS.forEach(mapping => {
        expect(mapping.combined).toContain('dark:');
        expect(mapping.combined).toContain(mapping.lightClass);
      });
    });
  });
});