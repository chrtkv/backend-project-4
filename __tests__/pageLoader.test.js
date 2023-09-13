import fsp from 'fs/promises';
import nock from 'nock';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import prettier from 'prettier';

import {
  downloadHtml, downloadResources, replaceLinks,
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
      .reply(200, expectedResult, { 'Content-Type': 'text/html' });

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

  it('should download resources', async () => {
    try {
      // TODO: наверное, мжно сюда передавать путь к ресурсу вместо того, чтобы захардкоживать
      nock('https://ru.hexlet.io')
        .get('/assets/professions/nodejs.png')
        .replyWithFile(200, path.resolve(fixturesPath, 'nodejs.png'), { 'Content-Type': 'image/png' });

      nock('https://ru.hexlet.io')
        .get('/assets/application.css')
        .reply(200, await getFixtureContent('application.css'), { 'Content-Type': 'text/css' });

      nock('https://ru.hexlet.io')
        .get('/packs/js/runtime.js')
        .reply(200, await getFixtureContent('runtime.js.txt'), { 'Content-Type': 'text/javascript' });

      nock('https://ru.hexlet.io')
        .get('/courses')
        .reply(200, await getFixtureContent('original.html'), { 'Content-Type': 'text/html' });

      const originalHtmlPath = path.resolve(fixturesPath, 'original.html');
      const links = await downloadResources(url, outputDir, originalHtmlPath);

      const { newLink: pngLink } = links.find((link) => link.oldLink.endsWith('/assets/professions/nodejs.png'));
      const { newLink: cssLink } = links.find((link) => link.oldLink.endsWith('/assets/application.css'));
      const { newLink: jsLink } = links.find((link) => link.oldLink.endsWith('/packs/js/runtime.js'));
      const pngFilePath = path.resolve(outputDir, pngLink);
      const cssFilePath = path.resolve(outputDir, cssLink);
      const jsFilePath = path.resolve(outputDir, jsLink);

      await Promise.all([
        fsp.access(pngFilePath, fsp.constants.F_OK),
        fsp.access(cssFilePath, fsp.constants.F_OK),
        fsp.access(jsFilePath, fsp.constants.F_OK),
      ]);

      const png = await fsp.readFile(pngFilePath, 'utf-8');
      const css = await fsp.readFile(cssFilePath, 'utf-8');
      const js = await fsp.readFile(jsFilePath, 'utf-8');

      const expectedPng = await getFixtureContent('nodejs.png');
      const expectedCss = await getFixtureContent('application.css');
      const expectedJs = await getFixtureContent('runtime.js.txt');

      expect(png).toEqual(expectedPng);
      expect(css).toEqual(expectedCss);
      expect(js).toEqual(expectedJs);
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

  it('should replace links', async () => {
    nock('https://ru.hexlet.io')
      .get('/assets/professions/nodejs.png')
      .replyWithFile(200, path.resolve(fixturesPath, 'nodejs.png'));

    const originalHtmlPath = path.resolve(fixturesPath, 'original.html');
    const links = await downloadResources(url, outputDir, originalHtmlPath);
    const result = prettier.format(await replaceLinks(originalHtmlPath, links), { parser: 'html' });
    const expectedResult = prettier.format(await getFixtureContent('local.html'), { parser: 'html' });

    expect(result).toEqual(expectedResult);
  });
});
