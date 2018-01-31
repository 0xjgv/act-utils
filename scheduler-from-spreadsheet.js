const Apify = require('apify');
const moment = require('moment');
const requestPromise = require('request-promise');

Apify.main(async () => {
  const { spreadsheetId, forceExtraction = false } = await Apify.getValue('INPUT');

  if (!spreadsheetId) {
    throw new Error('Invalid input, must be a JSON object with the "sheetId" field!');
  }
  const spreadSheetUrl = `
    https://spreadsheets.google.com/feeds/list/${spreadsheetId}/od6/public/basic?alt=json
  `;
  console.log('Extracting info from:', spreadSheetUrl);

  let json;
  try {
    const response = await requestPromise(spreadSheetUrl);
    json = JSON.parse(response);
  } catch (err) {
    throw new Error('Error while getting spread sheet!', err);
  }
  const now = moment().startOf('hour');
  const afterAnHour = now.clone().add(1, 'hour');
  const defaultTime = moment().startOf('day');

  console.log(forceExtraction ? 'Forcing extraction.' : '');

  const { entry } = json.feed;
  const hashtags = entry.reduce((acc, { title, content }) => {
    const hashtag = title.$t;
    const [frequency] = [content.$t.match(/\d{1,2}:\d{2}:\d{2} [apm]{2}/i) || defaultTime];
    const time = moment(frequency, 'HH:mm:ss a');
    if (time.isBetween(now, afterAnHour) || forceExtraction) {
      return acc.concat({ hashtag });
    }
    return acc;
  }, []);

  if (hashtags.length) {
    console.log('Calling instagram-extract-posts for:', hashtags);
    await hashtags.reduce((prev, { hashtag }) => (
      prev.then(() => Apify.call('slippymedia/instagram-extract-posts', { hashtag }))
    ), Promise.resolve());
  }
  console.log('Done.');
});
