# B1 Mid-Term English Exam Platform

A timed, multiple-choice exam platform for B1 ESL students. A teacher starts the exam for everyone at once; students answer in their browser, and answers are saved after every click. Scores are calculated on the server, and the teacher downloads a PDF report per student.

**Stack:** React (Vite) + Tailwind CSS + Lucide icons + `html2pdf.js` on the frontend, Node.js + Express on the backend. Data is stored in a **PostgreSQL** database.

---

## Features

**Students**
- Join with a full name and email address (no password).
- Every answer is saved to `localStorage` (`student_exam_state_<email>`). After a reload, a closed browser or a dropped connection, entering the same email restores the answers and the remaining time.
- A sticky countdown timer is based on the server clock, so every student sees the same time regardless of their device clock.
- When the timer reaches 00:00, all inputs lock and the answers are submitted automatically. If the connection is down, the submission is retried until the server's deadline passes.
- Students never see scores, checkmarks or correct answers. They only see a confirmation message.
- Answers are also saved in the database as students click. If a browser closes or loses connection before the deadline, the server submits the saved answers automatically.

**Teacher dashboard (`/teacher`, protected by a key)**
- Set the duration (default 60 minutes) and press **START EXAM FOR ALL**.
- Press **STOP EXAM FOR ALL** to end the exam immediately. Every student is locked and their answers are submitted.
- Live submissions table: email, submission time, total /100, grammar /70, reading /30.
- **Copy All Student Emails** copies a comma-separated list.
- **Download Student PDF** creates a report with the exam title and date, the student email and submission time, the score breakdown, and a table of student answer vs correct answer.

**Server rules**
- Correct answers never leave the server, except on the key-protected teacher endpoint.
- Submissions arriving more than 30 seconds after the end time (the scheduled end, or the moment the teacher pressed Stop) are rejected. Students with saved answers who did not submit are submitted automatically (marked "auto-submitted" in the table).
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
│   └── store.js            PostgreSQL access, table setup, grading
├── data/exam.json          question bank (answers + points)
├── vite.config.js
├── package.json
└── .env                    TEACHER_KEY, PORT, DATABASE_URL (do not commit)
```

---

## Requirements

- **Node.js 20.6 or newer** (22 LTS recommended). The `.env` file is loaded with Node's built-in `--env-file` flag.
- npm (included with Node.js).
- PostgreSQL 14 or newer, local or hosted (see **Database** below).

Check your version with `node -v`.

---

## Database

Everything is stored in **PostgreSQL**: the exam session (status, start time, duration), each student's saved answers while they work (`drafts`), and the final submissions with scores (`submissions`). The tables are created automatically when the server starts, so there is nothing to migrate.

The server reads the connection string from the `DATABASE_URL` environment variable and refuses to start without it. Starting a new exam does not delete the previous one: older submissions stay in the database, and the dashboard shows only the current exam.

### Set up PostgreSQL on your computer

Pick one option.

**A. Docker** (quickest if Docker Desktop is installed):

```bash
docker run --name b1-exam-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=b1exam -p 5432:5432 -d postgres:16
```

Use `DATABASE_URL=postgres://postgres:postgres@localhost:5432/b1exam`. Next time, start it with `docker start b1-exam-db`.

**B. PostgreSQL installer:**
1. Download it from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) and install it. Remember the password you set for the `postgres` user and keep port `5432`.
2. Open **SQL Shell (psql)** and run `CREATE DATABASE b1exam;`
3. Use `DATABASE_URL=postgres://postgres:<your-password>@localhost:5432/b1exam`. If the password has special characters, URL-encode them.

**C. A Render database from your computer:** create the database on Render (see below) and use its **External Database URL**. SSL is turned on automatically for `render.com` hosts.

Put the line in your `.env` file (see **Configuration**), then run `npm run dev`. You should see `B1 exam server on 3001` in the terminal.

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
| `PGSSL` | off | Set to `true` if your hosted database requires SSL (automatic for `render.com` hosts). |
| `PORT` | `3001` | Port Express listens on. Render sets this itself. |

Example `.env`:

```
TEACHER_KEY=pick-a-long-secret
PORT=3001
DATABASE_URL=postgres://postgres:postgres@localhost:5432/b1exam
```

---

## Deploy on Render

