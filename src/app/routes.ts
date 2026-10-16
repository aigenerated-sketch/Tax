import routesJson from './routes.json';

export type RouteId =
  | 'calculator'
  | 'how-it-works'
  | 'salary-sacrifice-vs-sipp'
  | 'childcare-threshold'
  | 'methodology'
  | 'privacy'
  | 'disclaimer';

export interface RouteDef {
  path: string;
  id: RouteId;
  nav: string;
  title: string;
  description: string;
}

export const ROUTES = routesJson as RouteDef[];

const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');

/** Build an href that respects the deployment base path. */
export const href = (path: string) => `${base}${path === '/' ? '/' : path}`;

export function routeFromPathname(pathname: string): RouteDef {
  let p = pathname;
  if (base && p.startsWith(base)) p = p.slice(base.length);
  p = p.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
  return ROUTES.find((r) => r.path === p) ?? (ROUTES[0] as RouteDef);
}
