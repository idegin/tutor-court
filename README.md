# Tutor Court

## Seed setup

1. Ensure MongoDB is running and your `.env` is configured:

```env
DATABASE_URL=mongodb://127.0.0.1/your-database-name
PAYLOAD_SECRET=your-secret
```

2. Install dependencies:

```bash
pnpm install
```

3. Run the seed script:

```bash
pnpm seed
```

The seed script clears and re-populates test data in these collections:

- `reviews`
- `bookings`
- `transactions`
- `wallets`
- `tutor-profiles`
- `users`
- `subjects`

## Test login credentials

All seeded test users share the same password:

- Password: `password123`

Available users:

| Account type | Email |
| --- | --- |
| Admin | admin@tutorcourt.com |
| Tutor | tutor@tutorcourt.com |
| Parent | parent@tutorcourt.com |
| Student | student@tutorcourt.com |

## Login routes

- Admin panel: `/admin`
- App login: `/auth/login`
