const Apify = require('apify');

Apify.main(async () => {
  // Pass the storeId as a command line argument.
  const storeId = process.argv[2];
  console.log('Deleting store -', storeId);
  await Apify.client.keyValueStores.deleteStore({ storeId });
  console.log(`Store ${storeId} deleted successfully!`);
});
