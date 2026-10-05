# monapay CLI

A command-line tool for MONA Pay: manage API keys, list bank transactions, create dynamic VietQR codes, manage webhooks and verify webhooks locally from the terminal.

The CLI runs on Node.js 18 or later. Its only runtime dependency is the official Node SDK, `@monapay/node`.

## Install

```bash
npm install -g @monapay/cli
```

Or run it without installing:

```bash
npx @monapay/cli help
```

## Quick start

```bash
monapay login --client-id "$MONAPAY_CLIENT_ID" --client-secret "$MONAPAY_CLIENT_SECRET"
monapay me
```

`login` reads `--client-id` / `--client-secret` first, then `MONAPAY_CLIENT_ID` / `MONAPAY_CLIENT_SECRET`, and prompts for anything still missing. The SDK exchanges the pair for an OAuth token and caches it until it expires.

The legacy `--username` / `--password` flags (or `MONAPAY_USERNAME` / `MONAPAY_PASSWORD`) still work. Client credentials are recommended, because accounts with 2FA enabled cannot log in with a password.

## Usage

```text
monapay login [--client-id ID] [--client-secret SECRET]
monapay login [--username USER] [--password PASS] [--secret SECRET]   # legacy
monapay me [--json]
monapay keys generate [--name NAME] [--json]
monapay keys list [--json]
monapay keys revoke <key-id> [--json]
monapay tx list --va <VA-number> [--limit 100] [--since-id ID] [--json]
monapay qr create --order ID --amount VND [--desc TEXT] [--out FILE]
monapay webhooks list [--json]
monapay webhooks create --name NAME --url URL [--auth HMAC_SHA256] [--secret SECRET]
monapay webhooks test [--url URL] [--secret SECRET] [--json]
monapay webhooks logs [--status success|failed] [--from YYYY-MM-DD] [--to YYYY-MM-DD]
monapay webhooks stats [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--json]
monapay webhook listen [--port 3939] [--secret SECRET] [--forward URL]
```

### Keys, transactions and webhooks

```bash
monapay keys generate --name "Local machine"
monapay keys list --json
monapay keys revoke <key-id>

monapay tx list --va MONA0000010234 --limit 100
monapay tx list --va MONA0000010234 --since-id FT26240001234 --json

monapay webhooks list
monapay webhooks create \
  --name "Main shop" \
  --url https://shop.example/webhooks/monapay \
  --auth HMAC_SHA256 \
  --secret "$MONAPAY_WEBHOOK_SECRET"
monapay webhooks logs --status failed --from 2026-08-01 --to 2026-08-31
monapay webhooks stats --json
```

`keys generate` saves the new client secret to the credentials file.

`tx list --since-id` reads the newest transactions first and stops at the first record whose `id`, `transaction_id` or `transaction_code` matches; that record is not printed. This filtering happens in the CLI.

`webhooks create --auth` accepts `NONE`, `API_KEY` or `HMAC_SHA256` (default).

### Create a dynamic QR code and save it as PNG

Besides the order ID and amount, the API needs your ACB merchant settings. Set them once in the environment (or pass the matching flags such as `--merchant-id`):

```bash
export MONAPAY_OWNER_NUMBER=123456789
export MONAPAY_OWNER_TYPE=ORG          # PER or ORG
export MONAPAY_MERCHANT_ID=MC00012345
export MONAPAY_TERMINAL_ID=TM0001
export MONAPAY_VA_PREFIX=MONA
export MONAPAY_BENEFICIARY_NAME="CONG TY ABC"

monapay qr create --order DH10234 --amount 2500000 --desc "Thanh toan DH10234"
```

The CLI prints the `qr_data_url` string returned by the API and writes `DH10234.png`. Use `--out ./public/qr/DH10234.png` to choose another path. The PNG is rendered locally; payment data is not sent to any external QR service.

### Listen for webhooks locally

```bash
export MONAPAY_WEBHOOK_SECRET='replace-with-your-secret'
monapay webhook listen --port 3939
```

The listener accepts only POST requests whose `X-Mona-Timestamp` is within 5 minutes and whose HMAC-SHA256 signature over the raw body is valid. Bodies over 1 MB are rejected. To forward verified payloads to your app:

```bash
monapay webhook listen \
  --port 3939 \
  --forward http://localhost:8000/webhook
```

MONA Pay needs a public URL to reach your machine. Open a tunnel and pass its URL to the test command:

```bash
cloudflared tunnel --url http://localhost:3939
# or: ngrok http 3939

monapay webhooks test --url https://YOUR-TUNNEL.example
```

The receiver must answer HTTP `200`, `201` or `202` within 10 seconds. When processing orders, put a unique constraint on `transaction_code` so a retried webhook is not applied twice.

## Configuration

| Variable | Purpose |
| --- | --- |
| `MONAPAY_CLIENT_ID`, `MONAPAY_CLIENT_SECRET` | Client credentials (recommended) |
| `MONAPAY_USERNAME`, `MONAPAY_PASSWORD` | Legacy password login |
| `MONAPAY_BASE_URL` | API base URL, default `https://api.monapay.vn` |
| `MONAPAY_CONFIG_DIR` | Credentials directory, default `~/.config/monapay` |
| `MONAPAY_WEBHOOK_SECRET` | Secret for `webhook listen` and `webhooks create/test` |
| `MONAPAY_VA` | Default virtual account for `tx list` |
| `MONAPAY_OWNER_NUMBER`, `MONAPAY_OWNER_TYPE`, `MONAPAY_MERCHANT_ID`, `MONAPAY_TERMINAL_ID`, `MONAPAY_VA_PREFIX`, `MONAPAY_BENEFICIARY_NAME` | Merchant settings for `qr create` |

Credentials, including `clientSecret`, are stored in `~/.config/monapay/credentials.json`; the directory has mode `700` and the file mode `600`. Environment variables take precedence over stored values.

On authenticated write requests (`POST`, `PUT`, `PATCH`, `DELETE`) the CLI also sends the `X-Client-Secret` header. `GET` requests and login/2FA requests do not carry it. If the API returns `Missing Client Secret` or `Invalid Client Secret`, run `monapay login --client-id ... --client-secret ...` again or set `MONAPAY_CLIENT_SECRET`.

## Development

```bash
npm install
npm test
```

Documentation: https://monapay.vn/docs

## License

MIT

**MONA Pay is part of MONA Cloud by The MONA Group.**
