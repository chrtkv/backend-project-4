import axios from 'axios';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import * as cheerio from 'cheerio';

// FIXME: переделать
const getLocalName = (url) => {
  const re = /[^\w]/g;
  const { hostname, pathname } = new URL(url);
  const { ext, dir, name } = path.parse(pathname);

  if (!ext) {
    const sanitizedUrl = `${hostname}${pathname}`.replaceAll(re, '-');

    return {
      dirname: `${sanitizedUrl}_files`,
      filename: `${sanitizedUrl}.html`,
    };
  }
  const pathWithoutExt = `${hostname}/${dir.slice(1)}/${name}`.replaceAll(re, '-');
  return { filename: `${pathWithoutExt}${ext}` };
};

const downloadHtml = (url, outputDir) => {
  const normalizedOutputDir = outputDir.replace(/^~/, os.homedir());
  const { filename } = getLocalName(url);
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

const extractLinks = (htmlPath, origin) => {
  const resourceTypes = [
    { type: 'link', attr: 'href' },
    { type: 'script', attr: 'src' },
    { type: 'img', attr: 'src' },
  ];
  return fsp.readFile(htmlPath, 'utf-8')
    .then((html) => {
      const $ = cheerio.load(html);
      const links = resourceTypes
        .flatMap(({ type, attr }) => $(type)
          .map((_, element) => $(element).attr(attr)).get()
          .map((link) => ({ type, attr, link })))
        .filter(({ link }) => hasSameHostname(link, origin))
        .reduce((acc, item) => {
          const normalizedUrl = new URL(item.link, origin).href;
          return { ...acc, ...{ [normalizedUrl]: { ...item, link: normalizedUrl } } };
        }, {});

      return links;
    });
};

// или лучше прям хтмл передавать, а не путь к нему?
const downloadResources = (url, outputDir, htmlPath) => {
  const { dirname } = getLocalName(url);
  const { origin } = new URL(url);
  // FIXME: как сделать иначе?
  let resourceLinks;

  return fsp.mkdir(path.resolve(outputDir, dirname), { recursive: true })
    .then(() => extractLinks(htmlPath, origin))
    .then((links) => {
      resourceLinks = links;
      return Promise.all(Object.keys(links).map((link) => axios.get(
        new URL(link),
        { responseType: 'arraybuffer' },
      )));
    })
    .then((responses) => Promise.all(responses.map((response) => {
      const oldPath = response.config.url.href;
      const { filename } = getLocalName(oldPath);
      const newLink = path.join(dirname, filename);
      const newPath = path.resolve(outputDir, dirname, filename);
      resourceLinks[oldPath].newLink = newLink;
      if (response.headers['content-type'].includes('text')) {
        return fsp.writeFile(newPath, response.data.toString());
      }
      return fsp.writeFile(newPath, Buffer.from(response.data, 'binary'));
    })))
    .then(() => resourceLinks);
};

const replaceLinks = (htmlPath, links) => fsp.readFile(htmlPath, 'utf-8')
  .then((html) => {
    const $ = cheerio.load(html);
    Object.values(links).forEach(({
      type, attr, link, newLink,
    }) => {
      $(type).each((_, element) => {
        const $el = $(element);
        if (link.endsWith($el.attr(attr))) {
          $el.attr(attr, newLink);
        }
      });
    });
    const modifiedHtml = $.html();
    return modifiedHtml;
  });

export {
  getLocalName, downloadHtml, downloadResources, replaceLinks,
};
