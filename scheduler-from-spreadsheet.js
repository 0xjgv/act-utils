const Apify = require('apify');
const moment = require('moment');
const requestPromise = require('request-promise');

Apify.main(async () => {
  // const { sheetId } = await Apify.getValue('INPUT');
  const sheetId = '1-vpSVo1WjKheduG4YjXoOUfZ6mWaoeSekaiVRVoNV-8';

  if (!sheetId) {
    throw new Error('Invalid input, must be a JSON object with the "sheetId" field!');
  }
  const spreadSheetUrl = `
    https://spreadsheets.google.com/feeds/list/${sheetId}/od6/public/basic?alt=json
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

  const { entry } = json.feed;
  const hashtags = entry.map(({ title, content }) => {
    const hashtag = title.$t;
    const [frequency] = [content.$t.match(/\d{1,2}:\d{2}:\d{2} [apm]{2}/i) || defaultTime];
    const time = moment(frequency, 'HH:mm:ss a');
    if (time.isBetween(now, afterAnHour)) {
      console.log('Calling Extractor for', hashtag);
      Apify.call('juansgaitan/instagram-extract-posts', { hashtag });
    }
    return { hashtag, time };
  });
  console.log(hashtags);
  console.log('Done.');
});
