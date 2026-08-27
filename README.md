This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Migrasi database

Sebagian optimasi hidup di MongoDB (field turunan + index), bukan di kode — jadi
tidak ikut terbawa bundle hasil build. Migrasi dijalankan **dari mesin developer**,
bukan di server aplikasi: yang menentukan adalah database mana yang disentuh, bukan
di mana perintahnya dijalankan.

```bash
# database lokal (memakai .env.local)
npm run migrate:search-tokens
```

```powershell
# database production — variabel dari shell menang atas .env.local,
# jadi file itu tidak perlu diubah
$env:MONGODB_URI = "<URI production>"
npm run migrate:search-tokens
Remove-Item Env:\MONGODB_URI
```

Skripnya idempotent dan tidak menghapus index apa pun, jadi aman diulang. Jalankan
**sebelum** meng-upload build baru, dan sekali untuk setiap database (production,
staging, instalasi baru). Detail lengkapnya ada di header
`scripts/migrate-search-tokens.ts`.

Terpisah dari itu, `npm run ensure-indexes` menyinkronkan index **seluruh** model.
Perintah itu memakai `syncIndexes()` yang **menghapus** index yang tidak
dideklarasikan di schema dan bisa mengunci database pada koleksi besar — jalankan
hanya saat toko tutup, dan bukan untuk keperluan migrasi di atas.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
