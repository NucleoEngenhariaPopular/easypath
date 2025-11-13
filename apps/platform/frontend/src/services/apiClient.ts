const DEFAULT_PLATFORM_BASE = "/api";
const DEFAULT_MESSAGING_GATEWAY_BASE = "http://localhost:8082";

const isBrowser = typeof window !== "undefined";

const sanitizeRelativeBase = (value: string): string => {
  const sanitized = value.replace(/\/+$/, "");
  return sanitized === "" ? "/" : sanitized;
};

const resolveBaseUrl = (envValue: string | undefined, fallback: string): string => {
  const trimmed = envValue?.trim();

  if (!trimmed) {
    return fallback;
  }

  if (trimmed.startsWith("/")) {
    return sanitizeRelativeBase(trimmed);
  }

  try {
    const url = new URL(trimmed);

    if (
      isBrowser &&
      window.location?.hostname &&
      url.hostname !== window.location.hostname &&
      !/^(localhost|127\.0\.0\.1)$/i.test(url.hostname) &&
      !url.hostname.includes(".")
    ) {
      url.hostname = window.location.hostname;
    }

    return url.toString().replace(/\/+$/, "");
  } catch {
    return trimmed.replace(/\/+$/, "") || fallback;
  }
};

const PLATFORM_BASE_URL = resolveBaseUrl(
  import.meta.env.VITE_PLATFORM_API_URL,
  DEFAULT_PLATFORM_BASE,
);

const MESSAGING_GATEWAY_BASE_URL = resolveBaseUrl(
  import.meta.env.VITE_MESSAGING_GATEWAY_URL,
  DEFAULT_MESSAGING_GATEWAY_BASE,
);

const buildUrl = (base: string, path: string): string => {
  const sanitizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${sanitizedPath}`;
};

export const getPlatformUrl = (path: string): string =>
  buildUrl(PLATFORM_BASE_URL, path);

export const getMessagingGatewayUrl = (path: string): string =>
  buildUrl(MESSAGING_GATEWAY_BASE_URL, path);

type FetchOptions = RequestInit & {
  parseJson?: boolean;
};

const handleResponse = async <T = unknown>(
  response: Response,
  parseJson: boolean,
): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Request failed with status ${response.status}: ${errorText || response.statusText}`,
    );
  }

  if (!parseJson) {
    // @ts-expect-error - caller opted out of JSON parsing
    return response;
  }

  return (await response.json()) as T;
};

export const platformFetch = async <T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> => {
  const { parseJson = true, ...fetchOptions } = options;
  const response = await fetch(getPlatformUrl(path), fetchOptions);
  return handleResponse<T>(response, parseJson);
};

export const messagingGatewayFetch = async <T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> => {
  const { parseJson = true, ...fetchOptions } = options;
  const response = await fetch(getMessagingGatewayUrl(path), fetchOptions);
  return handleResponse<T>(response, parseJson);
};

export const postJson = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const putJson = (body: unknown): RequestInit => ({
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

