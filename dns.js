const Apify = require('apify');
const { URL } = require('url');
const { promisify } = require('util');
const { lookup, resolveAny, reverse } = require('dns');

const { log, dir } = console;
const [dnsLookup, dnsResolve, dnsReverse] = [
  lookup,
  resolveAny,
  reverse,
].map(promisify);

Apify.main(async () => {
  // Get input of your act
  const { dns } = await Apify.getValue('INPUT');
  log(dns);

  const url = new URL(dns);
  log(url);

  const output = {};
  try {
    Object.assign(output, {
      hostIp: await dnsLookup(url),
      hostResolve: await dnsResolve(url),
    });
  } catch (error) {
    log(error.message);
    Object.assign(output, { error: error.message });
  }

  try {
    Object.assign(output, {
      hostReverse: await dnsReverse(output.hostIp.address),
    });
  } catch (error) {
    log('Error DNS Reverse', error.message);
  }

  log('My output:');
  dir(output);
  await Apify.setValue('OUTPUT', output);
});