You create two things on Render, a **PostgreSQL database** and a **Web Service**, and connect them with one environment variable (`DATABASE_URL`).

### 1. Put the project on GitHub

Make sure `.gitignore` contains these lines so secrets and build output are not uploaded:

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

### 2. Create the PostgreSQL database

1. In the Render dashboard click **New → PostgreSQL**.
2. Enter a name (for example `b1-exam-db`), choose a region, and choose a plan.
3. Click **Create Database** and wait until its status is **Available**.
4. On the database page, copy the **Internal Database URL**.

### 3. Create the Web Service

1. Click **New → Web Service** and select your GitHub repository.
2. Use these settings:

| Setting | Value |
|---|---|
| Language / Runtime | `Node` |
| Region | the **same region** as the database |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `node server/index.js` |

3. Under **Environment Variables**, add:

| Key | Value |
|---|---|
| `DATABASE_URL` | the **Internal Database URL** you copied in step 2 |
| `TEACHER_KEY` | your secret teacher password |
| `NODE_VERSION` | `22` |

4. Click **Create Web Service**. Do not set `PORT`. Render provides it.

That is the whole connection: the server reads `DATABASE_URL`, connects to the database, and creates its tables on the first start.

### 4. Test it

When the service shows **Live**, open `https://<your-service>.onrender.com/teacher`, sign in with your `TEACHER_KEY`, and run a test exam with two email addresses. In the web service **Logs** you should see `B1 exam server on ...` and no database errors.

### Good to know

- **Free database:** a free Render database expires 30 days after creation and has no backups. Create it shortly before the exam, or choose a paid plan to keep the results.
- **Free web service:** it spins down when idle, and the first request afterwards can take a minute. Open the teacher page a few minutes before the exam. Your data stays in the database.
- **Auto-deploy:** every push to `main` redeploys the service. Turn off **Auto-Deploy** on exam day.
- **Question bank changes:** edit `data/exam.json`, commit, and push, before the exam.

---

## Running an exam

1. Open `/teacher` and sign in with the key.
2. Set the duration and press **START EXAM FOR ALL**. This sets the status to `ACTIVE` and records the start time on the server.
3. Students who are already on the page see the exam appear automatically within a few seconds. Students joining later get the remaining time, not a fresh 60 minutes.
4. After the deadline, use **Copy All Student Emails** and **Download Student PDF** for each row, then send the PDFs by email.

Press **STOP EXAM FOR ALL** to end the exam early. Students are locked within a few seconds and their answers are submitted. Pressing **START EXAM FOR ALL** again begins a new exam: the table shows only the new exam, and earlier submissions stay in the database.

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
| POST | `/api/draft` | none | Body `{ "name": "...", "email": "...", "answers": { ... } }`. Saves in-progress answers. |
| POST | `/api/submit` | none | Body `{ "name": "...", "email": "...", "answers": { "q1": 2, ... } }`. Graded on the server. |
| GET | `/api/teacher` | `x-teacher-key` header | Session, full question bank with answers, all submissions |
| POST | `/api/teacher` | `x-teacher-key` header | Body `{ "durationMinutes": 60 }`. Starts the exam for all. |
| POST | `/api/teacher/stop` | `x-teacher-key` header | Ends the exam immediately for all. |

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
| `DATABASE_URL is not set` | Add it to `.env` (local) or to the web service environment (Render). |
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL is not running. Start the Docker container or the PostgreSQL service. |
| `password authentication failed` | The user or password in `DATABASE_URL` is wrong. |
| `SSL/TLS required` or `no pg_hba.conf entry` | The host needs SSL. Set `PGSSL=true`. |
| `getaddrinfo ENOTFOUND dpg-...` | You used the Internal URL from outside Render, or the web service and database are in different regions. Use the External URL on your computer and the same region on Render. |
| The Render database stopped working after a month | Free databases expire after 30 days. Upgrade it or create a new one. |
| A student's answers are gone after the teacher restarted the exam | Saved answers belong to one exam session. Restarting creates a new session, so old answers are not restored. |

---

## Known limitations

- Students identify themselves by email only. Anyone can join with any address, so share the link only with your class.
- The free Render database expires after 30 days. Export results (PDFs) after each exam, or use a paid plan.
- The answer key is only as correct as `data/exam.json`. Review the questions and options before the exam.
