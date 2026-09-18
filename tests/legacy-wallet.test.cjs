const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Run the real TypeScript modules with controlled host/provider dependencies.
function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, Error, process, ...globals, require: (id) => dependencies[id] ?? require(id) });
  return exports;
}
const wallets = load('packages/app/lib/farcaster-wallet.ts');
const farcaster = { id: 'farcaster', type: 'farcasterMiniApp' };
const base = { id: 'baseAccount', type: 'baseAccount' };
const injected = { id: 'injected', type: 'injected' };

function createLegacyConnector(inMiniApp) {
  let providerReads = 0;
  const provider = { request: () => new Promise(() => {}) };
  const { legacyFarcasterConnector } = load('packages/app/lib/farcaster-connector.ts', {
    '@farcaster/miniapp-sdk': { sdk: { isInMiniApp: async () => inMiniApp } },
    '@farcaster/miniapp-wagmi-connector': { farcasterMiniApp: () => () => ({
      ...farcaster,
      getProvider: async () => { providerReads++; return provider; },
      getAccounts: async function () { return (await this.getProvider()).request(); },
    }) },
    wagmi: { createConnector: (factory) => factory },
  });
  return { connector: legacyFarcasterConnector()({}), provider, reads: () => providerReads };
}

test('a saved Farcaster wallet cannot hang Base/browser reconnection', async () => {
  const { connector, reads } = createLegacyConnector(false);
  await assert.rejects(connector.getProvider(), /provider not found/);
  await assert.rejects(connector.getAccounts(), /provider not found/);
  assert.equal(reads(), 0, 'never contact the unsupported SDK wallet');
});

test('Farcaster keeps its existing connector ID and native provider', async () => {
  const { connector, provider } = createLegacyConnector(true);
  assert.equal(connector.id, 'farcaster');
  assert.equal(await connector.getProvider(), provider);
});

test('manual Farcaster retry preserves the native wallet identity', () => {
  const attempts = wallets.getPreferredWalletConnectors([injected, base, farcaster], { preferFarcaster: true });
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0], farcaster);
});

test('Base/browser connection excludes Farcaster and can reach Base Account', () => {
  const attempts = wallets.getPreferredWalletConnectors([farcaster, base, injected]);
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0], injected);
  assert.equal(attempts[1], base);
});

test('wallet rejection never silently switches to a different account', () => {
  const error = new Error("User rejected the request");
  assert.equal(wallets.shouldTryNextConnector(farcaster, error), false);
});

test('missing injected wallets fall through to Base Account', () => {
  const error = new Error('Provider not found');
  error.name = 'ProviderNotFoundError';
  assert.equal(wallets.shouldTryNextConnector(injected, error), true);
});

test('a missing Farcaster connector does not select an unrelated wallet', () => {
  assert.equal(wallets.getPreferredWalletConnectors([base, injected], { preferFarcaster: true }).length, 0);
});

for (const [label, response] of [
  ['deleted indexer', { ok: false }],
  ['GraphQL failure', { ok: true, json: async () => ({ errors: [{ message: 'index unavailable' }] }) }],
  ['indexing error', { ok: true, json: async () => ({ data: { _meta: { hasIndexingErrors: true } } }) }],
]) {
  test(label + ' is unavailable rather than empty successful history', async () => {
    const graph = load('packages/app/lib/miner/graph.ts', {}, { fetch: async () => response });
    assert.equal(await graph.fetchGraphData(), null);
  });
}
test('healthy history includes the indexed block for sync detection', async () => {
  const data = { _meta: { block: { number: 123 }, hasIndexingErrors: false }, miners: [], glazes: [] };
  const graph = load('packages/app/lib/miner/graph.ts', {}, {
    fetch: async (_url, options) => {
      assert.match(JSON.parse(options.body).query, /_meta/);
      return { ok: true, json: async () => ({ data }) };
    },
  });
  assert.equal(await graph.fetchGraphData(), data);
});
