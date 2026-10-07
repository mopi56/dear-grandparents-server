![logo](./logo.png "logo")

# DearGrandParents

**An open-source, self-hosted way to share family photos and videos with grandparents — directly on their TV.**

DearGrandParents is a simple client/server solution designed to make sharing family memories as effortless as possible.

The project started as a personal project: after seeing the closure of a service that provided a similar experience, I decided to build my own solution and eventually give it to my grandmother for Christmas.

The project has since evolved into an open-source solution that anyone can self-host.

---

## How it works

DearGrandParents is split into two independent components:

- **DearGrandParents Server** — receives, stores and serves photos and videos.
- **DearGrandParents Client** — synchronizes the media and displays them on a TV.

This repository contains the **server only**.

The client is developed separately and will be released as open-source once it is ready.

```text
                         Family
                           │
                           │ Upload
                           ▼
                  ┌─────────────────────┐
                  │ DearGrandParents    │
                  │       Server        │
                  │                     │
                  │ • Upload            │
                  │ • Storage           │
                  │ • Metadata          │
                  │ • Thumbnails        │
                  │ • Authentication    │
                  │ • Synchronization   │
                  └──────────┬──────────┘
                             │
                             │ Sync
                             ▼
                  ┌─────────────────────┐
                  │ DearGrandParents    │
                  │       Client        │
                  │                     │
                  │ • Local cache       │
                  │ • Photos            │
                  │ • Videos            │
                  │ • Slideshow         │
                  └──────────┬──────────┘
                             │
                             │ HDMI
                             ▼
                         Television
```

The server and client are deliberately independent.

This makes it possible to run the server wherever Docker is available and use different hardware for the client.

---

# The idea

The goal is deliberately simple:

> **Send a photo or video to your family, and let it appear on their TV.**

The person watching the TV should not need to:

- Use a smartphone
- Use a computer
- Create an account
- Download anything manually
- Understand how the system works
- Have a permanent Internet connection

Once the client has synchronized its content, everything is available locally.

If the network or Internet connection disappears, the client can continue displaying the previously synchronized media.

---

# Features

## Upload

Media are uploaded through the web interface.

No user account is required.

Anyone who knows the configured `FAMILY_CODE` can upload photos and videos.

Supported media include:

- Photos
- Videos
- Multiple files per upload
- Comments
- Sender name

The sender name is simply used to identify who sent the media.

For example:

```text
Julien
"Un petit souvenir de notre week-end !"
```

---

## Media processing

The server automatically processes uploaded media.

It provides:

- File validation
- File type detection
- Size limits
- Unique filenames
- Image thumbnails
- Video thumbnails
- Metadata storage

The server does not trust the MIME type provided by the client and validates the actual file content.

---

## Gallery

DearGrandParents Server provides a private web gallery.

The gallery allows users to:

- Browse photos
- Watch videos
- View comments
- View the sender
- Manage and inspect the stored media

The same information can also be displayed by the DearGrandParents Client.

---

# Client synchronization

The DearGrandParents Client synchronizes with the server on demand.

The client periodically runs a synchronization process and checks whether new media are available.

### First synchronization

When a client is initialized, it downloads all available media:

```text
Server
  │
  ├── Photo 1
  ├── Photo 2
  ├── Photo 3
  ├── Video 1
  └── Video 2
          │
          ▼
       Client
       local cache
```

### Subsequent synchronizations

After the initial synchronization, the client only downloads new media.

```text
Existing cache
       │
       ▼
   Synchronization
       │
       ├── Already present → nothing to do
       │
       └── New media → download
```

The server does not maintain synchronization state.

It does not know which media have already been downloaded by a client.

The client is responsible for maintaining its own local state.

---

# Offline operation

One of the main design goals is that the TV should remain useful even without an Internet connection.

The client keeps synchronized media locally.

```text
Internet available
       │
       ▼
 Synchronization
       │
       ▼
 Local cache
       │
       ▼
 Slideshow
```

If the Internet connection subsequently disappears:

```text
Internet unavailable
       │
       ▼
 Local cache
       │
       ▼
 Slideshow continues
```

Previously synchronized photos and videos remain available.

---

# Multiple clients

A single server can be used by multiple clients.

For example:

```text
                  DearGrandParents
                       Server
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
         TV #1        TV #2        TV #3
       Raspberry Pi  Raspberry Pi  Linux PC
```

The synchronization token is currently shared by the clients of the same server.

The server is designed around **one family per server instance**.

It is not a multi-tenant application.

If you need completely separate families, run separate DearGrandParents Server instances.

---

# Client platform

The DearGrandParents Client is initially designed around Raspberry Pi hardware.

However, the client is intended to run on **Linux distributions in general** rather than being tied to a specific Raspberry Pi model.

The goal is to keep the client independent from the hardware used to display the content.

