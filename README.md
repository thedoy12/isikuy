# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Laporan Perbaikan Project - 2026-05-14

Perbaikan yang sudah diterapkan:

- Checkout diamankan: backend tidak lagi menerima harga, fee, total, atau kode produk dari client sebagai sumber kebenaran. Nilai transaksi sekarang dihitung ulang dari database, produk aktif, metode pembayaran aktif, dan konfigurasi fee server.
- Validasi server ID diperketat untuk produk yang membutuhkan server/zone ID.
- Voucher checkout diaktifkan: kode voucher kini ikut dihitung pada estimasi pembayaran, ditampilkan sebagai diskon, divalidasi di backend saat transaksi dibuat, dan usage count dinaikkan setelah transaksi dibuat.
- Pembayaran production dibuat lebih aman: QRIS production akan menolak checkout jika Flowix belum dikonfigurasi, sehingga user tidak diarahkan ke QR placeholder palsu.
- Role admin diselaraskan: `superadmin` sekarang bisa memakai endpoint admin seperti yang sudah ditampilkan oleh UI.
- Kredensial admin default diamankan: production sekarang wajib mengisi `ADMIN_USERNAME` dan `ADMIN_PASSWORD`, sedangkan default dev tetap tersedia untuk lokal.
- Login admin tidak lagi mengisi username default di form.
- Dashboard admin memakai data transaksi 7 hari terakhir dari backend, bukan chart dummy hardcoded.
- Navigasi admin mobile ditambahkan untuk Dashboard, Games, Transactions, dan Users.
- Copy FAQ seed pembayaran disesuaikan dengan kemampuan checkout saat ini, yaitu QRIS.
- Helper HTTP diperketat tipenya dan ditambahkan unit test.
- ESLint disesuaikan dengan pola project/shadcn agar quality gate lint relevan dan tidak gagal pada export utility UI.

Verifikasi yang sudah dijalankan:

- `npm run check` berhasil.
- `npm run lint` berhasil.
- `npm test` berhasil.
- `npm run build` berhasil, dengan warning bundle Vite masih besar seperti sebelumnya.

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
