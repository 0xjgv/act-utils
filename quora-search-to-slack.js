const Apify = require('apify');
const Slack = require('slack');

function queryPage(page) {
  return async (search) => {
    const formatSearch = search.replace(/ /g, '-');
    const url = `https://quora.com/topic/${formatSearch}`;
    console.log(`Opening URL: ${url}`);
    await page.goto(url);
    const questions = await page.$$eval('.paged_list_wrapper > *', results => (
      results.map((el) => {
        const element = el.querySelector('.question_link');
        return `- <${element.href}|${element.innerText}>`;
      }).filter((cur, i, arr) => arr.indexOf(cur) === i).join('\n')
    ));
    return questions ? { title: `search: ${formatSearch}`, text: questions } : '';
  };
}

function getInSequence(items, asyncFunction) {
  return items.reduce((previous, item) => (
    previous.then(accumulator => (
      asyncFunction(item).then((result) => {
        if (!result) {
          return accumulator;
        }
        return accumulator.concat(result);
      })
    ))
  ), Promise.resolve([]));
}

Apify.main(async () => {
  const input = await Apify.getValue('INPUT');
  console.log('My input:');
  console.dir(input);

  if (!input || !input.searchStrings) {
    throw new Error('Invalid input, must be a JSON object with the "searchStrings" field!');
  }

  const { searchStrings } = input;
  console.log('Launching Puppeteer...');
  const browser = await Apify.launchPuppeteer();
  const page = await browser.newPage();
  const querySearch = queryPage(page);
  const results = await getInSequence(searchStrings, querySearch, page);

  if (results.length) {
    const bot = new Slack({ token: process.env.SLACK_BOT_TOKEN });
    await bot.chat.postMessage({
      channel: '#support',
      response_type: 'in_channel',
      text: 'Interesting Quora questions:',
      attachments: results,
    });
  }

  console.log('My output:');
  console.dir(results);
  await Apify.setValue('OUTPUT', results);
});
