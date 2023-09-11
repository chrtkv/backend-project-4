import axios from 'axios';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://ru.hexlet.io';

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

const hasSameHostname = (url, base) => {
  const isRelative = url.startsWith('/');
  const fullUrl = isRelative ? new URL(url, base) : new URL(url);
  const { hostname: baseHostname } = new URL(base);
  const { hostname } = fullUrl;
  const baseParts = baseHostname.split('.').reverse();
  const urlParts = hostname.split('.').reverse();

  for (let i = 0; i < baseParts.length; i += 1) {
    if (urlParts[i] !== baseParts[i]) {
      return false;
    }
  }
  return true;
};

const extractLinks = (htmlPath) => {
  const resourceTypes = [
    { type: 'link', attr: 'href' },
    { type: 'script', attr: 'src' },
    { type: 'img', attr: 'src' },
  ];
  return fsp.readFile(htmlPath, 'utf-8')
    .then((html) => {
      const $ = cheerio.load(html);
      const links = resourceTypes
        .flatMap(({ type, attr }) => $(type).map((_, element) => $(element).attr(attr)).get())
        .filter((uri) => hasSameHostname(uri, BASE_URL));

      return links;
    });
};

// или лучше прям хтмл передавать, а не путь к нему?
const downloadResources = (url, outputDir, htmlPath) => {
  const { hostname } = new URL(url);
  const dirpath = getLocalName(url, 'dir');

  return fsp.mkdir(path.resolve(outputDir, dirpath), { recursive: true })
    .then(() => extractLinks(htmlPath))
    .then((imgSrcs) => Promise.all(imgSrcs.map((src) => {
      console.log(imgSrcs)
      const imgUrl = new URL(src, `https://${hostname}`);
      return axios.get(imgUrl, { responseType: 'arraybuffer' });
    })))
    .then((responses) => Promise.all(responses.map((response) => {
      const oldPath = response.config.url.pathname;
      const newLink = path.join(dirpath, getLocalName(`${hostname}${oldPath}`, 'img'));
      const newPath = path.resolve(outputDir, dirpath, getLocalName(`${hostname}${oldPath}`, 'img'));
      fsp.writeFile(newPath, Buffer.from(response.data, 'binary'));
      return {
        oldLink: oldPath,
        newLink,
      };
    })));
};

const replaceLinks = (htmlPath, imgSrcs) => fsp.readFile(htmlPath, 'utf-8')
  .then((html) => {
    const $ = cheerio.load(html);
    imgSrcs.forEach(({ oldLink, newSrc }) => {
      $('img').each((_, element) => {
        const $img = $(element);
        if ($img.attr('src').endsWith(oldLink)) {
          $img.attr('src', newSrc);
        }
      });
    });
    const modifiedHtml = $.html();
    return modifiedHtml;
  });

export {
  getLocalName, downloadHtml, downloadResources, replaceLinks,
};
