**English** · [Türkçe](README.tr.md)

<div align="center">

# Node Blog API

**A blog REST API written with Express and MySQL, with JWT authentication.**

![Express](https://img.shields.io/badge/Express-5.2-222?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-2ea44f)

[Highlights](#highlights) · [Setup](#setup-and-running) · [Docker](#running-with-docker) · [API summary](#api-summary) · [Documentation](#documentation)

</div>

A blog REST API for managing users, categories, posts and comments. It is written with Node.js, Express 5 and MySQL. Queries run as parameterized SQL through `mysql2`, without an ORM. The endpoints are under `/api/v1`.

The front end is in a separate repo: [node-blog-web](https://github.com/ismailarat56/node-blog-web) (React).

The detailed documents under `docs/` and the working notes under `notes/` are in Turkish.

## Highlights

- **Authentication:** HS256-signed JWT access token (15 minutes by default); logout revokes the token.
- **Refresh token:** stored in an httpOnly cookie and changed on every refresh; if a used token is sent again, the session family is revoked.
- **Roles and ownership:** the `user` and `admin` roles are read from the database on every request; posts are checked for author or admin.
- **Registration and verification:** email verification with a 6-digit code, password reset, password and email change.
- **Posts:** slug generation from the title, draft and publish flow, soft delete and restore, search, filtering, sorting, pagination.
- **Comments:** single-level replies; the post owner or an admin can hide a comment.
- **Public endpoints:** published posts, categories and comments can be read without a token (`/api/v1/public`).
- **Cover image:** JPEG, PNG and WebP upload; 2 MB limit by default and a file signature check.
- **Rate limiting:** 11 separate limits with an in-memory sliding window; exceeding a limit returns `429` and a `Retry-After` header.
- **Docker:** a Compose file for the API, MySQL 8.4 and nginx 1.27; the API is reached through nginx.
- **Migrations and Postman:** SQL migration files numbered 002-014 and a Postman collection with 14 folders.

## Requirements

- Node.js and npm. The Docker image uses `node:24-alpine`.
- MySQL. The Compose file uses `mysql:8.4`.
- Docker and Docker Compose (optional, for running in containers).

## Setup and running

```bash
git clone https://github.com/ismailarat56/node-blog-api.git
cd node-blog-api
npm install
cp .env.example .env
```

Edit the `DB_USER` and `DB_PASSWORD` values in `.env`. `JWT_SECRET` must be at least 32 bytes and `VERIFICATION_CODE_KEY` must be a 64-character hex string; the server does not start if the second one is empty. Generate a separate value for each of them:

```bash
node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'
```

Create a clean database and start the server:

```bash
mysql -u your_mysql_user -p < sql/schema.sql
npm start
```

The default address is `http://localhost:3000`. `npm start` runs the server with `node --watch`. To check it:

```bash
curl -i http://localhost:3000/health
```

With the `MAIL_TRANSPORT=json` setting in `.env.example`, no real email is sent. The `npm run set-user-password` and `npm run set-user-role` scripts are used for the first admin account: [docs/KIMLIK_DOGRULAMA.md](docs/KIMLIK_DOGRULAMA.md#admin-bootstrap) (authentication).

Environment variables and applying migrations to an existing database: [docs/KURULUM.md](docs/KURULUM.md) (setup)

## Running with Docker

The Compose file expects the `.env.docker` (API) and `.env.db` (MySQL) files. Example contents for both are in [docs/DOCKER.md](docs/DOCKER.md). When the files are ready:

```bash
docker compose up -d
docker compose ps
curl -i http://127.0.0.1:8080/health
```

nginx listens on `127.0.0.1:8080` and forwards requests to the API. The API port is not published to the host. nginx serves uploaded cover images from the shared volume.

## API summary

| Group | Path | Access |
| --- | --- | --- |
| Health | `GET /health` | No token required |
| Public | `GET /api/v1/public/posts`, `/posts/:slug`, `/posts/:slug/comments`, `/categories` | No token required |
| Auth | `/api/v1/auth`: `login`, `refresh`, `register`, `email/verify`, `email/verify/resend`, `password/forgot`, `password/reset` | No token required |
| Auth | `/api/v1/auth`: `me`, `logout`, `password`, `password/change-code`, `email/change`, `email/change/confirm` | Any signed-in user |
| Users | `/api/v1/users` | Admin only |
| Categories | `/api/v1/categories` | Read: any signed-in user. Write: admin |
| Posts | `/api/v1/posts`, `/:id/publish`, `/:id/unpublish`, `/:id/restore` | Read and create: any signed-in user. Modify: author or admin |
| Cover | `PUT` and `DELETE /api/v1/posts/:postId/cover` | Author or admin |
| Comments | `/api/v1/posts/:postId/comments`, `/api/v1/comments/:id`, `/:id/hide`, `/:id/unhide` | Any signed-in user; hiding: post owner or admin |

Protected endpoints expect an `Authorization: Bearer <access_token>` header. Missing or invalid credentials return `401`; insufficient permissions return `403`.

Format of a success response and an error response:

```json
{ "success": true, "request_id": "...", "message": "...", "data": {}, "meta": {} }
{ "success": false, "error": { "code": "POST_NOT_FOUND", "message": "...", "details": null }, "request_id": "..." }
```

`message`, `data` and `meta` are present only in the responses they apply to. All endpoints, query parameters and error codes: [docs/API.md](docs/API.md)

## Email and verification codes

- `MAIL_TRANSPORT` can be `smtp` or `json`. In `json` mode no email is sent; `smtp` requires `SMTP_USER` and `SMTP_PASS`.
- Verification codes have 6 digits, are valid for 10 minutes and can be tried at most 5 times. There is a 60-second wait before a new code can be requested.
- `DEV_MAIL_OUTBOX=true` is enabled only in `json` mode and outside production; `GET /api/v1/dev/mail-outbox/latest?to=<adres>` returns the latest email (`<adres>` is the recipient's email address).
- To test the SMTP connection: `node scripts/send-test-mail.js <adres>`

## Documentation

| Document | Contents |
| --- | --- |
| [docs/KURULUM.md](docs/KURULUM.md) | Setup, environment variables, migrations |
| [docs/DOCKER.md](docs/DOCKER.md) | Compose, nginx reverse proxy, size limits, first admin in Docker |
| [docs/KIMLIK_DOGRULAMA.md](docs/KIMLIK_DOGRULAMA.md) | Roles, permission table, admin bootstrap, refresh token, security decisions |
| [docs/API.md](docs/API.md) | Endpoints, rate limit table, post data model, cover upload, error codes |
| [docs/TESTLER.md](docs/TESTLER.md) | curl scenarios, test matrix, Postman runs |
| [docs/BILINEN_EKSIKLER.md](docs/BILINEN_EKSIKLER.md) | Known limitations and next steps |
| [docs/curl-scenarios.md](docs/curl-scenarios.md) | Old curl scenarios from the API v2 period |

The details under `docs/` were moved from the previous version of the README. Places that do not match the code are noted at the top of the relevant document. Topic-based working notes are in the `notes/` folder.

## Folder structure

```
server.js            entry point: validates settings, tries the MySQL connection, starts the server
src/
  app.js             Express application and route mounting
  config/            reading and validating environment variables
  routes/            auth, users, categories, posts, comments, public, dev
  controllers/       request handlers
  models/            mysql2 queries
  services/          refresh token and verification code flows
  middlewares/       authenticate, authorize, rate limit, upload, error handling
  validators/        body and query validation
  utils/             JWT, password hash, slug, pagination, mail and cookie helpers
sql/                 schema.sql and migrations/ (002-014)
scripts/             admin bootstrap, mail test and check scripts
postman/             collection, example environment files, run results
nginx/               reverse proxy configuration
docs/                detailed documents
notes/               working notes
uploads/covers/      uploaded cover images (not tracked by git)
server-memory.js     old CRUD example that does not use a database (npm run memory)
```

## Tests

The project has no `npm test` script and no automated integration test suite. There are two check scripts that do not need a database:

```bash
npm run check-sliding-window
npm run check-image-signature
```

End-to-end trials are done with Postman. Import the `postman/node-blog-api.postman_collection.json` collection and one of the example environment files under `postman/`. The folders are numbered from `00 Health` to `13 Refresh Token`. Run order, required variables and curl scenarios: [docs/TESTLER.md](docs/TESTLER.md)

## Known limitations

- There are no automated integration tests; verification is done with Postman runs and manually run scripts.
- Rate limit counters are kept in process memory; they reset when the API restarts.
- There is no migration tracking table; migrations are applied by hand in numeric order.
- nginx listens only for HTTP on port 80; there is no TLS configuration.
- Uploaded images are not resized and EXIF data is not stripped.

Full list: [docs/BILINEN_EKSIKLER.md](docs/BILINEN_EKSIKLER.md)

## License

The code is released under the [MIT license](LICENSE).
