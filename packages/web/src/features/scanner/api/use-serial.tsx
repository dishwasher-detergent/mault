import { reportSerialEvent } from "@/features/notifications/api/notification-settings";
import type {
  SerialContextValue,
  SerialMessageListener,
} from "@/features/scanner/types";
import type { BinRoute } from "@magic-vault/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export type { SerialMessageListener } from "@/features/scanner/types";

const SerialContext = createContext<SerialContextValue | null>(null);

export function SerialProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("scanner");
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [firmwareVersion, setFirmwareVersion] = useState<string | null>(null);
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
    null,
  );
  const writableRef = useRef<WritableStream<Uint8Array> | null>(null);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const bufferRef = useRef("");
  const pendingRef = useRef<Array<(line: string) => void>>([]);
  const listenersRef = useRef(new Set<SerialMessageListener>());
  const disconnectingRef = useRef<Promise<void> | null>(null);
  const preTestHookRef = useRef<(() => Promise<void>) | null>(null);

  const decoderRef = useRef(new TextDecoder());

  const startReading = useCallback(
    async (
      reader: ReadableStreamDefaultReader<Uint8Array>,
      onEnd?: () => void,
    ) => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            bufferRef.current += decoderRef.current.decode(value, {
              stream: true,
            });
            const lines = bufferRef.current.split("\n");
            bufferRef.current = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              console.log("[Serial] ←", trimmed); // eslint-disable-line no-console -- hardware debug trace

              try {
                const parsed = JSON.parse(trimmed);
                for (const listener of listenersRef.current) {
                  listener(parsed);
                }
              } catch {
                console.warn("[Serial] Non-JSON message:", trimmed);
              }

              const pending = pendingRef.current.shift();
              if (pending) {
                pending(trimmed);
              }
            }
          }
        }
      } catch (e) {
        // Reader was cancelled (disconnect) - expected
        if (!(e instanceof DOMException && e.name === "NetworkError")) {
          console.error("[Serial] Read error:", e);
        }
      } finally {
        onEnd?.();
      }
    },
    [],
  );

  const waitForLine = useCallback((timeoutMs: number): Promise<string> => {
    return new Promise<string>((resolve) => {
      let wrapper: ((line: string) => void) | null = null;

      const timeout = setTimeout(() => {
        if (wrapper) {
          const idx = pendingRef.current.indexOf(wrapper);
          if (idx !== -1) pendingRef.current.splice(idx, 1);
        }
        resolve("");
      }, timeoutMs);

      wrapper = (line: string) => {
        clearTimeout(timeout);
        resolve(line);
      };

      pendingRef.current.push(wrapper);
    });
  }, []);

  const sendCommand = useCallback((data: string): Promise<boolean> => {
    if (!portRef.current || !writableRef.current) return Promise.resolve(false);

    return new Promise<boolean>((resolve) => {
      writeQueueRef.current = writeQueueRef.current.then(async () => {
        if (!writableRef.current) {
          resolve(false);
          return;
        }
        const writer = writableRef.current.getWriter();
        try {
          console.log("[Serial] →", data.trim()); // eslint-disable-line no-console -- hardware debug trace
          await writer.write(new TextEncoder().encode(data));
          resolve(true);
        } catch {
          resolve(false);
        } finally {
          writer.releaseLock();
        }
      });
    });
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

  const disconnect = useCallback(() => {
    const port = portRef.current;
    const reader = readerRef.current;

    // Clear refs and state immediately
    portRef.current = null;
    readerRef.current = null;
    writableRef.current = null;
    writeQueueRef.current = Promise.resolve();
    setIsConnected(false);
    setIsReady(false);
    setFirmwareVersion(null);

    // Reject any outstanding waiters
    for (const pending of pendingRef.current) {
      pending("");
    }
    pendingRef.current = [];
    bufferRef.current = "";

    // Async cleanup - stored so connect() can await it
    const cleanup = (async () => {
      if (reader) {
        try {
          await reader.cancel();
        } catch {}
      }

      if (port) {
        try {
          await port.close();
        } catch {}
      }
    })();

    disconnectingRef.current = cleanup.finally(() => {
      disconnectingRef.current = null;
    });

    return cleanup;
  }, []);

  const openPort = useCallback(
    async (port: SerialPort): Promise<boolean> => {
      if (!port.readable || !port.writable) {
        try {
          await port.open({ baudRate: 9600 });
        } catch {
          toast.error(t("serial.connectionFailed.title"), {
            description: t("serial.connectionFailed.description"),
          });
          void reportSerialEvent({
            command: "connect",
            sent: false,
            response: null,
          });
          return false;
        }
      }

      portRef.current = port;
      writableRef.current = port.writable;

      const reader = port.readable!.getReader();
      readerRef.current = reader;
      decoderRef.current = new TextDecoder();

      setIsConnected(true);

      startReading(reader, () => {
        if (portRef.current === port) {
          console.warn("[Serial] Stream ended unexpectedly, disconnecting");
          disconnect();
        }
      });

      (async () => {
        const bootLinePromise = waitForLine(5000);
        await sendCommand(JSON.stringify({ getStatus: true }) + "\n");
        const bootLine = await bootLinePromise;
        if (!portRef.current) return;
        try {
          const parsed = bootLine ? JSON.parse(bootLine) : null;
          if (typeof parsed?.version === "string") {
            setFirmwareVersion(parsed.version);
          }
        } catch {
          // ignore - version just stays unknown
        }
        if (preTestHookRef.current) {
          await preTestHookRef.current();
        }
        if (!portRef.current) return;
        toast.info(t("serial.testingDevice"));
        const ok = await sendTest();
        if (!portRef.current) return;
        if (ok) {
          toast.success(t("serial.deviceReady"));
        } else {
          toast.error(t("serial.deviceTestFailed.title"), {
            description: t("serial.deviceTestFailed.description"),
          });
          void reportSerialEvent({
            command: "test",
            sent: true,
            response: null,
          });
        }
      })();

      return true;
    },
    [startReading, waitForLine, sendCommand, sendTest, disconnect, t],
  );

  const connect = useCallback(async () => {
    if (disconnectingRef.current) {
      await disconnectingRef.current;
    }
    if (portRef.current) return;

    let port: SerialPort;
    try {
      port = await navigator.serial.requestPort();
    } catch {
      // User cancelled the port picker
      return;
    }

    await openPort(port);
  }, [openPort]);

  // Detect physical USB unplug
  useEffect(() => {
    if (!navigator.serial) return;
    const handleDisconnect = (event: Event) => {
      if (portRef.current && portRef.current === (event.target as SerialPort)) {
        console.warn("[Serial] Device unplugged");
        disconnect();
      }
    };
    navigator.serial.addEventListener("disconnect", handleDisconnect);
    return () => {
      navigator.serial.removeEventListener("disconnect", handleDisconnect);
    };
  }, [disconnect]);

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
    const listeners = listenersRef.current;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const subscribe = useCallback((listener: SerialMessageListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const registerPreTestHook = useCallback((fn: () => Promise<void>) => {
    const previous = preTestHookRef.current;
    preTestHookRef.current = previous
      ? async () => {
          try {
            await previous();
          } catch (e) {
            console.error("[Serial] Pre-test hook failed:", e); // eslint-disable-line no-console -- hardware debug trace
          }
          await fn();
        }
      : fn;
  }, []);

  const sendCommandWithNewline = useCallback(
    (data: string) => sendCommand(data + "\n"),
    [sendCommand],
  );

  const receiveResponse = useCallback(
    (timeoutMs = 5000) => waitForLine(timeoutMs),
    [waitForLine],
  );

  const binBusyRef = useRef(false);

  const sendRoute = useCallback(
    async (route: BinRoute): Promise<unknown | null> => {
      if (!portRef.current || !writableRef.current) return null;
      if (binBusyRef.current) return null;

      binBusyRef.current = true;
      try {
        const sent = await sendCommand(
          JSON.stringify({
            route: { module: route.module, direction: route.direction },
          }) + "\n",
        );
        if (!sent) return null;

        const response = await waitForLine(15000);
        if (!response) return null;

        try {
          return JSON.parse(response);
        } catch {
          console.warn("[Serial] Non-JSON response:", response);
          return null;
        }
      } finally {
        binBusyRef.current = false;
      }
    },
    [sendCommand, waitForLine],
  );

  return (
    <SerialContext
      value={{
        isConnected,
        isReady,
        firmwareVersion,
        connect,
        disconnect,
        sendRoute,
        sendTest,
        sendCommand: sendCommandWithNewline,
        receiveResponse,
        subscribe,
        registerPreTestHook,
      }}
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
