import type { SyncState } from "@magic-vault/shared";
import { fork, type ChildProcess } from "node:child_process";
import { setPriority } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendDiscordNotification } from "./discord";
import { SYNC_SOURCES } from "./sync-sources";
import type { SyncWorkerMessage } from "./sync-worker-messages";

export { SYNC_SOURCES };

type SseWriter = (event: string, data: unknown) => void;

let state: SyncState = {
  status: "idle",
  gameKey: "",
  lang: "en",
  total: 0,
  processed: 0,
  skipped: 0,
  errors: 0,
  startedAt: null,
  logs: [],
};

let child: ChildProcess | null = null;
const writers = new Set<SseWriter>();

function addLog(msg: string) {
  state = { ...state, logs: [...state.logs.slice(-199), msg] };
  emit("log", { line: msg });
}

function emit(event: string, data: unknown) {
  for (const writer of writers) {
    try {
      writer(event, data);
    } catch {}
  }
}

export function getStatus(): SyncState {
  return { ...state, logs: [...state.logs] };
}

export function subscribeSSE(writer: SseWriter): () => void {
  writers.add(writer);
  writer("status", getStatus());
  return () => writers.delete(writer);
}

export function cancelSync(): void {
  if (state.status === "running") child?.send("cancel");
}

const WORKER_NICENESS = parseInt(process.env.SYNC_WORKER_NICENESS ?? "10", 10);

function resolveWorkerEntry(): { modulePath: string; execArgv: string[] } {
  const here = fileURLToPath(import.meta.url);
  const isDev = here.endsWith(".ts");
  const dir = path.dirname(here);
  return isDev
    ? {
        modulePath: path.join(dir, "../sync-worker.ts"),
        execArgv: ["-r", "tsx/cjs"],
      }
    : { modulePath: path.join(dir, "../sync-worker.js"), execArgv: [] };
}

function notifyFailure(orgId: string | undefined, message: string): void {
  if (!orgId) return;
  void sendDiscordNotification(orgId, {
    title: "Magic Vault — Sync Failed",
    description: `The card database sync job encountered a fatal error.\n\n**Error:** ${message}`,
    color: 0xed4245,
    timestamp: new Date().toISOString(),
  });
}

export function startSync(
  orgId: string | undefined,
  gameKey: string,
  lang: string = "en",
): void {
  if (state.status === "running") return;

  const source = SYNC_SOURCES[gameKey];
  if (!source) return;
  if (!source.languages.includes(lang)) return;

  state = {
    status: "running",
    gameKey,
    lang,
    total: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    startedAt: new Date().toISOString(),
    logs: [],
  };
  emit("status", getStatus());

  const { modulePath, execArgv } = resolveWorkerEntry();
  child = fork(modulePath, [gameKey, lang], {
    execArgv,
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });

  try {
    if (child.pid) setPriority(child.pid, WORKER_NICENESS);
  } catch {}

  child.on("message", (msg: SyncWorkerMessage) => {
    switch (msg.type) {
      case "total":
        state = { ...state, total: msg.total };
        emit("status", getStatus());
        break;
      case "log":
        addLog(msg.line);
        break;
      case "progress":
        state = {
          ...state,
          processed: msg.processed,
          skipped: msg.skipped,
          errors: msg.errors,
        };
        emit("progress", {
          processed: msg.processed,
          skipped: msg.skipped,
          errors: msg.errors,
          currentCard: msg.currentCard,
        });
        break;
      case "done":
        state = {
          ...state,
          status: msg.status,
          processed: msg.processed,
          skipped: msg.skipped,
          errors: msg.errors,
        };
        emit("done", {
          status: msg.status,
          processed: msg.processed,
          skipped: msg.skipped,
          errors: msg.errors,
        });
        break;
      case "fatal":
        state = { ...state, status: "failed" };
        addLog(`Fatal error: ${msg.message}`);
        emit("error", { message: msg.message });
        notifyFailure(orgId, msg.message);
        break;
    }
  });

  child.on("exit", (code) => {
    child = null;
    if (state.status === "running") {
      const msg = `Sync worker exited unexpectedly (code ${code}).`;
      state = { ...state, status: "failed" };
      addLog(msg);
      emit("error", { message: msg });
      notifyFailure(orgId, msg);
    }
  });
}
