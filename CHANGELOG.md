# Changelog

## 0.2.2 - 2026-10-05

- Sửa lỗi CLI không chạy được sau khi cài từ npm: code import SDK theo đường dẫn monorepo cũ `../../sdk/node/dist/index.js`, đường này không có trong package. Nay khai `@monapay/node` làm dependency và import theo tên package.
- Đổi link repo, homepage và issue sang `github.com/mona-software` vì org cũ `themonagroup` đã bị GitHub khoá, mọi link cũ trả 404.
