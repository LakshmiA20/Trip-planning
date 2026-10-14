# Wayfarer — Trip Planning Application

Wayfarer is a responsive trip-planning prototype built around the six Release 1.0 capabilities in the supplied SRS: trip lifecycle management, destination discovery, day-wise itinerary planning, budget and expenses, booking management, and group expense sharing.

## Features

- Demo authentication with password hashing (scrypt) and signed, expiring bearer tokens.
- SQLite persistence for users, destinations, trips, generated itinerary days, activities, expenses, bookings, group members, wishlist entries, notifications, share links, and settlement payments.
- Trip status derived from dates; owner/group access checks; date validation; copy, archive, and deletion rules.
- Curated destination search, seasonal hints, interest tags, recommendations, wishlist, and local-travel notes.
- Day timelines, add/edit/remove/move API support, activity overlap warning with explicit confirmation, and shared read-only itinerary links.
- Budget progress, category breakdown, expense logging and CSV export.
- Provider-style accommodation and transport results, demo checkout, confirmation references, cancellation state, and itinerary entries.
- Trip invitations with edit/view permission, equal/percentage/itemized share calculations, net balances, and minimized settlements.
- Responsive layout, empty states, validation feedback, and a demonstration account.

## Tech and structure

- **Client:** React, TypeScript, Vite, Lucide icons, hand-built responsive design system.
- **API:** Express 5, TypeScript, Zod validation.
- **Database:** SQLite through Node's built-in `node:sqlite` API (requires Node 22+); relational tables and foreign keys are initialized on startup.
- `src/main.tsx` and `src/style.css` — application UI and visual system.
- `server/index.ts` — REST endpoints, authentication, access control, and workflows.
- `server/store.ts` — schema, password/token helpers, and repeatable demo seed.
- `server/domain.ts` — trip status, overlap, split, and settlement business rules.
- `server/domain.test.ts` — core rule tests.

## Run locally

Requirements: Node.js 22 or newer and npm.

```sh
npm install
npm run db:seed
npm run dev
```

Vite serves the client at `http://localhost:5173`; Express serves the API at `http://localhost:4000`. The database is created at `data/wayfarer.db` on first start. The store also seeds idempotently on API startup so a fresh clone can run without an extra step.

For a production-style local build:

```sh
npm run build
npm start
```

The Express process serves the built client and API on port 4000. Override `PORT`, `DATABASE_PATH`, and `JWT_SECRET` in the process environment. `.env.example` documents the intended configuration values. Use a long, private `JWT_SECRET` outside a local demo.

## Demo account

- Email: `demo@wayfarer.app`
- Password: `wander123`

The seeded Goa trip is dated October 25–29, 2026, with five generated days, activities, an expense, and sample group members. `npm run db:seed` can be run again without duplicating the demo account.

## REST API overview

All private routes use `Authorization: Bearer <token>`.

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/destinations`, `GET /api/destinations/:id`, `GET /api/destinations/:id/recommendations`
- `GET|POST /api/trips`, `GET|PATCH|DELETE /api/trips/:id`, `POST /api/trips/:id/duplicate`, `POST /api/trips/:id/archive`
- `POST /api/trips/:id/activities`, `PATCH|DELETE /api/trips/:tripId/activities/:activityId`
- `GET /api/trips/:id/budget`, `POST /api/trips/:id/expenses`, `GET /api/trips/:id/expense-report`
- `GET /api/trips/:id/booking-options`, `GET /api/trips/:id/bookings`, `POST /api/trips/:id/bookings`, `POST /api/trips/:id/bookings/:bookingId/cancel`
- `POST /api/trips/:id/members`, `GET /api/invitations`, `PATCH /api/invitations/:id/respond`, `GET /api/trips/:id/settlements`, `POST /api/trips/:id/settlements/paid`
- `GET /api/wishlist`, `POST|DELETE /api/wishlist/:destinationId`, `GET /api/notifications`, `POST /api/trips/:id/share`, `GET /api/sharing/:shareId`

Invalid input returns a readable JSON error. Trip and member routes check ownership or accepted membership; only edit-capable members can change shared trip data.

## External services and demo behavior

Destination content and images are curated sample data. Accommodation and transportation searches return realistic illustrative choices from two provider labels per category. Checkout records a local confirmed booking and a reference; it does not charge a payment method or make a real reservation. Currency conversion currently uses a fixed demo fallback and should be replaced with a verified exchange-rate provider before real use. Weather is a seasonal guidance message, and the itinerary map panel is a visual preview rather than a live geospatial route service. Read-only sharing exposes the itinerary only; it omits expenses and group details.

These provider boundaries are suitable extension points for partner APIs. No raw card data is collected.

## Tests

```sh
npm test
npm run build
```

The rule tests cover date-based trip states, itinerary overlap, equal and percentage splits, and minimum settlement calculations.

## Faculty demonstration flow (5–10 minutes)

1. Sign in with the demo account and view the Goa trip on the overview.
2. Open the itinerary, add an activity at an overlapping time, and confirm the warning.
3. Visit Discover, save a destination, and return to Saved places.
4. Add a personal expense and show the updated budget and CSV export.
5. Search stays or transport, select an offer, and confirm the demo booking; show its reference and itinerary entry.
6. Open Travel crew, add an equal-split expense, and mark a suggested settlement paid.
7. Create a read-only itinerary link and open it in a signed-out browser window.

## SRS trace notes

Core behavior maps to SRS sections 4.1–4.6 and business rules BR-1 through BR-10. The prototype implements local demo providers for partner services. Production deployment still needs real email/invitation delivery, payment gateway integration, live exchange-rate and weather sources, a geocoded interactive map, MFA, offline draft synchronization, localization, accessibility review, and operational scaling/security controls.
