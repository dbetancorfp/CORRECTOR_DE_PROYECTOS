import { describe, it, expect } from 'bun:test';
import { classesFor } from '../src/styles/classes-for';

describe('classesFor', () => {
  it('returns the primary button classes by default', () => {
    expect(classesFor('button')).toContain('bg-primary-600');
  });

  it('returns the requested variant when given one', () => {
    expect(classesFor('button', 'danger')).toContain('bg-danger-600');
    expect(classesFor('button', 'secondary')).toContain('bg-gray-100');
  });

  it('falls back to the type default when passed a variant it does not define', () => {
    // 'ghost'/'link' are valid Variant values overall (the schema enum),
    // but 'button' only defines primary/secondary/danger — falls back.
    expect(classesFor('button', 'ghost')).toContain('bg-primary-600');
  });

  it('applies size classes only to sized (interactive) types', () => {
    expect(classesFor('button', 'primary', 'lg')).toContain('px-4 py-3');
    expect(classesFor('table')).not.toContain('px-');
  });

  it('defaults to size=md when none given', () => {
    expect(classesFor('text-input')).toContain('px-3 py-2');
  });

  it('gives text-input, password-input, number-input, select and reactive-filter the same variant classes', () => {
    const expected = classesFor('text-input', 'danger');
    expect(classesFor('password-input', 'danger')).toBe(expected);
    expect(classesFor('number-input', 'danger')).toBe(expected);
    expect(classesFor('select', 'danger')).toBe(expected);
    expect(classesFor('reactive-filter', 'danger')).toBe(expected);
  });

  it('distinguishes active (primary) vs inactive (default) tabs', () => {
    expect(classesFor('tab', 'primary')).toContain('border-primary-600');
    expect(classesFor('tab')).toContain('text-gray-500');
  });

  it('inputs default to the plain border look when no variant is given', () => {
    expect(classesFor('text-input')).toContain('border-gray-300');
    expect(classesFor('text-input')).not.toContain('danger');
  });
});
