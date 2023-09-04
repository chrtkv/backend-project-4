import fsp from 'fs/promises';
import nock from 'nock';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import pageLoader from '../src/pageLoader.js';
import { composeLocalNames, downloadImages, replaceImgSrc } from '../src/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesPath = `${__dirname}/__fixtures__/`;
const getFixtureContent = (filename) => {
  const filepath = path.resolve(fixturesPath, filename);
  return fsp.readFile(filepath, 'utf-8');
};

let outputDir;
const url = 'https://ru.hexlet.io/courses';

beforeEach(async () => {
  outputDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});
afterEach(async () => fsp.rmdir(outputDir, { recursive: true }));

describe('utils', () => {
  it('should save data to the file', async () => {
    const expectedResult = await getFixtureContent('original.html');

    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, expectedResult);

    const resultPath = await pageLoader(url, outputDir);
    const result = await fsp.readFile(resultPath, 'utf-8');

    expect(result).toEqual(expectedResult);
  });

  it('should download images', async () => {
    const originalHtml = await getFixtureContent('original.html');

    nock('https://ru.hexlet.io')
      .get('/assets/professions/nodejs.png')
      .replyWithFile(200, path.resolve(fixturesPath, 'nodejs.png'));

    const [downloadPath] = await downloadImages(originalHtml, outputDir);
    const result = await fsp.readFile(downloadPath, 'utf-8');
    const expectedResult = await getFixtureContent('nodejs.png');

    expect(result).toEqual(expectedResult);
  });

  it('should replace links', async () => {
    const originalHtml = await getFixtureContent('original.html');
    const expectedResult = await getFixtureContent('local.html');

    const result = await replaceImgSrc(originalHtml, url);

    expect(result).toEqual(expectedResult);
  });
});
