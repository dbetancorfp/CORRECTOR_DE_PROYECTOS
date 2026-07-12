export interface Route {
  path: string;
  render: (outlet: HTMLElement) => void;
}

export class Router {
  constructor(
    private readonly routes: Route[],
    private readonly outlet: HTMLElement,
    private readonly fallback: Route,
  ) {}

  start(): void {
    window.addEventListener('popstate', () => this._resolve(window.location.pathname));
    this._resolve(window.location.pathname);
  }

  navigate(path: string): void {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    this._resolve(path);
  }

  private _resolve(path: string): void {
    const route = this.routes.find((r) => r.path === path) ?? this.fallback;
    route.render(this.outlet);
  }
}
