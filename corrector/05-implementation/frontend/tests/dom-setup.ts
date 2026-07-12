import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Registers document/customElements/HTMLElement/ShadowRoot globally so
// bun test can instantiate and exercise Web Components (corrector-*)
// directly, per tdd-engineer's "use the Custom Element with
// document.createElement" convention.
//
// happy-dom also overrides fetch/Request/Response/Headers/FormData/Blob with
// its own same-origin-enforcing implementation, which breaks the backend's
// real HTTP integration tests (they fetch() a live server on localhost and
// upload files via FormData/Blob). Bun's native versions are saved and
// restored right after registration so both suites can share this one
// global preload.
const { fetch, Request, Response, Headers, FormData, Blob, File } = globalThis;
// A concrete `url` is required so router.ts can exercise history.pushState()/
// location.pathname — happy-dom's default (about:blank) has no path to push
// relative URLs against.
GlobalRegistrator.register({ url: 'http://localhost/' });
Object.assign(globalThis, { fetch, Request, Response, Headers, FormData, Blob, File });
