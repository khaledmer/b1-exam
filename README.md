# B1 Mid-Term English Exam Platform

A timed, multiple-choice exam platform for B1 ESL students. A teacher starts the exam for everyone at once; students answer in their browser, and answers are saved after every click. Scores are calculated on the server, and the teacher downloads a PDF report per student.

**Stack:** React (Vite) + Tailwind CSS + Lucide icons + `html2pdf.js` on the frontend, Node.js + Express on the backend. Data is stored in a JSON file (`.data/db.json`), so no database is needed.

---

## Features

**Students**
- Join with an email address (no password).
- Every answer is saved to `localStorage` (`student_exam_state_<email>`). After a reload, a closed browser or a dropped connection, entering the same email restores the answers and the remaining time.
- A sticky countdown timer is based on the server clock, so every student sees the same time regardless of their device clock.
- When the timer reaches 00:00, all inputs lock and the answers are submitted automatically. If the connection is down, the submission is retried until the server's deadline passes.
- Students never see scores, checkmarks or correct answers. They only see a confirmation message.

**Teacher dashboard (`/teacher`, protected by a key)**
- Set the duration (default 60 minutes) and press **START EXAM FOR ALL**.
- Live submissions table: email, submission time, total /100, grammar /70, reading /30.
- **Copy All Student Emails** copies a comma-separated list.
- **Download Student PDF** creates a report with the exam title and date, the student email and submission time, the score breakdown, and a table of student answer vs correct answer.

**Server rules**
- Correct answers never leave the server, except on the key-protected teacher endpoint.
- Submissions arriving after `startTime + duration + 30 seconds` are rejected.
- Each email can submit once. Repeated submissions are ignored.

---

## Project structure

```
b1-exam/
├── client/                 React app (Vite)
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx         header + routes (/ and /teacher)
│       ├── Student.jsx     join, exam, timer, autosave, submit
│       ├── Teacher.jsx     dashboard, start button, table, PDF
│       └── index.css       Tailwind import
├── server/
│   ├── index.js            Express routes + serves the built client
│   └── store.js            JSON-file storage + grading
├── data/exam.json          question bank (answers + points)
├── vite.config.js
├── package.json
├── .env                    TEACHER_KEY and PORT (do not commit)
└── .data/db.json           created at runtime (session + submissions)
```

---

## Requirements

- **Node.js 20.6 or newer** (22 LTS recommended). The `.env` file is loaded with Node's built-in `--env-file` flag.
- npm (included with Node.js).

Check your version with `node -v`.

---

## Run locally (development)

```bash
npm install
npm run dev
```

This starts two processes:

| Process | URL |
|---|---|
| React dev server (Vite) | http://localhost:5173 (open this one) |
| Express API | http://localhost:3001 |

Vite proxies `/api` to Express, so you only use port 5173. The page reloads when you edit client code, and the server restarts when you edit server code.

**Try it:**
1. Open http://localhost:5173/teacher and enter the key from `.env` (default `change-me`).
2. Press **START EXAM FOR ALL**.
3. In another browser window (or a private window), open http://localhost:5173, enter an email and take the exam.
4. Watch the submission appear in the dashboard.

---

## Run locally for a real class (same Wi-Fi / LAN)

For an actual exam, use the production build. It runs on a single port and is faster than the dev server.

```bash
npm install
npm run build
npm start
```

The app is now at **http://localhost:3001**.

To let students on the same network join from their own devices:

1. Find your computer's local IP address:
   - Windows: run `ipconfig` and read **IPv4 Address**.
   - macOS: run `ipconfig getifaddr en0`.
   - Linux: run `hostname -I`.
2. Give students the address `http://<your-ip>:3001` (for example `http://192.168.1.20:3001`).
3. If students cannot connect, allow Node.js (or port 3001) through your computer's firewall. Students must be on the same network as you.
4. Keep the computer on and the terminal open for the whole exam.

> Opening `/teacher` over plain `http://` on a LAN is fine for a classroom. For the internet, use the Render deployment below, which gives you HTTPS.

---

## Configuration

Set these in the `.env` file locally, or in the Render dashboard when deployed.

| Variable | Default | Purpose |
|---|---|---|
| `TEACHER_KEY` | `change-me` | Password for the teacher dashboard. **Change it before any real use.** |
| `PORT` | `3001` | Port Express listens on. Render sets this itself. |

Example `.env`:

```
TEACHER_KEY=pick-a-long-secret
PORT=3001
```

---

## Deploy on Render

Render runs the Express server, which also serves the built React app, so you deploy **one Web Service**.

### 1. Put the project on GitHub

Before your first commit, make sure these lines are in `.gitignore` so secrets and build output are not uploaded:

```
node_modules/
.data/
.env
dist/
```

Then:

