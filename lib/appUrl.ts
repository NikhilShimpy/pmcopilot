const LOCAL_DEV_APP_URL = 'http://localhost:3000';

function normalizeAppUrl(rawValue: string | undefined): string | null {
  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function getPublicAppUrl(): string {
  const explicitAppUrl =
    normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeAppUrl(process.env.APP_URL);

  if (explicitAppUrl) {
    return explicitAppUrl;
  }

  const vercelUrl =
    normalizeAppUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeAppUrl(process.env.VERCEL_URL);

  if (vercelUrl) {
    return vercelUrl;
  }

  return LOCAL_DEV_APP_URL;
}

export function getRequestOrigin(request: Request): string {
  try {
    return new URL(request.url).origin;
  } catch {
    return getPublicAppUrl();
  }
}

export function getAuthCallbackUrlFromRequest(request: Request): string {
  return `${getRequestOrigin(request)}/auth/callback`;
}
