import fsp from 'fs/promises';
import nock from 'nock';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import prettier from 'prettier';

import {
  downloadHtml, downloadImages, replaceImgSrcs,
} from '../src/utils.js';

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
  it('should download data', async () => {
    const expectedResult = await getFixtureContent('original.html');
    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, expectedResult);

    const resultPath = await downloadHtml(url, outputDir);
    const result = await fsp.readFile(resultPath, 'utf-8');

    expect(result).toEqual(expectedResult);
  });

  it('should have correct name', async () => {
    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200);

    const resultPath = await downloadHtml(url, outputDir);
    const expectedResult = path.resolve(outputDir, 'ru-hexlet-io-courses.html');

    expect(resultPath).toEqual(expectedResult);
  });

  it('should download images', async () => {
    nock('https://ru.hexlet.io')
      .get('/assets/professions/nodejs.png')
      .replyWithFile(200, path.resolve(fixturesPath, 'nodejs.png'));

    const originalHtmlPath = path.resolve(fixturesPath, 'original.html');

    const [{ newSrc: downloadPath }] = await downloadImages(url, outputDir, originalHtmlPath);
    const resultFilePath = path.resolve(outputDir, downloadPath);
    await fsp.access(resultFilePath, fsp.constants.F_OK);
    const result = await fsp.readFile(resultFilePath, 'utf-8'); // норм ли для картинки?
    const expectedResult = await getFixtureContent('nodejs.png');

    expect(result).toEqual(expectedResult);
  });

  it('should replace links', async () => {
    nock('https://ru.hexlet.io')
      .get('/assets/professions/nodejs.png')
      .replyWithFile(200, path.resolve(fixturesPath, 'nodejs.png'));

    const originalHtmlPath = path.resolve(fixturesPath, 'original.html');
    const imgSrcs = await downloadImages(url, outputDir, originalHtmlPath);
    const result = prettier.format(await replaceImgSrcs(originalHtmlPath, imgSrcs), { parser: 'html' });
    const expectedResult = prettier.format(await getFixtureContent('local.html'), { parser: 'html' });

    expect(result).toEqual(expectedResult);
  });
});
