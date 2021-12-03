const TurndownService = require('turndown');
const cheerio = require('cheerio');
const dotenv = require('dotenv');
const axios = require('axios');
const rawGlob = require('glob');
const path = require('path');
const { promisify } = require('util');
const { URLSearchParams } = require('url');
const { mkdir, writeFile, access } = require('fs/promises');

const glob = promisify(rawGlob);
const turndownService = new TurndownService();


const DIR = getOutputDir();
const DAYS_DIR = path.join(DIR, 'days');



const BASE_URL = 'https://adventofcode.com';
const YEAR = getCliOption('year') || getCurrentYear();

dotenv.config({ path: process.cwd() });
dotenv.config({ path: path.join(DIR, '.env') });


const SESSION_TOKEN = getCliOption('session') || process.env.AOC_SESSION;
if (!SESSION_TOKEN) {
  if (getCliOption('no-session', { boolean: true })) {
    console.warn(`No input data will be loaded (--no-session)`);
  } else {
    console.error(`
      Advent of code 'session' cookie is required.
      Pass it via '--session <SESSION>' arg or AOC_SESSION env.
      Use '--no-session' to skip input data load.
    `)
    process.exit(1);
  }
} else {
  axios.defaults.headers = {
    cookie: `session=${SESSION_TOKEN}`
  };
}


async function main () {
  if (!await exists(DAYS_DIR)) {
    await mkdir(DAYS_DIR, { recursive: true });
  }

  const localDirs = await glob(path.join(DAYS_DIR, `day*`));

  const { data: daysPageHTML } = await axios.get(BASE_URL + '/' + YEAR);

  const $ = cheerio.load(daysPageHTML);
  const $days = $('main > pre.calendar > a');

  const promises = $days.map(async (i, el) => {
    const [, day] = /calendar-(day\d+)/.exec(el.attribs.class);

    const dir = path.join(DAYS_DIR, day);
    if (localDirs.some(x => x.includes(day))) {
      console.log(`Skipping day ${day} because it's already exists.`);
    } else {
      await mkdir(dir);
      console.log(`Created dir ${day}.`);
    }

    const url = BASE_URL + el.attribs.href;
    await Promise.all([
      downloadDescription(url, dir),
      downloadInputData(url, dir)
    ]);
  });

  await Promise.all(promises);

  console.log(`All done`);
}


async function downloadDescription (url, outDir, fileName = 'description.md') {
  const { data: descriptionPageHTML } = await axios.get(url);

  const $ = cheerio.load(descriptionPageHTML);
  const html = $('main > article').map((index, el) => {
    return $(el).html();
  }).toArray().join('\n');
  const mdConverted = turndownService.turndown(html);

  const filePath = path.join(outDir, fileName);
  await writeFile(filePath, mdConverted + getMdFooter(url));
}

function getMdFooter (url) {
  return `\n\n----------------------
  *[Read on adventofcode.com](${url})*\n`;
}

async function downloadInputData (baseUrl, outDir, fileName = 'input.txt') {
  if (!SESSION_TOKEN) return;

  const { data: inputText } = await axios.get(baseUrl + '/input');

  const filePath = path.join(outDir, fileName);

  await writeFile(filePath, inputText);
}

async function sendAnswer (url, answer, level = 1) {
  const qs = new URLSearchParams({
    level,
    answer,
  }).toString();

  const resp = await axios({
    url: `https://adventofcode.com/2021/day/1/answer`,
    method: 'POST',
    data: qs,
  });
  // TODO: handle response.
  // wrong answer gives 200 - parse contents?
}


function getCliOption (name, { boolean = false } = {}) {
  if (!name) return getCliInput();

  for (let i = 2; i < process.argv.length; i++){
    const arg = process.argv[i];

    if (`--${name}` === arg) {
      if (boolean) return true;
      return process.argv[i + 1];
    }
  }
}

function getCliInput () {
  for (let i = 2; i < process.argv.length; i++){
    const arg = process.argv[i];
    if (!/^--/.test(arg)) {
      if (i === 2) return arg;
      const argPre = process.argv[i-1];
      if (!/^--/.test(argPre)) {
        return arg;
      }
    }
  }
}

async function exists (fileName) {
  try {
    await access(fileName);
    return true;
  } catch (err) {
    return false;
  }
}


function getCurrentYear () { return new Date().getFullYear(); }

function getOutputDir () {
  const relative = getCliOption();
  if (!relative) {
    console.log(`Using CWD as output directory`);
    return path.resolve(process.cwd());
  }

  return path.resolve(relative);
}

main().catch(err => {
  console.error(err);
});
