import fsp from 'fs/promises';
import nock from 'nock';
import os from 'os';
import path from 'path';

import pageLoader from '../src/pageLoader.js';

let outputDir;
beforeEach(async () => {
  outputDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});
afterEach(async () => fsp.rmdir(outputDir, { recursive: true }));

nock('https://ru.hexlet.io')
  .get('/courses')
  .reply(200, 'Hexlet Courses');

describe('pageLoader', () => {
  it('should save data to the file', async () => {
    const resultPath = await pageLoader('https://ru.hexlet.io/courses', outputDir);
    const result = await fsp.readFile(resultPath, 'utf-8');

    expect(result).toEqual('Hexlet Courses');
  });
});
