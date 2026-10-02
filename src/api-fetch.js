const TWO_FACTOR_PATH = /\/client\/(?:login-2fa(?:\/|$)|2fa(?:\/|$))/;

function isRequest(input) {
  return typeof Request !== 'undefined' && input instanceof Request;
}

function pathnameOf(input) {
  try {
    return new URL(isRequest(input) ? input.url : input).pathname;
  } catch {
    return String(input);
  }
}

/**
 * Add the client secret to authenticated write requests made by the CLI.
 * Authentication and 2FA-login requests deliberately remain untouched.
 */
export function withClientSecret(fetchImpl, clientSecret) {
  if (typeof fetchImpl !== 'function') throw new TypeError('Môi trường cần fetch built-in (Node.js >=18)');

  return async function monaPayFetch(input, init = {}) {
    const method = String(init.method || (isRequest(input) ? input.method : 'GET')).toUpperCase();
    const headers = new Headers(init.headers || (isRequest(input) ? input.headers : undefined));
    const authorization = headers.get('Authorization') || '';

    if (
      method !== 'GET'
      && clientSecret
      && /^Bearer\s+\S+/i.test(authorization)
      && !TWO_FACTOR_PATH.test(pathnameOf(input))
    ) {
      headers.set('X-Client-Secret', clientSecret);
    }

    return fetchImpl(input, { ...init, method, headers });
  };
}
