import TurndownService from 'turndown';
import cheerio from 'cheerio';
import axios from 'axios';
import oGlob from 'glob';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const glob = promisify(oGlob);

const  turndownService = new TurndownService();

const exists = util.promisify(fs.exists);
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);

const BASE_URL = 'https://adventofcode.com';
const YEAR = '2019';



(async () => {

  if (!await exists('days')) {
    await mkdir('days');
  }

  const localDirs = await glob('days/day*');

  const {data: daysPageHTML} = await axios.get(BASE_URL + '/' + YEAR);

  const $ = cheerio.load(daysPageHTML);


  const $days = $('main > pre.calendar > a');
  const promises = $days.map(async (i, el) => {
    const [, day] = /calendar\-(day\d+)/.exec(el.attribs.class);

    const dir = path.join(`days`, day);
    if (localDirs.some(x => x.includes(day))) {
      console.log(`Skipping ${day} because it's already exists.`);
      // return; // TODO: uncomment that
    } else {
      await mkdir(dir);
    }



    await Promise.all([
      downloadDescription(BASE_URL + el.attribs.href, dir),
      downloadInputData(BASE_URL + el.attribs.href + '/input', dir)
    ]);


  });

  await Promise.all(promises);
})();

async function downloadDescription (url, dir) {

  const { data: descriptionPageHTML } = await axios.get(url);
  const $ = cheerio.load(descriptionPageHTML);

  const filePath = path.join(dir, 'description.md');

  const markdown = turndownService.turndown($('main > article').html());
  await writeFile(filePath, markdown);

}

async function downloadInputData (url, dir) {
  const { data: inputText } = await axios.get(url);

  const filePath = path.join(dir, 'input.txt');

  await writeFile(filePath, inputText);
}
