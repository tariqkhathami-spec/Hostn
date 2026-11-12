# Hostn quality checks

Two checks answer "does everything still work, and did we look at everything?"
without relying on anyone's memory.

## 1. Contract check — `python3 qa/coverage.py`

Reads every API call written in the website and both apps and compares it with
the routes the server really serves. A call to a path or method that does not
exist fails the run. It needs no database.

To run it automatically on every pull request, copy `qa/github-workflow-qa.yml`
to `.github/workflows/qa.yml` (GitHub only lets the repository owner add
workflow files).

It also writes `qa/COVERAGE.md`: which calls the end-to-end check exercised and
which no automated check has touched yet. When a screen is added, its calls
show up there as "not yet" until a check covers them.

## 2. End-to-end check — `node qa/e2e.mjs`

Signs in as a guest, a host and an admin and walks the real flows against a
running API: search, booking, payment (simulator), host confirmation, chat,
support tickets, reports, favourites, cancellation, adding a listing, the
host's money screens, every admin list, and access control. It asserts on the
content that comes back — that the other side can read what was sent — not only
on status codes.

Run it locally with the development database and seed accounts:

```bash
node qa/e2e.mjs
```

```bash
python3 qa/coverage.py
```

It refuses to run against production because it creates bookings, tickets and
listings.

## When something breaks in real use

Add a check for it to `qa/e2e.mjs` in the same change that fixes it, so the
same mistake cannot come back unnoticed.
