const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// In-memory session store
// ---------------------------------------------------------------------------
const sessions = {};

function getOrCreateSession(room) {
  if (!sessions[room]) {
    sessions[room] = {
      studentCount: 0,
      totalConfusionScore: 0,
      latestTranscript: "",
      teacherSocketId: null,
    };
  }
  return sessions[room];
}

// ---------------------------------------------------------------------------
// Health-check route
// ---------------------------------------------------------------------------
app.get("/", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

// ---------------------------------------------------------------------------
// Socket.io event handlers
// ---------------------------------------------------------------------------
io.on("connection", (socket) => {
  console.log(`[connect] ${socket.id}`);

  // -- join-room -------------------------------------------------------------
  socket.on("join-room", ({ room, role }, callback) => {
    if (!room || !role) {
      const err = "Missing room or role";
      if (typeof callback === "function") callback({ error: err });
      return;
    }

    socket.join(room);
    socket.data.room = room;
    socket.data.role = role;

    const session = getOrCreateSession(room);

    if (role === "teacher") {
      session.teacherSocketId = socket.id;
      console.log(`[join-room] teacher ${socket.id} -> ${room}`);
    } else if (role === "student") {
      session.studentCount += 1;
      console.log(
        `[join-room] student ${socket.id} -> ${room} (count: ${session.studentCount})`,
      );
    }

    if (typeof callback === "function") {
      callback({ success: true, room, role });
    }
  });

  // -- metric-update ----------------------------------------------------------
  socket.on("metric-update", ({ room, score }) => {
    if (!room || typeof score !== "number") return;

    const session = sessions[room];
    if (!session) return;

    session.totalConfusionScore += score;

    const avgConfusion =
      session.studentCount > 0
        ? session.totalConfusionScore / session.studentCount
        : 0;

    if (session.teacherSocketId) {
      io.to(session.teacherSocketId).emit("pulse-update", {
        room,
        avgConfusion: parseFloat(avgConfusion.toFixed(4)),
        studentCount: session.studentCount,
      });
    }
  });

  // -- transcript-update (teacher sends latest transcript) --------------------
  socket.on("transcript-update", ({ room, transcript }) => {
    if (!room || typeof transcript !== "string") return;

    const session = sessions[room];
    if (!session) return;

    session.latestTranscript = transcript;
  });

  // -- trigger-quiz -----------------------------------------------------------
  socket.on("trigger-quiz", ({ room, quizData }) => {
    if (!room || !quizData) return;

    io.to(room).emit("new-quiz", quizData);
    console.log(`[trigger-quiz] quiz broadcast to room ${room}`);
  });

  // -- submit-answer ----------------------------------------------------------
  socket.on("submit-answer", ({ room, selectedIndex }) => {
    if (!room || typeof selectedIndex !== "number") return;

    const session = sessions[room];
    if (!session) return;

    if (session.teacherSocketId) {
      io.to(session.teacherSocketId).emit("student-answer", {
        studentId: socket.id,
        selectedIndex,
      });
    }
  });

  // -- disconnect -------------------------------------------------------------
  socket.on("disconnect", () => {
    const { room, role } = socket.data;
    console.log(`[disconnect] ${socket.id} (${role || "unknown"})`);

    if (!room || !sessions[room]) return;

    const session = sessions[room];

    if (role === "student") {
      session.studentCount = Math.max(0, session.studentCount - 1);
    } else if (role === "teacher") {
      if (session.teacherSocketId === socket.id) {
        session.teacherSocketId = null;
      }
    }

    if (session.studentCount === 0 && !session.teacherSocketId) {
      delete sessions[room];
      console.log(`[cleanup] session ${room} removed`);
    }
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`EduPulse server listening on port ${PORT}`);
});
