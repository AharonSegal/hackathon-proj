# Calendar App — Hebrew / Gregorian Calendar

A single-user personal calendar with:
- **Hebrew & Gregorian** dual calendar (toggle in Settings)
- **Event management** — create/edit/delete events with color coding
- **Daily Times (Zmanim)** — location-based Jewish prayer times
- **WhatsApp scheduling** — via WhatsApp Business Cloud API (Meta)
- **Email scheduling** — via SMTP with APScheduler
- **Settings** — holidays to display, zmanim location, calendar mode, SMTP/WA credentials

---

## Project Structure

```
hackathon-proj/
├── frontend/       React + TypeScript + Vite + Tailwind
└── backend/        Python FastAPI + SQLite + APScheduler
```

---

## Getting Started

### Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env        # fill in your credentials

uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

---

## Configuration (.env)

| Variable | Description |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Meta permanent access token |
| `WHATSAPP_PHONE_NUMBER_ID` | From Meta Business → WhatsApp → API Setup |
| `SMTP_HOST` | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (587 for STARTTLS) |
| `SMTP_USER` | Your email address |
| `SMTP_PASSWORD` | App password (not your login password) |

---

## Features

### Calendar
- Toggle **Hebrew-first** / **Gregorian-first** in Settings
- Hebrew dates in gematriya (א׳, ב׳ …)
- Configurable holidays: major/minor Jewish holidays, Rosh Chodesh, Shabbat, Israeli holidays
- Add events with scheduled emails/WhatsApp on any day

### Daily Times (Zmanim)
- Configure location (lat/lng/timezone) in Settings
- Alot HaShachar, Sunrise, Sof Zman Shma, Chatzot, Mincha Gedola, Plag HaMincha, Shkia, Tzet, Tzet Shabbat (R"T)

### Messages
- WhatsApp composer with templates, preview, immediate or scheduled
- Email composer with multi-recipient tags, immediate or scheduled
- Message log with status (pending / sent / failed)

### Settings
- Calendar mode toggle, week start
- Holiday display toggles (10 categories)
- Zmanim display toggles (11 times)
- SMTP + WhatsApp credentials with test buttons