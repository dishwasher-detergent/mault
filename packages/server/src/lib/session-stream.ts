type SseWriter = (event: string, data: unknown) => void;

export interface ViewerInfo {
  userId: string;
  displayName: string;
}

interface ViewerEntry extends ViewerInfo {
  writer: SseWriter;
}

interface SessionEntry {
  orgId: string;
  viewers: Set<ViewerEntry>;
}

const sessions = new Map<string, SessionEntry>();
const orgCountWriters = new Map<string, Set<SseWriter>>();

function emitToOrg(orgId: string, event: string, data: unknown) {
  const writers = orgCountWriters.get(orgId);
  if (!writers) return;
  for (const writer of writers) {
    try {
      writer(event, data);
    } catch {
      /* writer disconnected */
    }
  }
}

function broadcastViewers(guid: string, session: SessionEntry) {
  const viewers = Array.from(session.viewers).map(
    ({ userId, displayName }) => ({ userId, displayName }),
  );
  for (const entry of session.viewers) {
    try {
      entry.writer("viewers_updated", { viewers });
    } catch {
      /* disconnected */
    }
  }
  emitToOrg(session.orgId, "live_count", { guid, count: session.viewers.size });
}

export function subscribeSession(
  guid: string,
  orgId: string,
  userId: string,
  displayName: string,
  writer: SseWriter,
): () => void {
  let session = sessions.get(guid);
  if (!session) {
    session = { orgId, viewers: new Set() };
    sessions.set(guid, session);
  }
  const entry: ViewerEntry = { userId, displayName, writer };
  session.viewers.add(entry);
  broadcastViewers(guid, session);

  return () => {
    session!.viewers.delete(entry);
    if (session!.viewers.size === 0) {
      sessions.delete(guid);
      emitToOrg(session!.orgId, "live_count", { guid, count: 0 });
    } else {
      broadcastViewers(guid, session!);
    }
  };
}

export function emitToSession(
  guid: string,
  event: string,
  data: unknown,
): void {
  const session = sessions.get(guid);
  if (!session) return;
  for (const entry of session.viewers) {
    try {
      entry.writer(event, data);
    } catch {
      /* disconnected */
    }
  }
}

export function sessionListenerCount(guid: string): number {
  return sessions.get(guid)?.viewers.size ?? 0;
}

export function getSessionViewers(guid: string): ViewerInfo[] {
  return Array.from(sessions.get(guid)?.viewers ?? []).map(
    ({ userId, displayName }) => ({ userId, displayName }),
  );
}

export function getLiveCountsForGuids(guids: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const guid of guids) {
    const n = sessionListenerCount(guid);
    if (n > 0) result[guid] = n;
  }
  return result;
}

export function subscribeOrgLiveCounts(
  orgId: string,
  writer: SseWriter,
): () => void {
  let writers = orgCountWriters.get(orgId);
  if (!writers) {
    writers = new Set();
    orgCountWriters.set(orgId, writers);
  }
  writers.add(writer);
  return () => {
    writers!.delete(writer);
    if (writers!.size === 0) orgCountWriters.delete(orgId);
  };
}
