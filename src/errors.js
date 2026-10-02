const CLIENT_SECRET_ERROR = /\b(?:Missing|Invalid) Client Secret\b/i;
const CLIENT_SECRET_HELP = 'Chạy `monapay login --client-id ... --client-secret ...` hoặc đặt MONAPAY_CLIENT_SECRET';

function errorDetail(error) {
  const detail = error?.body?.detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || JSON.stringify(item)).join('; ');
  }
  if (typeof detail === 'string' && detail) return detail;
  return error?.message || String(error);
}

export function formatCliError(error) {
  const message = errorDetail(error);
  const detail = typeof error?.body?.detail === 'string' ? error.body.detail : '';
  if (error?.status === 401 && CLIENT_SECRET_ERROR.test(`${detail}\n${message}`)) {
    return `${message}\n${CLIENT_SECRET_HELP}`;
  }
  return message;
}
