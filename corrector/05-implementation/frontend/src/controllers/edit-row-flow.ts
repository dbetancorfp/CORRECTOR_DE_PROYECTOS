// Shared "save an inline row edit" flow — identical shape across every
// screen with an Editar/Guardar row (set loading -> call -> on success patch
// the row and close the editor -> otherwise show a single edit-row message,
// collapsing validation-error and error into the same generic text since
// none of these screens surface field-level errors while editing).
export type EditResult<Item> =
  | { status: 'success'; item: Item }
  | { status: 'validation-error' }
  | { status: 'error'; message: string };

export async function runEditRowFlow<Item>(
  setLoading: (loading: boolean) => void,
  render: () => void,
  updateFn: () => Promise<EditResult<Item>>,
  onSuccess: (item: Item) => void,
  onError: (message: string) => void,
): Promise<void> {
  setLoading(true);
  render();

  const state = await updateFn();
  setLoading(false);

  if (state.status === 'success') {
    onSuccess(state.item);
    render();
    return;
  }

  onError(state.status === 'validation-error' ? 'Datos no válidos' : state.message);
  render();
}
