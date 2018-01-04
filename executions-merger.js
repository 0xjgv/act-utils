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

// To-do: Divide requests in chunks - maxLimit 200/request.
async function getExecutionResults(execId) {
  const { items } = await getExecution(execId);
  log(`Execution Results for ${execId}: ${items.length}`);
  return items.filter(({ pageFunctionResult: result }) => !!(result));
}

function getInSequence(items, asyncFunction) {
  return items.reduce((previous, item) => (
    previous.then(accumulator => (
      asyncFunction(item).then(result => accumulator.concat(result))
    ))
  ), Promise.resolve([]));
}

async function getAllExecutionResults(execIds, inSequence = false) {
  if (inSequence) {
    log('Getting Execution Results in Sequence...');
    try {
      return getInSequence(execIds, getExecutionResults);
    } catch (error) {
      log(`Error getAllExecutionResults: ${error}`);
    }
  }
  log('Getting Execution Results in Parallel...');
  const execPromises = execIds.map(getExecutionResults);
  const allResults = await Promise.all(execPromises);
  return allResults.reduce((prev, cur) => [...prev, ...cur]);
}

Apify.main(async () => {
  const { executionIds, inSequence } = await Apify.getValue('INPUT');
  if (!executionIds) {
    throw new Error('ERROR: Missing "executionIds" attribute in INPUT');
  }
  const results = await getAllExecutionResults(executionIds, inSequence);
  log(`All Execution Results: ${results.length}`);

  await Apify.setValue('OUTPUT', results);
});
