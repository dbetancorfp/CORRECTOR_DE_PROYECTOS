// Infrastructure module — not tied to a boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import { render } from 'lit-html';
import { renderOptionSelect } from '../src/components/option-select';

interface Item { id: number; name: string }

const items: Item[] = [{ id: 1, name: 'DAW' }, { id: 2, name: 'ASIR' }];

function renderInto(props: Parameters<typeof renderOptionSelect<Item>>[0]): HTMLSelectElement {
  const container = document.createElement('div');
  render(renderOptionSelect(props), container);
  return container.querySelector('select')!;
}

describe('components/option-select — renderOptionSelect', () => {
  it('renders the sketchNumber, a placeholder option, and one option per item', () => {
    const select = renderInto({
      sketchNumber: 64,
      options: items,
      getId: (i) => i.id,
      getLabel: (i) => i.name,
      selectedValue: '',
      placeholder: 'Seleccionar ciclo',
      onChange: () => {},
    });
    expect(select.getAttribute('data-element-id')).toBe('64');
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(3);
    expect(options[0]!.value).toBe('');
    expect(options[0]!.textContent).toBe('Seleccionar ciclo');
    expect(options[1]!.textContent).toBe('DAW');
  });

  it('marks the option matching selectedValue as selected', () => {
    const select = renderInto({
      sketchNumber: 64,
      options: items,
      getId: (i) => i.id,
      getLabel: (i) => i.name,
      selectedValue: '2',
      placeholder: 'Seleccionar ciclo',
      onChange: () => {},
    });
    const options = select.querySelectorAll('option');
    expect(options[1]!.hasAttribute('selected')).toBe(false);
    expect(options[2]!.hasAttribute('selected')).toBe(true);
  });

  it('applies disabled when requested', () => {
    const select = renderInto({
      sketchNumber: 64,
      options: items,
      getId: (i) => i.id,
      getLabel: (i) => i.name,
      selectedValue: '',
      placeholder: 'Seleccionar ciclo',
      onChange: () => {},
      disabled: true,
    });
    expect(select.disabled).toBe(true);
  });

  it('omits aria-invalid entirely when invalid is not provided (filter selects)', () => {
    const select = renderInto({
      sketchNumber: 64,
      options: items,
      getId: (i) => i.id,
      getLabel: (i) => i.name,
      selectedValue: '',
      placeholder: 'Seleccionar ciclo',
      onChange: () => {},
    });
    expect(select.hasAttribute('aria-invalid')).toBe(false);
  });

  it('sets aria-invalid=true/false when invalid is provided (form selects)', () => {
    const invalid = renderInto({
      sketchNumber: 64,
      options: items,
      getId: (i) => i.id,
      getLabel: (i) => i.name,
      selectedValue: '',
      placeholder: 'Seleccionar ciclo',
      onChange: () => {},
      invalid: true,
    });
    expect(invalid.getAttribute('aria-invalid')).toBe('true');

    const valid = renderInto({
      sketchNumber: 64,
      options: items,
      getId: (i) => i.id,
      getLabel: (i) => i.name,
      selectedValue: '',
      placeholder: 'Seleccionar ciclo',
      onChange: () => {},
      invalid: false,
    });
    expect(valid.getAttribute('aria-invalid')).toBe('false');
  });
});
