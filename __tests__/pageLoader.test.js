import nock from 'nock';
import { readFile } from 'fs/promises';
import pageLoader from '../src/pageLoader.js';

nock('https://ru.hexlet.io')
  .get('/courses')
  .reply(200, { message: 'Hexlet Courses' });

describe('pageLoader', () => {
  it('should save data to the file', async () => {
    const resultPath = await pageLoader('https://ru.hexlet.io/courses');
    const result = await readFile(resultPath, 'utf-8');

    expect(result).toEqual('Hexlet Courses');
  });
});
