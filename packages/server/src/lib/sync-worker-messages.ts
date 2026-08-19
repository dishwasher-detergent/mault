export type SyncWorkerMessage =
  | { type: "total"; total: number }
  | { type: "log"; line: string }
  | {
      type: "progress";
      processed: number;
      skipped: number;
      errors: number;
      currentCard?: string;
    }
  | {
      type: "done";
      status: "completed" | "cancelled";
      processed: number;
      skipped: number;
      errors: number;
    }
  | { type: "fatal"; message: string };
