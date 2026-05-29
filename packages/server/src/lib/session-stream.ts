type SseWriter = (event: string, data: unknown) => void;

export interface ViewerInfo {
  userId: string;
  displayName: string;
}

interface ViewerEntry extends ViewerInfo {
  writer: SseWriter;
}

const sessions = new Map<string, Set<ViewerEntry>>();

function broadcastViewers(guid: string, entries: Set<ViewerEntry>) {
  const viewers = Array.from(entries).map(({ userId, displayName }) => ({ userId, displayName }));
  for (const entry of entries) {
    try { entry.writer("viewers_updated", { viewers }); } catch { /* disconnected */ }
  }
}

export function subscribeSession(
  guid: string,
  userId: string,
  displayName: string,
  writer: SseWriter,
): () => void {
  let entries = sessions.get(guid);
  if (!entries) { entries = new Set(); sessions.set(guid, entries); }
  const entry: ViewerEntry = { userId, displayName, writer };
  entries.add(entry);
  broadcastViewers(guid, entries);

  return () => {
    entries!.delete(entry);
    if (entries!.size === 0) {
      sessions.delete(guid);
    } else {
      broadcastViewers(guid, entries!);
    }
  };
}

export function emitToSession(guid: string, event: string, data: unknown): void {
  const entries = sessions.get(guid);
  if (!entries) return;
  for (const entry of entries) {
    try { entry.writer(event, data); } catch { /* disconnected */ }
  }
}

export function sessionListenerCount(guid: string): number {
  return sessions.get(guid)?.size ?? 0;
}

export function getSessionViewers(guid: string): ViewerInfo[] {
  return Array.from(sessions.get(guid) ?? []).map(({ userId, displayName }) => ({ userId, displayName }));
}
