const SENSITIVE_KEY_REGEX =
  /(?:password|passwd|token|secret|authorization|cookie|session|phone|address|nonce|recovery|hmackey|keysecret|creditcard|cvv)/i;

const SENSITIVE_PATH_PATTERNS = [
  {
    pattern: /\/orders\/guest\/[^\s?#]+(?:\?[^\s#]*)?/g,
    replacement: "/orders/guest/[REDACTED]",
  },
  {
    pattern: /\/order-success\/[^\s?#]+(?:\?[^\s#]*)?/g,
    replacement: "/order-success/[REDACTED]",
  },
  { pattern: /Bearer\s+[A-Za-z0-9._-]+/gi, replacement: "Bearer [REDACTED]" },
  { pattern: /Apikey\s+[A-Za-z0-9._-]+/gi, replacement: "Apikey [REDACTED]" },
];

/**
 * Normalizes sensitive guest capability and receipt paths in URLs and strings.
 */
export function normalizeSafePath(input: string): string {
  if (typeof input !== "string") return input;
  let result = input;
  for (const { pattern, replacement } of SENSITIVE_PATH_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  // Strip sensitive query parameter values
  result = result.replace(
    /([?&](?:token|secret|recovery|key|code|guest)=)[^&]+/gi,
    "$1[REDACTED]",
  );
  return result;
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_REGEX.test(key);
}

/**
 * Recursively redacts sensitive keys, tokens, PII, and paths from log payloads.
 * Protects against circular structures and hostile throwing getters.
 */
export function redactLogData(
  data: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  if (depth > 8) return "[MAX_DEPTH]";
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    return normalizeSafePath(data);
  }

  if (typeof data !== "object") {
    return data;
  }

  if (seen.has(data)) {
    return "[CIRCULAR]";
  }
  seen.add(data);

  if (Array.isArray(data)) {
    return data.map((item) => redactLogData(item, depth + 1, seen));
  }

  if (data instanceof Error) {
    const errorObj: Record<string, unknown> = {
      name: data.name,
      message: normalizeSafePath(data.message),
    };
    if (data.stack) {
      errorObj.stack = normalizeSafePath(data.stack);
    }
    // Redact any custom properties attached to the Error
    for (const key of Object.getOwnPropertyNames(data)) {
      if (key === "name" || key === "message" || key === "stack") continue;
      if (isSensitiveKey(key)) {
        errorObj[key] = "[REDACTED]";
      } else {
        try {
          const val = (data as unknown as Record<string, unknown>)[key];
          errorObj[key] = redactLogData(val, depth + 1, seen);
        } catch {
          errorObj[key] = "[UNREADABLE]";
        }
      }
    }
    return errorObj;
  }

  const result: Record<string, unknown> = {};
  const descriptors = Object.getOwnPropertyDescriptors(data);

  for (const [key, descriptor] of Object.entries(descriptors)) {
    // Safely evaluate getter if present
    let val: unknown;
    try {
      if (descriptor.get) {
        val = descriptor.get.call(data);
      } else {
        val = descriptor.value;
      }
    } catch {
      result[key] = "[UNREADABLE]";
      continue;
    }

    if (isSensitiveKey(key) && (typeof val !== "object" || val === null)) {
      result[key] = "[REDACTED]";
      continue;
    }

    result[key] = redactLogData(val, depth + 1, seen);
  }

  return result;
}
