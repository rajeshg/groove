export interface Route {
  LoaderArgs: {
    request: Request;
    params: Record<string, string>;
    context?: any;
  };
  LinksFunction: () => Array<{
    rel?: string;
    href?: string;
    crossOrigin?: string;
    type?: string;
    as?: string;
  }>;
  ErrorBoundaryProps: {
    error: unknown;
  };
}
