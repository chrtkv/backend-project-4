import fsp from 'fs/promises';
import path from 'path';
import os from 'os';

import {
  getLocalName, downloadHtml, downloadImages, replaceImgSrcs,
} from './utils.js';

export default (url, outputDir = process.cwd()) => {
  const normalizedOutputDir = outputDir.replace(/^~/, os.homedir());
  const filename = getLocalName(url, 'html');
  const filepath = path.resolve(normalizedOutputDir, filename);

  return downloadHtml(url, outputDir)
    .then((htmlPath) => downloadImages(url, normalizedOutputDir, htmlPath))
    .then((imgPaths) => replaceImgSrcs(filepath, imgPaths))
    .then((html) => fsp.writeFile(filepath, html))
    .then(() => filepath);
};
