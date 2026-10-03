export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Fail closed before serving requests when production secrets/origins are invalid.
    await import("@/config/env");
    const { prismaReady } = await import("@/server/db/prisma");
    await prismaReady;
  }
}