```bash
git init
git add .
git commit -m "B1 exam platform"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

### 2. Create the Web Service

1. Sign in to [render.com](https://render.com) and click **New → Web Service**.
2. Connect your GitHub account and select the repository.
3. Fill in the settings:

| Setting | Value |
|---|---|
| Language / Runtime | `Node` |
| Branch | `main` |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `node server/index.js` |
| Instance Type | see "Keeping the data" below |

Why these commands:
- `--include=dev` makes sure Vite and Tailwind (dev dependencies) are installed for the build step.
- The start command calls `node` directly instead of `npm start`, because there is no `.env` file on Render. Settings come from environment variables instead.

### 3. Add environment variables

In the **Environment** section, add:

| Key | Value |
|---|---|
| `TEACHER_KEY` | your secret teacher password |
| `NODE_VERSION` | `22` |

Do not set `PORT`. Render provides it automatically.

### 4. Keeping the data (important)

Render's filesystem is **ephemeral**. Anything the app writes, including the running exam and all submissions in `.data/db.json`, is **erased on every redeploy or restart**. Free instances also spin down after a period of inactivity (about 15 minutes at the time of writing) and lose their files when they restart.

Choose one of these:

**Option A: paid instance with a persistent disk (recommended for real exams).**
Persistent disks are available on paid Render services only.
1. Set the instance type to a paid plan (for example Starter).
2. Open the service, go to **Disks → Add Disk**.
3. Name it `exam-data`, size `1 GB`, and set the **Mount Path** to:

```
/opt/render/project/src/.data
```

Render redeploys after you save. The database file now survives restarts and redeploys.

**Option B: free instance (fine for testing only).**
Use it for trials. For a real exam on the free tier:
- Open the teacher dashboard a few minutes before and keep it open. It polls the server every 5 seconds, which keeps the service awake.
- Never redeploy or restart during the exam.
- Download all PDFs and copy the emails right after the exam, because the data can disappear afterwards.

### 5. Deploy and test

1. Click **Create Web Service**. The first build takes a few minutes.
2. When the status shows **Live**, open your URL (`https://<your-service>.onrender.com`).
3. Open `/teacher`, enter your `TEACHER_KEY`, and run a test exam with two email addresses.
4. Share the main URL with students.

### Notes for Render

- **Run a single instance.** Do not scale to multiple instances. The JSON file is local to one instance, and a persistent disk can attach to only one.
- **Auto-deploy.** Every push to `main` redeploys the service. Turn off **Auto-Deploy** in the service settings before an exam day so an accidental push cannot wipe a running session.
- **HTTPS** is provided automatically.
- **Updating the question bank** means editing `data/exam.json`, committing, and pushing. Do this before the exam, not during it.

---

## Running an exam

1. Open `/teacher` and sign in with the key.
2. Set the duration and press **START EXAM FOR ALL**. This sets the status to `ACTIVE` and records the start time on the server.
3. Students who are already on the page see the exam appear automatically within a few seconds. Students joining later get the remaining time, not a fresh 60 minutes.
4. After the deadline, use **Copy All Student Emails** and **Download Student PDF** for each row, then send the PDFs by email.

Pressing **START EXAM FOR ALL** again restarts the exam. It asks for confirmation, archives the current submissions, and clears the table.

---

## Editing the question bank

Questions live in `data/exam.json`. Each question looks like this:

```json
{
  "id": "q1",
  "text": "A coach isn't __________ a train for long journeys.",
  "options": ["as comfortable than", "so comfortable like", "as comfortable as", "more comfortable as"],
  "correctAnswer": 2,
  "points": 2,
  "explanation": "Optional. Shown in the Notes column of the teacher PDF."
}
```

- `correctAnswer` is the zero-based index of the right option (`0` is A, `2` is C).
- Grammar and reading points should add up to 70 and 30.
- The `explanation` field is optional. The PDF "Notes" column is empty without it.
- The reading section also has `passageTitle` and `passageText`. Use `\n\n` for paragraph breaks.

---

## API reference

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/exam` | none | Session state, server time, and the questions (without answers) once the exam is active |
| POST | `/api/submit` | none | Body `{ "email": "...", "answers": { "q1": 2, ... } }`. Graded on the server. |
| GET | `/api/teacher` | `x-teacher-key` header | Session, full question bank with answers, all submissions |
| POST | `/api/teacher` | `x-teacher-key` header | Body `{ "durationMinutes": 60 }`. Starts the exam for all. |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `node: bad option: --env-file` | Your Node.js is older than 20.6. Install Node 22 LTS. |
| `vite: not found` during the Render build | Make sure the build command is `npm install --include=dev && npm run build`. |
| Page loads locally but `/teacher` shows a blank page after refresh in production | Run `npm run build` first. Express serves the React app only when the `dist/` folder exists. |
| "Wrong teacher key" | The key must match `TEACHER_KEY` in `.env` (local) or in the Render environment settings. Restart the server after changing it. |
| Students cannot reach the LAN address | Check that everyone is on the same network, use the production build (port 3001), and allow Node.js through the firewall. |
| `EADDRINUSE: address already in use` | Another program is using the port. Change `PORT` in `.env`. |
| All submissions disappeared on Render | The instance restarted without a persistent disk. See "Keeping the data". |
| A student's answers are gone after the teacher restarted the exam | Saved answers belong to one exam session. Restarting creates a new session, so old answers are not restored. |

---

## Known limitations

- Students identify themselves by email only. Anyone can join with any address, so share the link only with your class.
- The JSON-file database suits one class on one server. For heavier use, replace `load()` and `save()` in `server/store.js` with MongoDB or PostgreSQL.
- The answer key is only as correct as `data/exam.json`. Review the questions and options before the exam.
