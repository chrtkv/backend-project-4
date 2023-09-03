import axios from 'axios';
import fsp from 'fs/promises';
import path from 'path';

const composeFilename = (url) => {
  const { hostname, pathname } = new URL(url);
  const sanitizedUrl = `${hostname}${pathname}`.replaceAll(/[^a-zA-Z0-9]/g, '-');
  return `${sanitizedUrl}.html`;
};

export default (url, outputDir = process.cwd()) => {
  const filename = composeFilename(url);
  const filepath = path.resolve(outputDir, filename);

  return axios.get(url)
    .then((response) => fsp.writeFile(filepath, response.data))
    .then(() => filepath)
    .catch((error) => {
      console.error('Error saving file:', error);
    });
};
