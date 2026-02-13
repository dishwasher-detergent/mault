"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

interface SerialContextValue {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendBin: (binNumber: number) => Promise<unknown | null>;
}

const SerialContext = createContext<SerialContextValue | null>(null);

export function SerialProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const readableRef = useRef<ReadableStream<string> | null>(null);
  const writableRef = useRef<WritableStream<Uint8Array> | null>(null);
  // Buffer for incoming serial data; responses are newline-delimited
  const bufferRef = useRef("");
  // Queue of pending resolve callbacks waiting for a serial response line
  const pendingRef = useRef<Array<(line: string) => void>>([]);

  const startReading = useCallback(async (reader: ReadableStreamDefaultReader<string>) => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          bufferRef.current += value;
          const lines = bufferRef.current.split("\n");
          // Keep the last (possibly incomplete) chunk in the buffer
          bufferRef.current = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const pending = pendingRef.current.shift();
            if (pending) {
              pending(trimmed);
            } else {
              console.log("[Serial] Unhandled:", trimmed);
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
  }, []);

  const connect = useCallback(async () => {
    if (portRef.current) return;

    let port: SerialPort;
    try {
      port = await navigator.serial.requestPort();
    } catch {
      // User cancelled the port picker
      return;
    }

    await port.open({ baudRate: 9600 });

    portRef.current = port;
    writableRef.current = port.writable;

    const textDecoder = new TextDecoderStream();
    readableRef.current = port.readable!.pipeThrough(textDecoder);
    const reader = readableRef.current.getReader();
    readerRef.current = reader;

    setIsConnected(true);

    // Start the background read loop
    startReading(reader);
  }, [startReading]);

  const disconnect = useCallback(async () => {
    // Cancel reader first so the read loop exits
    if (readerRef.current) {
      try { await readerRef.current.cancel(); } catch {}
      readerRef.current = null;
    }

    if (portRef.current) {
      try { await portRef.current.close(); } catch {}
      portRef.current = null;
    }

    writableRef.current = null;
    readableRef.current = null;
    bufferRef.current = "";
    // Reject any outstanding waiters
    for (const pending of pendingRef.current) {
      pending("");
    }
    pendingRef.current = [];
    setIsConnected(false);
  }, []);

  const sendBin = useCallback(async (binNumber: number): Promise<unknown | null> => {
    if (!portRef.current || !writableRef.current) return null;

    const command = JSON.stringify({ bin: binNumber }) + "\n";
    const encoder = new TextEncoder();
    const writer = writableRef.current.getWriter();
    try {
      await writer.write(encoder.encode(command));
    } finally {
      writer.releaseLock();
    }

    // Wait for the Arduino's response line (with timeout)
    const response = await new Promise<string>((resolve) => {
      const timeout = setTimeout(() => {
        const idx = pendingRef.current.indexOf(resolve);
        if (idx !== -1) pendingRef.current.splice(idx, 1);
        resolve("");
      }, 3000);

      pendingRef.current.push((line: string) => {
        clearTimeout(timeout);
        resolve(line);
      });
    });

    if (!response) return null;

    try {
      return JSON.parse(response);
    } catch {
      console.warn("[Serial] Non-JSON response:", response);
      return null;
    }
  }, []);

  return (
    <SerialContext value={{ isConnected, connect, disconnect, sendBin }}>
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
