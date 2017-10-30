const Apify = require('apify');
const cheerio = require('cheerio');
const { typeCheck } = require('type-check');
const requestPromise = require('request-promise');

const { log, dir } = console;

const INPUT_TYPE = `{
  twitterCrawlInput: Object | String,
  instagramCrawlInput: Object | String,
  urlToPOST: String,
}`;

const [twitterUsernames, instagramUsernames] = [[], []];

const spreadSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhgPciKMOPGLSku3Q291UvoSq91TER9DRDXsgb-hfD2S4pld3KcMsE-95RBwRLv8oWOfrRs-7Ner7I/pubhtml?gid=469540797&single=true';


Apify.main(async () => {
  const input = await Apify.getValue('INPUT');
  if (!typeCheck(INPUT_TYPE, input)) {
    log('Expected input:');
    log(INPUT_TYPE);
    log('Received input:');
    dir(input);
    throw new Error('Received invalid input');
  }
  const {
    twitterCrawlInput,
    instagramCrawlInput,
    urlToPOST,
  } = input;

  let response = null;
  try {
    response = await requestPromise(spreadSheetUrl);
  } catch (error) {
    log('Error while requesting spreadsheet', error);
  }

  const $ = cheerio.load(response);
  const table = $('table tbody');
  const cells = table.find('td');
  cells.each((i, el) => {
    const cell = $(el).text();
    if (cell && i % 2 === 0) {
      instagramUsernames.push(cell);
    } else if (cell) {
      twitterUsernames.push(cell);
    }
  });

  let copyExtractActInput = {};
  [instagramUsernames, twitterUsernames].forEach((arr) => {
    const target = arr.shift();
    if (target === 'Twitter') {
      copyExtractActInput = Object.assign({}, twitterCrawlInput.extractActInput);
      Object.assign(copyExtractActInput, { usernames: arr });
      Object.assign(twitterCrawlInput.extractActInput, copyExtractActInput);
    } else {
      copyExtractActInput = Object.assign({}, instagramCrawlInput.extractActInput);
      Object.assign(copyExtractActInput, { usernames: arr });
      Object.assign(instagramCrawlInput.extractActInput, copyExtractActInput);
    }
  });
  log('Act inputs: \n', twitterCrawlInput, instagramCrawlInput);

  log('Calling twitter-crawl...');
  const twitter = await Apify.call('juansgaitan/twitter-crawl', twitterCrawlInput);
  log('Getting Tweets Data...');
  const twitterData = twitter.output.body;
  log(twitterData);

  log('Calling instagram-crawl...');
  const instagram = await Apify.call('juansgaitan/instagram-crawl', instagramCrawlInput);
  log('Getting Instagram posts Data...');
  const instagramData = instagram.output.body;
  log(instagramData);

  const result = {
    posts: [...twitterData.posts, ...instagramData.posts],
  };
  log('Final Record: ', result);

  log('SETTING OUTPUT RESULT...');
  await Apify.setValue('OUTPUT', result);

  const options = {
    uri: urlToPOST,
    method: 'POST',
    'content-type': 'application/json',
    body: result,
    json: true,
  };

  try {
    await requestPromise(options);
  } catch (error) {
    log('Error: ', error);
  }
  log('POST request submitted.');
  log('Finished.');
});
