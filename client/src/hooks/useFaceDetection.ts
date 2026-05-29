"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";

const DETECTION_INTERVAL_MS = 2000;

interface FaceDetectionState {
  modelsLoaded: boolean;
  detecting: boolean;
  confusionScore: number;
  error: string | null;
}

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onScore: (score: number) => void,
  enabled: boolean,
) {
  const [state, setState] = useState<FaceDetectionState>({
    modelsLoaded: false,
    detecting: false,
    confusionScore: 0,
    error: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceExpressionNet.loadFromUri("/models");
        if (!cancelled) {
          setState((prev) => ({ ...prev, modelsLoaded: true }));
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            error: `Failed to load face-api models: ${err}`,
          }));
        }
      }
    }

    loadModels();

    return () => {
      cancelled = true;
    };
  }, []);

  const detect = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.paused || video.ended) return;

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detection) {
        const { sad, fearful, surprised } = detection.expressions;
        const score = (sad + fearful + surprised) / 3;
        const rounded = parseFloat(score.toFixed(4));

        setState((prev) => ({ ...prev, confusionScore: rounded }));
        onScore(rounded);
      }
    } catch {
      // silently skip frame errors
    }
  }, [videoRef, onScore]);

  useEffect(() => {
    if (!state.modelsLoaded || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setState((prev) => ({ ...prev, detecting: false }));
      }
      return;
    }

    setState((prev) => ({ ...prev, detecting: true }));
    intervalRef.current = setInterval(detect, DETECTION_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.modelsLoaded, enabled, detect]);

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setState((prev) => ({ ...prev, detecting: false }));
    }
  }, []);

  const resume = useCallback(() => {
    if (state.modelsLoaded && enabled && !intervalRef.current) {
      setState((prev) => ({ ...prev, detecting: true }));
      intervalRef.current = setInterval(detect, DETECTION_INTERVAL_MS);
    }
  }, [state.modelsLoaded, enabled, detect]);

  return { ...state, pause, resume };
}
