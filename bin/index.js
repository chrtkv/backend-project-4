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
    pageLoader(url, outputPath)
      .then((path) => console.log(path))
      .catch((error) => console.error('Error saving file:', error));
  });

program.parse();
