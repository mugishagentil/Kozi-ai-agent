# Backend — Quick Run

Minimal steps to run the backend locally:

1. Install dependencies

```bash
cd backend
npm install
```

2. Generate Prisma client

```bash
npx prisma generate
```

3. Push Prisma schema to your database (non-production)

```bash
npx prisma db push
```

4. Start the dev server

```bash
npm run dev
```

5. Notes
- Create a `backend/.env` and set up your environments, see an example in .env.example file.
- For production migrations use `npx prisma migrate deploy` or `npx prisma migrate dev --name <name>` during development.