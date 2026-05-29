"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useWebcam } from "@/hooks/useWebcam";
import { useFaceDetection } from "@/hooks/useFaceDetection";

const ROOM = "room-101";

export default function StudentView() {
  const socket = getSocket();
  const { videoRef, active: webcamActive, error: webcamError, start, stop } = useWebcam();
  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const latestScoreRef = useRef(0);

  const handleScore = useCallback(
    (score: number) => {
      latestScoreRef.current = score;
      if (socket.connected) {
        socket.emit("metric-update", { room: ROOM, score });
      }
    },
    [socket],
  );

  const { modelsLoaded, detecting, confusionScore, error: faceError } =
    useFaceDetection(videoRef, handleScore, webcamActive);

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      setConnected(true);
      socket.emit(
        "join-room",
        { room: ROOM, role: "student" },
        (ack: { success?: boolean }) => {
          if (ack?.success) setJoined(true);
        },
      );
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setJoined(false);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.disconnect();
    };
  }, [socket]);

  const errorMsg = webcamError || faceError;

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">EduPulse — Student View</h1>

      {/* Connection status */}
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
        />
        <span>{connected ? `Connected to ${ROOM}` : "Disconnected"}</span>
        {joined && <span className="text-green-600 ml-2">(joined)</span>}
      </div>

      {/* Error display */}
      {errorMsg && (
        <p className="rounded bg-red-100 px-4 py-2 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      {/* Webcam toggle */}
      <div className="flex gap-3">
        <button
          onClick={start}
          disabled={webcamActive}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-40"
        >
          Start Webcam
        </button>
        <button
          onClick={stop}
          disabled={!webcamActive}
          className="rounded bg-gray-600 px-4 py-2 text-white disabled:opacity-40"
        >
          Stop Webcam
        </button>
      </div>

      {/* Video feed (local only, never transmitted) */}
      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-[640px] max-w-full rounded border border-gray-300"
        />
        {webcamActive && (
          <div className="absolute bottom-2 left-2 rounded bg-black/60 px-3 py-1 text-xs text-white">
            {!modelsLoaded
              ? "Loading face models…"
              : detecting
                ? "Detecting expressions…"
                : "Detection paused"}
          </div>
        )}
      </div>

      {/* Metrics */}
      {webcamActive && modelsLoaded && (
        <div className="flex flex-col items-center gap-1 text-sm">
          <p>
            Confusion Score:{" "}
            <span className="font-mono font-semibold">
              {confusionScore.toFixed(4)}
            </span>
          </p>
          <div className="h-3 w-64 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-orange-500 transition-all"
              style={{ width: `${Math.min(confusionScore * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      <p className="max-w-md text-center text-xs text-gray-400">
        All face analysis runs locally in your browser. No images or video
        frames are sent over the network.
      </p>
    </div>
  );
}
