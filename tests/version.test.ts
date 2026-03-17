import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { SERVER_VERSION } from '../src/index.js';

describe('server version', () => {
  it('matches the version declared in package.json', () => {
    const packageMetadata = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8')
    ) as { version: string };

    expect(SERVER_VERSION).toBe(packageMetadata.version);
  });
});
