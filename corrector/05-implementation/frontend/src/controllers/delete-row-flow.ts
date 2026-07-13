// Shared "delete a row from a CRUD table" flow — identical shape across
// every screen with a delete button (confirm -> call -> remove row on
// success -> show message otherwise). Extracted once real duplication of
// this exact shape showed up across screens (Alumnos, Proyectos,
// Profesorado, Ciclos, Legislación, Módulos, Asignación).
export interface DeleteResult {
  status: string;
  message?: string;
}

export async function runDeleteRowFlow(
  confirmMessage: string,
  deleteFn: () => Promise<DeleteResult>,
  onSuccess: () => void,
  onError: (message: string) => void,
): Promise<void> {
  const confirmed = window.confirm(confirmMessage);
  if (!confirmed) return;

  const state = await deleteFn();

  if (state.status === 'success') {
    onSuccess();
    return;
  }

  onError(state.message ?? '');
}
