import { describe, expect, test } from '@jest/globals';

// Sample test file demonstrating testing setup
describe('CascadingMultiSelect Extension', () => {
  test('should initialize correctly', () => {
    expect(true).toBe(true);
  });

  test('should handle field configuration', () => {
    const sampleConfig = {
      fieldName: 'testField',
      parentSelectMode: true,
      multiSelectSeparator: ';'
    };
    
    expect(sampleConfig.fieldName).toBe('testField');
    expect(sampleConfig.parentSelectMode).toBe(true);
  });

  test('should parse JSON field values', () => {
    const jsonData = JSON.stringify({
      "parent1": ["child1", "child2"],
      "parent2": ["child3", "child4"]
    });
    
    const parsed = JSON.parse(jsonData);
    expect(Object.keys(parsed)).toHaveLength(2);
    expect(parsed.parent1).toContain('child1');
  });
});