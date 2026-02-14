"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type SerialMessageListener = (message: unknown) => void;

interface SerialContextValue {
  isConnected: boolean;
  isReady: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendBin: (binNumber: number) => Promise<unknown | null>;
  sendTest: () => Promise<boolean>;
  subscribe: (listener: SerialMessageListener) => () => void;
}

const SerialContext = createContext<SerialContextValue | null>(null);

export function SerialProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const readableRef = useRef<ReadableStream<string> | null>(null);
  const writableRef = useRef<WritableStream<Uint8Array> | null>(null);
  const bufferRef = useRef("");
  const pendingRef = useRef<Array<(line: string) => void>>([]);
  const listenersRef = useRef(new Set<SerialMessageListener>());

  const startReading = useCallback(
    async (reader: ReadableStreamDefaultReader<string>) => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            bufferRef.current += value;
            const lines = bufferRef.current.split("\n");
            bufferRef.current = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              console.log("[Serial] ←", trimmed);

              // Notify all subscribers with parsed JSON
              try {
                const parsed = JSON.parse(trimmed);
                for (const listener of listenersRef.current) {
                  listener(parsed);
                }
              } catch {
                // Not JSON — skip listener notification
              }

              // Resolve pending request/response promise
              const pending = pendingRef.current.shift();
              if (pending) {
                pending(trimmed);
              }
            }
          }
        }
      } catch (e) {
        // Reader was cancelled (disconnect) — expected
        if (!(e instanceof DOMException && e.name === "NetworkError")) {
          console.error("[Serial] Read error:", e);
        }
      }
    },
    [],
  );

  const waitForLine = useCallback((timeoutMs: number): Promise<string> => {
    return new Promise<string>((resolve) => {
      const timeout = setTimeout(() => {
        const idx = pendingRef.current.indexOf(resolve);
        if (idx !== -1) pendingRef.current.splice(idx, 1);
        resolve("");
      }, timeoutMs);

      pendingRef.current.push((line: string) => {
        clearTimeout(timeout);
        resolve(line);
      });
    });
  }, []);

  const sendCommand = useCallback(async (data: string): Promise<boolean> => {
    if (!portRef.current || !writableRef.current) return false;

    const encoder = new TextEncoder();
    const writer = writableRef.current.getWriter();
    try {
      await writer.write(encoder.encode(data));
      return true;
    } catch {
      return false;
    } finally {
      writer.releaseLock();
    }
  }, []);

  const sendTest = useCallback(async (): Promise<boolean> => {
    const sent = await sendCommand(JSON.stringify({ test: true }) + "\n");
    if (!sent) return false;

    const response = await waitForLine(10000);
    if (!response) return false;

    try {
      const parsed = JSON.parse(response);
      return parsed.status === "test_complete";
    } catch {
      return false;
    }
  }, [sendCommand, waitForLine]);

  const connect = useCallback(async () => {
    if (portRef.current) return;

    let port: SerialPort;
    try {
      port = await navigator.serial.requestPort();
    } catch {
      // User cancelled the port picker
      return;
    }

    try {
      await port.open({ baudRate: 9600 });
    } catch (e) {
      console.error("[Serial] Failed to open port:", e);
      return;
    }

    portRef.current = port;
    writableRef.current = port.writable;

    const textDecoder = new TextDecoderStream();
    readableRef.current = port.readable!.pipeThrough(textDecoder as unknown as TransformStream<Uint8Array, string>);
    const reader = readableRef.current.getReader();
    readerRef.current = reader;

    setIsConnected(true);

    startReading(reader);

    // Send the test command without waiting for the response —
    // isReady will be set by the subscription listener below.
    (async () => {
      // Wait for the Arduino's initial {"status":"ready"} message
      const readyLine = await waitForLine(5000);
      if (readyLine) {
        try {
          const parsed = JSON.parse(readyLine);
          console.log("[Serial] Arduino ready:", parsed);
        } catch {
          console.log("[Serial] Initial message:", readyLine);
        }
      }

      // Fire the test command (response handled by subscription)
      await sendCommand(JSON.stringify({ test: true }) + "\n");
    })();
  }, [startReading, waitForLine, sendCommand]);

  const disconnect = useCallback(async () => {
    const port = portRef.current;

    // Clear refs immediately so connect() won't bail early
    portRef.current = null;
    writableRef.current = null;
    readableRef.current = null;
    setIsConnected(false);
    setIsReady(false);

    // Reject any outstanding waiters
    for (const pending of pendingRef.current) {
      pending("");
    }
    pendingRef.current = [];
    bufferRef.current = "";

    // Cancel reader first so the read loop exits
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch {}
      readerRef.current = null;
    }

    // Close port and wait for it to fully close
    if (port) {
      try {
        await port.close();
      } catch {}
    }
  }, []);

  // Drive isReady from subscription events
  useEffect(() => {
    const listener: SerialMessageListener = (msg) => {
      if (
        typeof msg === "object" &&
        msg !== null &&
        "status" in msg &&
        (msg as Record<string, unknown>).status === "test_complete"
      ) {
        setIsReady(true);
      }
    };
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const subscribe = useCallback((listener: SerialMessageListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const sendBin = useCallback(
    async (binNumber: number): Promise<unknown | null> => {
      if (!portRef.current || !writableRef.current) return null;

      const sent = await sendCommand(JSON.stringify({ bin: binNumber }) + "\n");
      if (!sent) return null;

      const response = await waitForLine(3000);
      if (!response) return null;

      try {
        return JSON.parse(response);
      } catch {
        console.warn("[Serial] Non-JSON response:", response);
        return null;
      }
    },
    [sendCommand, waitForLine],
  );

  return (
    <SerialContext
      value={{ isConnected, isReady, connect, disconnect, sendBin, sendTest, subscribe }}
    >
      {children}
    </SerialContext>
  );
}

export function useSerial() {
  const context = useContext(SerialContext);
  if (!context) {
    throw new Error("useSerial must be used within a SerialProvider");
  }
  return context;
}

/**
 * Subscribe to all parsed JSON messages from the Arduino.
 * The callback is stable across re-renders (uses a ref internally).
 */
export function useSerialMessage(listener: SerialMessageListener) {
  const { subscribe } = useSerial();
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    return subscribe((msg) => listenerRef.current(msg));
  }, [subscribe]);
}
