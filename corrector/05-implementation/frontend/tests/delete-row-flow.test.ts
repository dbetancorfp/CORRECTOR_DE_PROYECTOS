// Infrastructure module — not tied to a single boceto sketchNumber (reused
// across every screen with a row delete button).

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { runDeleteRowFlow } from '../src/controllers/delete-row-flow';

describe('controllers/delete-row-flow — runDeleteRowFlow', () => {
  const originalConfirm = window.confirm;

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  it('does nothing when the user cancels the confirmation', async () => {
    window.confirm = mock(() => false);
    const deleteFn = mock(async () => ({ status: 'success' }));
    const onSuccess = mock(() => {});
    const onError = mock(() => {});

    await runDeleteRowFlow('¿Eliminar?', deleteFn, onSuccess, onError);

    expect(deleteFn).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onSuccess when the delete succeeds', async () => {
    window.confirm = mock(() => true);
    const deleteFn = mock(async () => ({ status: 'success' }));
    const onSuccess = mock(() => {});
    const onError = mock(() => {});

    await runDeleteRowFlow('¿Eliminar?', deleteFn, onSuccess, onError);

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onError with the message when the delete is blocked or fails', async () => {
    window.confirm = mock(() => true);
    const deleteFn = mock(async () => ({ status: 'blocked', message: 'Tiene dependientes' }));
    const onSuccess = mock(() => {});
    const onError = mock(() => {});

    await runDeleteRowFlow('¿Eliminar?', deleteFn, onSuccess, onError);

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('Tiene dependientes');
  });
});
