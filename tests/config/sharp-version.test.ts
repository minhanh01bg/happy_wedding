import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("Sharp runtime", () => {
  it("dung cung mot ban Sharp cho app va Next de tranh xung dot libvips", () => {
    const appSharp = require("sharp") as {
      versions: { sharp: string; vips: string };
    };
    const nextSharp = require(
      require.resolve("sharp", { paths: [require.resolve("next")] }),
    ) as typeof appSharp;

    expect(appSharp.versions).toMatchObject({
      sharp: nextSharp.versions.sharp,
      vips: nextSharp.versions.vips,
    });
  });
});
