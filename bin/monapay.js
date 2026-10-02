#!/usr/bin/env node

import { main } from '../src/cli.js';
import { formatCliError } from '../src/errors.js';

main(process.argv.slice(2)).catch((error) => {
  console.error(`Lỗi: ${formatCliError(error)}`);
  process.exitCode = 1;
});
