const { URL } = require('url');
const Apify = require('apify');
const { typeCheck } = require('type-check');

const { log, dir } = console;

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
      const func = new Function(fn);
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
  log(input);
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
  log(baseUrl, usernames);

  log('Openning browser...');
  const browser = await Apify.launchPuppeteer();
  log('New browser window.');

  parseUrl = parseUrlFor(baseUrl);
  const allExtractedUrls = usernames.map((username) => {
    const { href } = parseUrl(username);
    return extractUrls(browser, username, href, pageFunction, waitForCssSelector);
  });
  const urls = await Promise.all(allExtractedUrls);
  await Apify.setValue('OUTPUT', urls);
  log(JSON.stringify(urls, null, 2));

  log('Closing browser.');
  await browser.close();
});
