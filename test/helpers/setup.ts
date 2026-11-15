import { afterEach } from 'vitest';
import { cleanupAll } from './fixture.js';

// Every test works in its own temp folders; remove them after each test.
afterEach(() => cleanupAll());
