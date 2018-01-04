const _ = require('lodash');
const { URL } = require('url');
const Apify = require('apify');
const { typeCheck } = require('type-check');

const { log, dir } = console;
const pretty = object => JSON.stringify(object, null, 2);

const INPUT_TYPE = `{
  baseUrl: String,
  pageFunction: String,
  waitForCssSelector: String,
  usernames: [String],
}`;

const parseUrlFor = baseUrl => input => new URL(input, baseUrl);
let parseUrl = null;

async function extractUrls(browser, username, url, pageFunc, cssSelector) {
  let page = null;
  const result = {
    username,
    postsLinks: [],
  };
  try {
    page = await browser.newPage();
    log(`New browser page for: ${url}`);

    const response = await page.goto(url, { waitUntil: 'networkidle2' });
    if (!/^2\d{2}$/.test(response.status)) {
      log('Response:', response.status);
      return Object.assign({}, result, {
        errorMessage: `${url} responded ${response.status}. Verify the username.`,
      });
    }
    await page.waitForSelector(cssSelector);

    const postsUrls = await page.evaluate((fn) => {
      const func = new Function(fn); // eslint-disable-line
      return func();
    }, pageFunc);

    const parsedPostsUrls = postsUrls.map(parseUrl);
    result.postsLinks.push(...parsedPostsUrls);
  } catch (error) {
    throw new Error(`The page ${url}, could not be loaded: ${error}`);
  } finally {
    if (page) {
      await page.close().catch(error => log(`Error closing page: (${url}): ${error}.`));
    }
  }
  return result;
}

Apify.main(async () => {
  let input = await Apify.getValue('INPUT');
  if (typeof input === 'string') {
    input = JSON.parse(input);
  }

  if (!typeCheck(INPUT_TYPE, input)) {
    log('Expected input:');
    log(INPUT_TYPE);
    log('Received input:');
    dir(input);
    throw new Error('Received invalid input');
  }

  const {
    baseUrl,
    usernames,
    pageFunction,
    waitForCssSelector,
  } = input;
  usernames.sort();
  log('Target URL:', baseUrl);
  log('Usernames:', usernames);

  // Check previous run implementation
  const { keyValueStores } = Apify.client;
  const { id: storeId } = await keyValueStores.getOrCreateStore({
    storeName: 'Link-Extractor',
  });
  Apify.client.setOptions({ storeId });

  const record = await keyValueStores.getRecord({ key: 'STATE' });
  const storeRecord = record && record.body ? record.body : {};
  const previousState = typeof storeRecord === 'string' ?
    JSON.parse(storeRecord) : storeRecord;
  log('Previous STATE:', pretty(previousState));

  const previousUsernames = (previousState.usernames || []).sort();
  const isSameCall = _.isEqual(previousUsernames, usernames);
  log('Is the same call?', isSameCall);

  const now = Date.now();
  const elapsedTime = new Date(now - (previousState.timestamp || 0));
  log(`Time elapsed since last call: ${elapsedTime.getMinutes()} minutes`);

  if (elapsedTime.getMinutes() < 15 && isSameCall) {
    log(previousState.urls);
    await Apify.setValue('OUTPUT', previousState.urls);
    log('Done.');
    return previousState;
  }

  log('Openning browser...');
  const browser = await Apify.launchPuppeteer();
  log('New browser window.');

  parseUrl = parseUrlFor(baseUrl);
  const allExtractedUrls = usernames.map((username) => {
    const { href } = parseUrl(username);
    return extractUrls(browser, username, href, pageFunction, waitForCssSelector);
  });
  const urls = await Promise.all(allExtractedUrls);

  const timestamp = Date.now();
  await keyValueStores.putRecord({
    key: 'STATE',
    body: pretty(Object.assign({}, { urls, timestamp, usernames })),
  });

  await Apify.setValue('OUTPUT', urls);
  log(JSON.stringify(urls, null, 2));

  log('Closing browser.');
  log('Done.');
  await browser.close();
  return previousState;
});
