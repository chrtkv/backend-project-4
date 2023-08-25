#!/usr/bin/env node
import { program } from 'commander';

import pageLoader from '../src/pageLoader.js';

program
  .version('0.1.0')
  .description('Page loader utility')
  .arguments('<url>')
  .option('-f, --output [dir]', 'output dir (default: "/home/user/current-dir")')
  .action((url) => {
    const { output: outputPath } = program.opts();
    const path = pageLoader(url, outputPath);
    console.log(path);
  });

program.parse();
