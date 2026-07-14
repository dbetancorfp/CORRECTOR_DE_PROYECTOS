// Single point of type/variant/size -> Tailwind classes mapping — see
// docs/design-system.md for the full table and rationale. Every component
// calls this instead of inlining its own `if (variant === ...)` mapping,
// which would repeat the exact duplication SonarCloud flagged (and cost
// several rounds to remove) across the ~20 corrector-* components.
//
// `variant` reuses the fixed enum already declared in
// lib/schemas/ui-spec.schema.js (primary | secondary | danger | ghost |
// link) — ui-spec.json can't hold any other string there. For types where
// that vocabulary doesn't map 1:1 onto "default vs error" or "active vs
// inactive" (inputs, tabs), the convention is: omit `variant` entirely for
// the default look, `"danger"` for the error/destructive look, `"primary"`
// for the active/selected look. See the table in docs/design-system.md.
export type ComponentType =
  | 'button'
  | 'submit-button'
  | 'icon-button'
  | 'tab'
  | 'text-input'
  | 'password-input'
  | 'number-input'
  | 'select'
  | 'reactive-filter'
  | 'checkbox'
  | 'file-upload'
  | 'table'
  | 'table-header-cell'
  | 'table-editable-cell'
  | 'nav'
  | 'paragraph';

export type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
export type Size = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Partial<Record<Variant, string>> = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white rounded font-medium',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium border border-gray-300',
  danger: 'bg-danger-600 hover:bg-danger-700 text-white rounded font-medium',
};

const INPUT_VARIANTS: Partial<Record<Variant, string>> = {
  primary: 'border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
  danger: 'border border-danger-500 rounded focus:ring-2 focus:ring-danger-500',
};

const TYPE_VARIANTS: Record<ComponentType, Partial<Record<Variant, string>>> = {
  button: BUTTON_VARIANTS,
  'submit-button': BUTTON_VARIANTS,
  'icon-button': {
    primary: 'text-gray-500 hover:text-primary-600 rounded p-1',
    danger: 'text-gray-500 hover:text-danger-600 rounded p-1',
  },
  tab: {
    primary: 'border-b-2 border-primary-600 text-primary-700 font-semibold',
    secondary: 'text-gray-500 hover:text-gray-700',
  },
  'text-input': INPUT_VARIANTS,
  'password-input': INPUT_VARIANTS,
  'number-input': INPUT_VARIANTS,
  select: INPUT_VARIANTS,
  'reactive-filter': INPUT_VARIANTS,
  checkbox: {
    primary: 'rounded border-gray-300 text-primary-600 focus:ring-primary-500',
  },
  'file-upload': {
    secondary: 'text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-primary-50 file:text-primary-700 file:px-3 file:py-1.5 hover:file:bg-primary-100',
  },
  table: { primary: 'w-full border-collapse' },
  'table-header-cell': { primary: 'bg-gray-50 text-left text-gray-600 font-medium border-b border-gray-200 px-3 py-2' },
  'table-editable-cell': { primary: 'border-b border-gray-100 px-3 py-2' },
  nav: { primary: 'bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between' },
  paragraph: {
    primary: 'text-gray-600',
    danger: 'text-danger-600',
  },
};

// The variant used when a component omits `variant` altogether — for
// inputs/tabs this is deliberately "the look that isn't in the schema's
// literal name" (e.g. tabs default to inactive, inputs default to no
// border color override), documented per-type in docs/design-system.md.
const DEFAULT_VARIANT: Record<ComponentType, Variant> = {
  button: 'primary',
  'submit-button': 'primary',
  'icon-button': 'primary',
  tab: 'secondary', // secondary here means "inactive" — see docs/design-system.md
  'text-input': 'primary',
  'password-input': 'primary',
  'number-input': 'primary',
  select: 'primary',
  'reactive-filter': 'primary',
  checkbox: 'primary',
  'file-upload': 'secondary',
  table: 'primary',
  'table-header-cell': 'primary',
  'table-editable-cell': 'primary',
  nav: 'primary',
  paragraph: 'primary',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-3 py-2 text-base',
  lg: 'px-4 py-3 text-lg',
};

// Only interactive controls scale with `size` — tables, nav, tabs,
// paragraphs and checkboxes have a single fixed visual size.
// reactive-filter renders the same native <input>/<select> elements as
// text-input/select, so it scales identically.
const SIZED_TYPES = new Set<ComponentType>([
  'button', 'submit-button', 'icon-button', 'text-input', 'password-input',
  'number-input', 'select', 'reactive-filter', 'file-upload',
]);

export function classesFor(type: ComponentType, variant?: Variant, size: Size = 'md'): string {
  const variants = TYPE_VARIANTS[type];
  const resolvedVariant = variant !== undefined && variant in variants ? variant : DEFAULT_VARIANT[type];
  const base = variants[resolvedVariant] ?? '';
  const sizeClasses = SIZED_TYPES.has(type) ? SIZE_CLASSES[size] : '';
  return [base, sizeClasses].filter((c) => c !== '').join(' ');
}
