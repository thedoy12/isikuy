# VPS Deploy

Target: `http://202.10.37.162/`

## 1. Environment

On the VPS, `.env` must contain a real PostgreSQL connection string. Do not use Railway placeholders.

Valid:

```env
DATABASE_URL="postgres://USER:PASSWORD@127.0.0.1:5432/isikuy"
```

Invalid:

```env
DATABASE_URL="${{Postgres.DATABASE_URL}}"
```

Check it before restarting the app:

```bash
npm run verify:env
```

## 2. Deploy App

If `/var/www/isikuy` is a git checkout:

```bash
cd /var/www/isikuy
git pull
npm ci
npm run verify:env
NODE_OPTIONS=--max-old-space-size=768 npm run build
npm run deploy:db
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
```

Current VPS note: `/var/www/isikuy` may be a copied directory without `.git`. In that case, upload changed files from the workstation, then run the same verify/build/reload commands from `npm ci` onward. The explicit `NODE_OPTIONS` is used because the VPS has limited memory and plain TypeScript/build steps can run out of heap.

## 3. Nginx

Copy the included config:

```bash
sudo cp deploy/nginx-isikuy.conf /etc/nginx/sites-available/isikuy
sudo ln -sf /etc/nginx/sites-available/isikuy /etc/nginx/sites-enabled/isikuy
sudo nginx -t
sudo systemctl reload nginx
```

## 4. Health Checks

```bash
curl -i http://127.0.0.1:3001/
curl -i http://127.0.0.1:3001/api/trpc/site.publicSettings
curl -i http://202.10.37.162/
```

If the first command fails, the app is down. Check:

```bash
pm2 status
pm2 logs isikuy --lines 100
```

If the first command works but the public URL is `502`, check Nginx:

```bash
sudo nginx -t
sudo tail -n 100 /var/log/nginx/error.log
```
