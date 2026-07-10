import './components/corrector-login-form';

// No client-side router yet — only the Login screen exists. On success this
// hands off to a full navigation; /admin and /profesor gain real screens as
// later slices land.
document.addEventListener('corrector:login-succeeded', (e) => {
  const { redirectTo } = (e as CustomEvent<{ redirectTo: string }>).detail;
  window.location.href = redirectTo;
});
