# Local Setup

Project ini sudah diarahkan ke PostgreSQL lokal khusus project:

- Database URL: `postgres://postgres:dev12345@localhost:5433/isikuy`
- Data directory: `.local-postgres/`
- Vite dev server: `http://127.0.0.1:3001/`
- Admin login: `admin` / `dev12345`

## Jalankan Setelah Restart

Start PostgreSQL project:

```powershell
& "C:\Program Files\PostgreSQL\15\bin\pg_ctl.exe" -D "d:\isikuy\.local-postgres" -l "d:\isikuy\.local-postgres.log" -o "-p 5433" start
```

Start app:

```powershell
npm run dev -- --host 127.0.0.1 --port 3001
```

## Database

Push schema:

```powershell
npm run db:push
```

Seed data awal:

```powershell
npm run db:seed
```

Stop PostgreSQL project:

```powershell
& "C:\Program Files\PostgreSQL\15\bin\pg_ctl.exe" -D "d:\isikuy\.local-postgres" stop
```
