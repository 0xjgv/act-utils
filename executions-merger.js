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

async function getAllExecutionResults(execIds) {
  const execPromises = execIds.map(getExecutionResults);
  const allResults = await Promise.all(execPromises);
  const flattenedResults = allResults.reduce((prev, cur) => [...prev, ...cur]);
  log(`All Execution Results: ${flattenedResults.length}`);
  return flattenedResults;
}

Apify.main(async () => {
  const { executionIds } = await Apify.getValue('INPUT');

  if (!executionIds) {
    throw new Error('ERROR: Missing "executionIds" attribute in INPUT');
  }

  const results = await getAllExecutionResults(executionIds);
  await Apify.setValue('OUTPUT', results);
});
