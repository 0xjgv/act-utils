const Apify = require('apify');
const ApifyClient = require('apify-client');
const { typeCheck } = require('type-check');
const requestPromise = require('request-promise');

const { log, dir } = console;

const INPUT_TYPE = `{
  userId: String,
  token: String,
  storeName: String
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
    userId,
    token,
    storeName,
    urlToPOST,
  } = input;
  log(userId, storeName, urlToPOST);

  const apifyClient = new ApifyClient({ userId, token });

  const store = await apifyClient.keyValueStores.getOrCreateStore({ storeName });
  apifyClient.setOptions({ storeId: store.id });

  const record = await apifyClient.keyValueStores.getRecord({ key: storeName });
  log('GETTING RECORD (if any): ', record);

  const options = {
    uri: urlToPOST,
    method: 'POST',
    'content-type': 'application/json',
    body: record,
    json: true,
  };
  const response = await requestPromise(options);
  log(response);
});