Potential hardware includes:

- Raspberry Pi
- ARM Linux devices
- x86 mini PCs
- Other Linux-compatible systems

The client can therefore evolve independently from the server.

---

# Storage

DearGrandParents uses local storage.

There is no mandatory cloud service.

Media are stored directly on the server:

```text
uploads/
├── photos/
├── videos/
└── thumbnails/
```

Metadata is stored in:

```text
metadata.json
```

The decision to use a JSON file instead of a database is intentional.

For this type of application, the amount of structured data is relatively small and a simple file-based approach provides:

- Easy deployment
- Easy backup
- No database dependency
- Easy migration
- Easy inspection
- Minimal infrastructure

The storage layer can evolve in the future if the project needs to support larger installations.

---

# Security

DearGrandParents is designed for self-hosted family environments.

It uses several independent security mechanisms.

## Upload authentication

Uploads require the configured:

```text
FAMILY_CODE
```

No user account is required.

The code is validated before the server processes the uploaded files.

---

## Gallery authentication

The web gallery is protected by a password.

Passwords are not stored in plaintext.

The server uses Node.js `scrypt` with a random salt for password hashing.

---

## Client authentication

Clients authenticate to synchronization endpoints using:

```text
SYNC_TOKEN
```

The token is validated using a constant-time comparison.

---

## Sessions

Gallery sessions use:

- Random session tokens
- HMAC signing
- Expiration
- HTTP-only cookies
- `SameSite=Strict`
- Optional `Secure` cookies

---

## Upload protection

The server validates:

- File size
- File extension
- MIME type
- Actual file signature

It also includes protection against:

- Path traversal
- Invalid file types
- Oversized uploads
- Excessive upload requests
- Authentication brute force

---

# Architecture

The server is structured around several layers:

```text
routes/
    HTTP endpoints
        │
        ▼
services/
    Application logic
        │
        ▼
utils/
    Validation / filesystem / paths
        │
        ▼
Storage
    uploads/
    metadata.json
```

The main server components are:

```text
routes/
├── auth.js
├── gallery.js
├── media.js
├── sync.js
└── upload.js

services/
├── auth.js
├── media.js
├── metadata.js
├── sync.js
├── thumbnails.js
└── upload.js
```

This separation keeps HTTP handling, business logic and filesystem operations independent.

---

# Server / Client responsibilities

## DearGrandParents Server

The server is responsible for:

```text
Upload
   ↓
Validation
   ↓
Processing
   ↓
Storage
   ↓
Metadata
   ↓
Synchronization API
```

## DearGrandParents Client

The client is responsible for:

```text
Synchronization
   ↓
Download
   ↓
Local cache
   ↓
Media playback
   ↓
Slideshow
   ↓
Television
```

This separation means the server does not need to know how or where the media will eventually be displayed.

---

# Requirements

## Docker

The recommended way to run the server is Docker.

Requirements:

- Docker
- Docker Compose

The server can run anywhere capable of running Docker.

Examples include:

- Home server
- NAS
- Raspberry Pi
- Mini PC
- VPS
- Dedicated server

---

# Installation

## Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/dear-grandparents-server.git
cd dear-grandparents-server
```

---

## Configure the environment

Copy the example configuration:

```bash
cp .env.example .env
```

Configure:

```env
FAMILY_CODE=
SYNC_TOKEN=
SESSION_SECRET=
GALLERY_PASSWORD_HASH=
COOKIE_SECURE=true
```

Generate three different random values and copy them into `.env`:

```bash
openssl rand -hex 16 # FAMILY_CODE
openssl rand -hex 32 # SYNC_TOKEN
openssl rand -hex 32 # SESSION_SECRET
```

The server will not start until all four required values are configured.

### Configuration

| Variable                | Description                              |
| ----------------------- | ---------------------------------------- |
| `FAMILY_CODE`           | Code required to upload media            |
| `SYNC_TOKEN`            | Token used by clients to synchronize     |
| `SESSION_SECRET`        | Secret used to sign sessions             |
| `GALLERY_PASSWORD_HASH` | `scrypt` hash of the gallery password    |
| `COOKIE_SECURE`         | Enables the `Secure` session cookie flag |

Never commit `.env` to the repository.

---

# Generate the gallery password hash

Generate a password hash using:

```bash
GALLERY_PASSWORD="your-password" node scripts/hash-password.js
```

Copy the generated value into:

```env
GALLERY_PASSWORD_HASH=scrypt$...
```

---

# Docker

Build the image:

```bash
docker build -t dear-grandparents-server .
```

Run the server:

```bash
mkdir -p data

docker run -d \
  --name dear-grandparents-server \
  --restart unless-stopped \
  --env-file .env \
  -e DATA_DIR=/app/data \
  -p 3000:3000 \
  -v "$(pwd)/uploads:/app/uploads" \
  -v "$(pwd)/data:/app/data" \
  dear-grandparents-server
