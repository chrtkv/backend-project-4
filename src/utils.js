import axios from 'axios';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import * as cheerio from 'cheerio';

// FIXME: переделать или вообще убрать эту функцию
const getLocalName = (url, resourceType) => {
  const re = /[^\w]/g;

  if (resourceType === 'img') {
    const { ext, dir, name } = path.parse(url);
    return `${dir}/${name}`.replaceAll(re, '-') + ext;
  }

  const { hostname, pathname } = new URL(url);
  const sanitizedUrl = `${hostname}${pathname}`.replaceAll(re, '-');

  if (resourceType === 'html') {
    return `${sanitizedUrl}.html`;
  }

  if (resourceType === 'dir') {
    return `${sanitizedUrl}_files`;
  }
};

const downloadHtml = (url, outputDir) => {
  const normalizedOutputDir = outputDir.replace(/^~/, os.homedir());
  const filename = getLocalName(url, 'html');
  const filepath = path.resolve(normalizedOutputDir, filename);

  return axios.get(url)
    .then((response) => fsp.writeFile(filepath, response.data))
    .then(() => filepath);
};

const extractSrcs = (htmlPath) => fsp.readFile(htmlPath, 'utf-8')
  .then((html) => {
    const $ = cheerio.load(html);
    const imgSrcs = $('img').map((_, element) => $(element).attr('src')).get();

    return imgSrcs;
  });

// или лучше прям хтмл передавать, а не путь к нему?
const downloadImages = (url, outputDir, htmlPath) => {
  const { hostname } = new URL(url);
  const dirpath = getLocalName(url, 'dir');

  return fsp.mkdir(path.resolve(outputDir, dirpath), { recursive: true })
    .then(() => extractSrcs(htmlPath))
    .then((imgSrcs) => Promise.all(imgSrcs.map((src) => {
      const imgUrl = new URL(src, `https://${hostname}`);
      return axios.get(imgUrl, { responseType: 'arraybuffer' });
    })))
    .then((responses) => Promise.all(responses.map((response) => {
      const oldPath = response.config.url.pathname;
      const newSrc = path.join(dirpath, getLocalName(`${hostname}${oldPath}`, 'img'));
      const newPath = path.resolve(outputDir, dirpath, getLocalName(`${hostname}${oldPath}`, 'img'));
      fsp.writeFile(newPath, Buffer.from(response.data, 'binary'));
      return {
        oldSrc: oldPath,
        newSrc,
      };
    })));
};

const replaceImgSrcs = (htmlPath, imgSrcs) => fsp.readFile(htmlPath, 'utf-8')
  .then((html) => {
    const $ = cheerio.load(html);
    imgSrcs.forEach(({ oldSrc, newSrc }) => {
      $('img').each((_, element) => {
        const $img = $(element);
        if ($img.attr('src').endsWith(oldSrc)) {
          $img.attr('src', newSrc);
        }
      });
    });
    const modifiedHtml = $.html();
    return modifiedHtml;
  });

export {
  getLocalName, downloadHtml, downloadImages, replaceImgSrcs,
};
