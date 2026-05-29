# EduPulse AI

Real-Time Student Engagement & Micro-Intervention Dashboard.

## Server (Phase 1)

Lightweight Node.js/Express server with Socket.io for real-time communication between student and teacher clients. Uses in-memory state management (no database required).

### Quick Start

```bash
cd server
npm install
npm start        # production
npm run dev      # development (auto-restart on changes)
```

The server listens on port **8080** by default (override with `PORT` env var).

### Socket Events

| Event              | Direction        | Payload                                     | Description                                   |
|--------------------|------------------|---------------------------------------------|-----------------------------------------------|
| `join-room`        | Client -> Server | `{ room, role }`                            | Join a room as `"teacher"` or `"student"`     |
| `metric-update`    | Client -> Server | `{ room, score }`                           | Student sends confusion score (0.0 - 1.0)     |
| `transcript-update`| Client -> Server | `{ room, transcript }`                      | Teacher sends latest lecture transcript        |
| `trigger-quiz`     | Client -> Server | `{ room, quizData }`                        | Teacher triggers a quiz broadcast              |
| `submit-answer`    | Client -> Server | `{ room, selectedIndex }`                   | Student submits quiz answer                    |
| `pulse-update`     | Server -> Client | `{ room, avgConfusion, studentCount }`      | Aggregated metrics sent to teacher             |
| `new-quiz`         | Server -> Client | Quiz object                                 | Quiz broadcast to all students in room         |
| `student-answer`   | Server -> Client | `{ studentId, selectedIndex }`              | Individual answer forwarded to teacher         |

### Health Check

`GET /` returns `{ "status": "ok", "uptime": <seconds> }`.