```

Docker stores metadata in `data/metadata.json` so the server can replace the file atomically. When upgrading an existing Docker installation, stop the container and move the existing `metadata.json` into `data/metadata.json` before starting the updated version.

Or with Docker Compose:

```bash
docker compose up -d --build
```

View logs:

```bash
docker compose logs -f
```

Stop the server:

```bash
docker compose down
```

---

# Reverse proxy and HTTPS

For an Internet-facing installation, it is recommended to place DearGrandParents Server behind a reverse proxy.

Examples:

- HAProxy
- Nginx
- Traefik
- Caddy

Example:

```text
Internet
   │
   │ HTTPS
   ▼
Reverse Proxy
   │
   │ HTTP
   ▼
DearGrandParents Server
   │
   ├── uploads/
   └── metadata.json
```

HTTPS should be used when the server is accessible from outside the local network.

When HTTPS is enabled:

```env
COOKIE_SECURE=true
```

---

# API

## Login

```http
POST /login
Content-Type: application/json
```

Request:

```json
{
    "password": "your-password"
}
```

Creates an authenticated gallery session.

---

## Upload

```http
POST /upload
X-Family-Code: <family-code>
```

The endpoint accepts multipart file uploads.

Example:

```bash
curl \
  -H "X-Family-Code: your-family-code" \
  -F "files=@photo.jpg" \
  http://localhost:3000/upload
```

---

## Gallery

```http
GET /api/gallery
```

Requires a valid gallery session.

---

## Media

```http
GET /media/:filename
```

Requires either:

- A valid gallery session
- A valid synchronization token

---

## Thumbnails

```http
GET /thumbnails/:filename
```

Requires either:

- A valid gallery session
- A valid synchronization token

---

## Synchronization

Metadata:

```http
GET /gallery-sync
X-Sync-Token: <sync-token>
```

Media:

```http
GET /media-sync/:filename
X-Sync-Token: <sync-token>
```

These endpoints are intended for DearGrandParents clients.

---

# Backups

Because DearGrandParents uses local filesystem storage, backing up the application is straightforward.

At minimum, back up:

```text
uploads/
data/metadata.json (Docker)
metadata.json (running directly with Node.js)
```

These contain the actual media and their associated metadata.

The project does not require a specific backup solution.

You can use:

- NAS
- External disk
- Another server
- Cloud backup
- Restic
- Borg
- rsync
- Any other backup system

---

# Development

Install dependencies:

```bash
npm ci
```

Start the server:

```bash
npm start
```

Run linting:

```bash
npm run lint
```

Automatically fix lint issues:

```bash
npm run lint:fix
```

Format the code:

```bash
npm run format
```

Check formatting:

```bash
npm run format:check
```

Run the complete project checks:

```bash
npm run check
```

---

# Project structure

```text
dear-grandparents-server/
│
├── config/
│   └── config.js
│
├── routes/
│   ├── auth.js
│   ├── gallery.js
│   ├── media.js
│   ├── sync.js
│   └── upload.js
│
├── services/
│   ├── auth.js
│   ├── media.js
│   ├── metadata.js
│   ├── sync.js
│   ├── thumbnails.js
│   └── upload.js
│
├── utils/
│   ├── file-validation.js
│   ├── filesystem.js
│   ├── paths.js
│   └── validation.js
│
├── scripts/
│   └── hash-password.js
│
├── public/
│   ├── login.html
│   └── upload.html
│
├── private/
│   └── gallery.html
│
├── uploads/
│
├── server.js
├── Dockerfile
├── docker-compose.yml
├── package.json
├── package-lock.json
├── .env.example
└── .gitignore
```

---

# Roadmap

The project is actively evolving.

Planned or possible improvements include:

- Open-source DearGrandParents Client
- Additional Linux client support
- Improved synchronization
- Better administration tools
- Optional date display on the client
- Expanded automated test coverage
- Additional deployment options
- Potential evolution of the metadata storage layer

The server and client will remain separate projects.

---

# Contributing

Contributions are welcome.

Before submitting a pull request:

1. Keep server and client responsibilities separated.
2. Avoid duplicating authentication or validation logic.
3. Validate user-controlled input.
4. Never commit secrets.
5. Run the code checks and automated tests:

```bash
npm run check
```

Security-sensitive changes should clearly explain their impact.

---

# License

This project is distributed under the license specified in [`LICENSE`](LICENSE).

---

# Disclaimer

DearGrandParents is an independent open-source project.

It is not affiliated with, endorsed by, or associated with any commercial service that may have previously offered a similar concept.

The project was independently developed from scratch and does not contain proprietary software, source code, infrastructure or assets from third parties.
