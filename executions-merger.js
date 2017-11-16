const Apify = require('apify');

const { log } = console;

async function getExecution(executionId, limit, offset) {
  log(`Getting Execution Result: ${executionId}`);
  return Apify.client.crawlers.getExecutionResults({
    executionId,
    limit,
    offset,
  });
}

async function getExecutionResults(execId) {
  const { items } = await getExecution(execId);
  log(`Execution Results for ${execId}: ${items.length}`);
  return items.reduce((acc, { pageFunctionResult: result }) => {
    if (result) {
      acc.push(result);
    }
    return acc;
  }, []);
}

function getInSequence(items, asyncFunction) {
  return items.reduce((previous, item) => (
    previous.then(accumulator => (
      asyncFunction(item).then(result => [...accumulator, ...result])
    ))
  ), Promise.resolve([]));
}

async function getAllExecutionResults(execIds, inSequence = false) {
  if (inSequence) {
    log('Getting Execution Results in Sequence...');
    return getInSequence(execIds, getExecutionResults);
  }
  log('Getting Execution Results in Parallel...');
  const execPromises = execIds.map(getExecutionResults);
  const allResults = await Promise.all(execPromises);
  const flattenedResults = allResults.reduce((prev, cur) => [...prev, ...cur]);
  log(`All Execution Results: ${flattenedResults.length}`);

  return flattenedResults;
}

Apify.main(async () => {
  const input = await Apify.getValue('INPUT');
  log(input);
  const { executionIds, inSequence } = input;


  if (!executionIds) {
    throw new Error('ERROR: Missing "executionIds" attribute in INPUT');
  }

  const results = await getAllExecutionResults(executionIds, inSequence);
  await Apify.setValue('OUTPUT', results);
});
