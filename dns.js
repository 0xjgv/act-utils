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
  const { url } = await Apify.getValue('INPUT');
  if (!url) throw Error('No input URL');
  log(url);

  const protocol = 'http://';
  const parsedUrl = `${/http/.test(url) ? '' : protocol}${url}`;
  log(parsedUrl);

  const urlObject = new URL(parsedUrl);
  log(urlObject, urlObject.host);

  const output = { origin: urlObject.origin };

  let shouldTryReverse = true;
  try {
    Object.assign(output, {
      hostIp: await dnsLookup(urlObject.host),
      hostResolve: await dnsResolve(urlObject.host),
    });
  } catch (error) {
    log(error.message);
    Object.assign(output, { error: error.message });
    shouldTryReverse = false;
  }

  if (shouldTryReverse) {
    try {
      Object.assign(output, {
        hostReverse: await dnsReverse(output.hostIp.address),
      });
    } catch (error) {
      log('Error DNS Reverse', error.message);
    }
  }

  log('Output result:');
  dir(output);
  await Apify.setValue('OUTPUT', output);
});
