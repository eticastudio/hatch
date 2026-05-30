/**
 * Echo the current pathname into a request header so server components can
 * read it via `headers().get('x-pathname')`. Used by SiteHeader for the
 * active-link state without lifting pathname through every page.
 */
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set('x-pathname', req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|hatch-blocks.js|hatch-blocks.css).*)'],
};
