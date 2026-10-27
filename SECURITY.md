# Security Policy

## Supported versions

EntertainVerse is deployed from `main`. Only the latest commit on `main`, and the image built from it (`ghcr.io/reetam-dutta-24/entertainverse:latest`), gets fixes.

## Reporting a vulnerability

Please **don't open a public issue**. Report it privately through GitHub's **Security → Report a vulnerability** on this repository, or contact the repository owner directly.

Include what you found, how to reproduce it, and what an attacker could do with it. You'll get a reply within a week. Confirmed issues are fixed on `main`, and the fix ships with the next image build.

## How the app protects itself

- **Accounts:** passwords are hashed with bcrypt. OAuth sign-ins are linked by email only when the provider has verified it. Sign-in forms always POST, so passwords never land in a URL.
- **Sessions:** NextAuth JWTs with a server-side secret. Sockets are authenticated with the same session cookie. The middleware never re-issues the session, so a sign-out can't be undone by a late request.
- **Authorisation:** admin APIs check the role for their area. Chat, party and talk-room joins check community membership on the server. Only people who could message you can see your online status.
- **Input:** API bodies are validated with Zod. Uploads are limited to an allow-list of types and 10 MB, stored under random names, and served with `X-Content-Type-Options: nosniff`. Off-site `callbackUrl`s are ignored (no open redirect).
- **Abuse:** the assistant is rate-limited per user, counted across all servers.
- **Secrets:** nothing secret is in git or the Docker image. Production secrets are in a `chmod 600` `.env` on each server, and S3 is reached through an IAM instance role, with no keys on disk.
- **Network (production):** app servers accept traffic only from the load balancer. Postgres and Redis listen on a private address, require passwords, and accept only the app servers. The uploads bucket is private.
