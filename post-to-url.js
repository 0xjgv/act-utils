const Apify = require('apify');
const { typeCheck } = require('type-check');
const requestPromise = require('request-promise');

const { log, dir } = console;

const INPUT_TYPE = `{
  twitterCrawlInput: Object | String,
  instagramCrawlInput: Object | String,
  storeName: String,
  urlToPOST: String,
}`;

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
    storeName,
    urlToPOST,
  } = input;

  log('Calling twitter-crawl...');
  const twitter = await Apify.call('juansgaitan/twitter-crawl', twitterCrawlInput);
  const twitterData = twitter.output.body;
  log(twitterData);

  log('Calling instagram-crawl...');
  const instagram = await Apify.call('juansgaitan/instagram-crawl', instagramCrawlInput);
  const instagramData = instagram.output.body;
  log(instagramData);

  const apifyClient = Apify.client;

  const store = await apifyClient.keyValueStores.getOrCreateStore({ storeName });
  apifyClient.setOptions({ storeId: store.id });

  const record = await apifyClient.keyValueStores.getRecord({ key: storeName });
  log('GETTING RECORD (if any): ', JSON.stringify(record, null, 2));

  let response = null;
  const options = {
    uri: urlToPOST,
    method: 'POST',
    'content-type': 'application/json',
    body: record,
    json: true,
  };
  try {
    response = await requestPromise(options);
  } catch (error) {
    log('Error: ', error);
  }
  log(response || 'No response back.');
  log('POST request submitted.');
  log('Finished.');
});
