const Apify = require('apify');

Apify.main(async () => {
  // Pass the storeId as a command line argument,
  // and the key to the record to delete.
  const storeId = process.argv[2];
  const key = process.argv[3];
  console.log('Deleting record -', key);
  await Apify.client.keyValueStores.deleteRecord({ storeId, key });
  console.log(`Record in store - ${storeId} deleted successfully!`);
});
