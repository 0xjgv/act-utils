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
  const input = await Apify.getValue('INPUT');
  log(input);

  const { url } = input;
  if (!url) throw Error('No input URL');
  log('Input URL:', url);

  const protocol = 'http://';
  const parsedUrl = `${/http/.test(url) ? '' : protocol}${url}`;

  const { host, origin } = new URL(parsedUrl);
  log('URL host:', host);
  log('URL origin:', origin);

  const output = { origin, host };

  let shouldTryReverse = true;
  try {
    Object.assign(output, {
      hostIp: await dnsLookup(host),
      hostResolve: await dnsResolve(host),
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
