# Hotel Booking Chat (front end)

A small React demo that shows how to implement **real-time communication** 
with Socket.IO on top of the [hotel-booking-api](https://github.com/primetek-africa/hotel-booking-api).

It is an academic example of a support chat for a hotel booking app:

- A **Guest** opens a conversation to ask for help.
- Every connected **Staff** member sees the new request in a queue instantly.
- A staff member **takes** the conversation, and from then on both users chat in real time.

> This project is a teaching demo. It is intentionally simple 
(no routing guards beyond login, no message editing, no pagination UI).

---

## Features

- Login with email and password, redirecting straight to the message menu.
- Role-based behavior enforced by the API (the UI only reflects it):
  - **Guest**: can create a conversation (one active conversation at a time) and chat in their own conversations.
  - **Staff**: sees the support queue of unassigned conversations plus their own, and can take one.
- Real-time updates over WebSockets:
  - New conversations appear in the staff queue without refreshing.
  - The guest sees who is answering as soon as a staff member takes the conversation.
  - Messages are delivered instantly to both participants.
  - "typing..." indicator.
- Message history loaded from the REST API when a conversation is opened.
- JWT rotation handled automatically (the API issues a new token on every protected request).

## Tech stack

| Area | Library |
| --- | --- |
| UI | React 19 + JavaScript (no TypeScript) |
| Build tool | Vite |
| Routing | react-router-dom |
| Real time | socket.io-client |
| Styles | Tailwind CSS (via `@tailwindcss/vite`) |

## Prerequisites

- Node.js 20 or newer.
- The **hotel-booking-api** running, with:
  - the Socket.IO server enabled (`src/sockets/index.js`),
  - the chat endpoints `/conversations/open`, `/conversations/mine` and `/conversations/claim`,
  - the database migrated and seeded.
- At least two users created on the API (for example as an Administrator via `POST /users/create`):
  - one with the **Guest** role,
  - one with the **Staff** role,
  - both with status **Active**.

## Getting started

```bash
# 1. Install dependencies
npm install
npm install react-router-dom socket.io-client tailwindcss @tailwindcss/vite

# 2. Create the environment file (see below)
cp .env.example .env   # or create .env by hand

# 3. Start the dev server (http://localhost:3355)
npm run dev
```

### Environment variables

Create a `.env` file in the project root:

```env
# Origin of the API (NOT including /api/v1). Used for REST calls and for the socket connection.
# The API listens on the machine's network IP (see netConfig.js), not on localhost.
VITE_API_URL=http://192.168.1.10:7799

# Same value as API_KEY in the API's .env
VITE_API_KEY=your-api-key
```

Notes:

- The dev server runs on **port 3355** (`vite.config.js`). That origin must match `CORS_ORIGIN` in the API's `.env`.
- Any `VITE_*` variable is bundled into the browser code, so anyone can read the API key. That is acceptable for a classroom demo, but not for production.
- `VITE_API_URL` must **not** include `/api/v1`: the REST helper (`src/lib/api.js`) appends it, and the socket client connects to the bare origin. If the prefix were part of the URL, Socket.IO would interpret it as a namespace and the connection would fail.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server on port 3355 |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |


## How it works

### Authentication

1. `LoginPage` calls `POST /auth/login`. The API returns a JWT in the `authentication` field.
2. The token is stored in `localStorage`; the user's `id` and `role` are decoded from its payload (the server is still the only one that verifies it).
3. On every REST call the API sends back a fresh token in the `X-Access-Token` header. `api.js` saves it automatically.
4. The socket outlives the 10-minute token, so `MessagePage` runs a REST call every 4 minutes and sends the newest token to the socket with the `auth:refresh` event.

### REST endpoints used

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public | Authenticate |
| GET | `/conversations/mine` | Guest, Staff | Guest: own conversations. Staff: queue + own |
| POST | `/conversations/open` | Guest | Open a new conversation |
| POST | `/conversations/claim` | Staff | Take an unassigned conversation |
| POST | `/messages/list-by-conversation` | Participants | Load message history |

### Socket events

Client to server (all use an acknowledgement callback):

| Event | Payload | Description |
| --- | --- | --- |
| `conversation:join` | `{ conversationId }` | Join the conversation room (participants only) |
| `message:send` | `{ conversationId, body }` | Send a message (max 2000 characters) |
| `typing:start` / `typing:stop` | `{ conversationId }` | Typing indicator |
| `auth:refresh` | `{ token }` | Replace the expiring JWT on the open socket |

Server to client:

| Event | Payload | Description |
| --- | --- | --- |
| `message:new` | message | A message was created in a joined room |
| `typing` | `{ conversationId, user, isTyping }` | The other participant is typing |
| `conversation:created` | conversation | A guest opened a conversation (staff only) |
| `conversation:updated` | conversation | A conversation was claimed |

## Try it

1. Start the API and this app (`npm run dev`).
2. Open the app in a normal window (Guest) and in an incognito window (Staff). Both store the token in `localStorage`, so they cannot share one browser profile.
3. Sign in on both. You land directly on `/message`.
4. As the Guest, click **+ New**. The conversation appears in the Staff queue immediately.
5. As Staff, click **Take conversation**. The Guest's list now shows the staff member's name.
6. Chat from both sides and watch the messages and the typing indicator arrive in real time.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| CORS error in the console | `CORS_ORIGIN` in the API's `.env` is not `http://localhost:3355` |
| `401 Invalid API key` | `VITE_API_KEY` does not match `API_KEY` in the API |
| `404` on every REST call | `src/lib/api.js` must build the URL as `${VITE_API_URL}/api/v1${path}` |
| Socket error `INVALID_API_KEY` or `INVALID_TOKEN` | Missing/wrong key or expired token: log out and sign in again |
| Socket error `Invalid namespace` | `VITE_API_URL` includes `/api/v1`: remove it |
| `403` when opening a conversation | The role does not match the endpoint (Guest opens, Staff claims) |
| "You already have an active conversation" | A Guest can only have one conversation that is not Closed |
| Styles not applied | Check that `src/index.css` contains `@import "tailwindcss";` and `@tailwindcss/vite` is in `vite.config.js` |

## Limitations (on purpose)

- No button to close a conversation.
- Only the last 100 messages are loaded; there is no infinite scroll.
- The token lives in `localStorage`, which is simple but exposed to XSS. A production app would use more careful storage.
- The API key is shipped to the browser.

## License

MIT