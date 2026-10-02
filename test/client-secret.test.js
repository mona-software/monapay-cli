import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { withClientSecret } from '../src/api-fetch.js';
import { main } from '../src/cli.js';
import { formatCliError } from '../src/errors.js';

function recorder() {
  const calls = [];
  return {
    calls,
    fetch: async (input, init) => {
      calls.push({ input, ...init, headers: new Headers(init.headers) });
      return { ok: true };
    },
  };
}

test('X-Client-Secret chỉ được thêm cho method ghi có Bearer', async () => {
  const mock = recorder();
  const fetch = withClientSecret(mock.fetch, 'env-secret');

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    await fetch('https://api.example.test/api/v1/resource', {
      method,
      headers: { Authorization: 'Bearer access-token' },
    });
  }
  await fetch('https://api.example.test/api/v1/resource', {
    method: 'GET',
    headers: { Authorization: 'Bearer access-token' },
  });
  await fetch('https://api.example.test/api/v1/oauth/token', { method: 'POST' });

  assert.deepEqual(
    mock.calls.map((call) => call.headers.get('X-Client-Secret')),
    ['env-secret', 'env-secret', 'env-secret', 'env-secret', null, null],
  );
});

test('request đăng nhập 2FA không nhận X-Client-Secret', async () => {
  const mock = recorder();
  const fetch = withClientSecret(mock.fetch, 'stored-secret');

  await fetch('https://api.example.test/api/v1/client/login-2fa', {
    method: 'POST', headers: { Authorization: 'Bearer temporary-token' },
  });
  await fetch('https://api.example.test/api/v1/client/2fa/verify', {
    method: 'POST', headers: { Authorization: 'Bearer temporary-token' },
  });

  assert.equal(mock.calls[0].headers.has('X-Client-Secret'), false);
  assert.equal(mock.calls[1].headers.has('X-Client-Secret'), false);
});

test('không thêm header khi không có client secret', async () => {
  const mock = recorder();
  const fetch = withClientSecret(mock.fetch, undefined);
  await fetch('https://api.example.test/api/v1/resource', {
    method: 'POST', headers: { Authorization: 'Bearer access-token' },
  });
  assert.equal(mock.calls[0].headers.has('X-Client-Secret'), false);
});

test('CLI nối mock fetch với secret ưu tiên từ env', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'monapay-client-secret-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const calls = [];
  const fetch = async (input, init) => {
    const path = new URL(input).pathname;
    calls.push({ path, method: init.method, headers: new Headers(init.headers) });
    const data = path === '/api/v1/oauth/token'
      ? { access_token: 'access-token', expires_in: 3600 }
      : { id: 'webhook-id' };
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data }),
    };
  };

  await main(['webhooks', 'create', '--name', 'Shop', '--url', 'https://shop.test/hook', '--json'], {
    env: {
      MONAPAY_CONFIG_DIR: directory,
      MONAPAY_BASE_URL: 'https://api.example.test',
      MONAPAY_CLIENT_ID: 'client-id',
      MONAPAY_CLIENT_SECRET: 'env-secret',
    },
    fetch,
    stdout: { write() {} },
  });

  assert.equal(calls[0].path, '/api/v1/oauth/token');
  assert.equal(calls[0].headers.has('Authorization'), false);
  assert.equal(calls[0].headers.has('X-Client-Secret'), false);
  assert.equal(calls[1].path, '/api/v1/client-webhooks');
  assert.equal(calls[1].headers.get('Authorization'), 'Bearer access-token');
  assert.equal(calls[1].headers.get('X-Client-Secret'), 'env-secret');
});

test('lỗi 401 client secret có hướng dẫn đăng nhập lại', () => {
  const message = formatCliError({
    status: 401,
    message: 'Unauthorized',
    body: { detail: 'Invalid Client Secret' },
  });
  assert.match(message, /Invalid Client Secret/);
  assert.match(message, /monapay login --client-id \.\.\. --client-secret \.\.\./);
  assert.match(message, /MONAPAY_CLIENT_SECRET/);
  assert.equal(formatCliError({ status: 401, message: 'Token expired' }), 'Token expired');
});
