const Apify = require('apify');

const pretty = object => JSON.stringify(object, null, 2);

Apify.main(async () => {
  const input = await Apify.getValue('INPUT');
  console.log('My input:');
  console.dir(input);

  if (!input) {
    throw new Error('Input and input.data are required!');
  }
  const {
    _id: executionId,
    actId: crawlerId,
  } = input;

  const { keyValueStores, crawlers } = Apify.client;
  const storeName = crawlerId;
  const storeRequest = keyValueStores.getOrCreateStore({ storeName });
  const crawlerRequest = crawlers.getLastExecutionResults({ executionId, crawlerId });
  const [{ id: storeId }, { items }] = await Promise.all([storeRequest, crawlerRequest]);
  Apify.client.setOptions({ storeId });

  const record = await keyValueStores.getRecord({ key: 'STATE' });
  const storeRecord = record && record.body ? record.body : [];
  const previousState = typeof storeRecord === 'string' ? JSON.parse(storeRecord) : storeRecord;
  console.log('Previous STATE results:', previousState.length);

  const results = items.reduce((acc, { pageFunctionResult }) => (
    acc.concat(pageFunctionResult)
  ), []).filter((cur, i, arr) => cur && arr.indexOf(cur) === i);
  console.log('Last execution results:', results.length);

  const nextState = previousState.concat(results);

  console.log('Saving into keyValueStore:', storeName);
  await keyValueStores.putRecord({
    key: 'STATE',
    body: pretty(nextState),
  });
});
