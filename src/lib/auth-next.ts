export function safeNext(value?: string) {
  return value && /^\/dashboard(?:[/?]|$)/.test(value) && !value.includes("\\")
    ? value
    : "/dashboard";
}
