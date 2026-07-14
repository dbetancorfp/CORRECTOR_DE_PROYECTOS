// Shared "create a row via a validated form" flow — identical shape across
// every screen with a create form (set loading -> call -> on success patch
// state and clear the form -> on validation error surface field errors ->
// otherwise show a form-level message). Extracted once real duplication of
// this exact shape showed up across screens (Alumnos, Proyectos,
// Profesorado, Ciclos, Legislación, Módulos).
export type CreateResult<Item, Errors> =
  | { status: 'success'; item: Item }
  | { status: 'validation-error'; errors: Errors }
  | { status: 'error'; message: string };

export async function runCreateRowFlow<Item, Errors>(
  setLoading: (loading: boolean) => void,
  setFormError: (message: string) => void,
  render: () => void,
  createFn: () => Promise<CreateResult<Item, Errors>>,
  onSuccess: (item: Item) => void,
  onValidationError: (errors: Errors) => void,
): Promise<void> {
  setLoading(true);
  setFormError('');
  render();

  const state = await createFn();
  setLoading(false);

  if (state.status === 'success') {
    onSuccess(state.item);
    render();
    return;
  }

  if (state.status === 'validation-error') {
    onValidationError(state.errors);
    render();
    return;
  }

  setFormError(state.message);
  render();
}
