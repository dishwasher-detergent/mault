import type { ScannedCard } from "@/interfaces/scanner.interface";
import type { ScryfallCardWithDistance } from "@/interfaces/scryfall.interface";
import type { IDBPDatabase } from "idb";
import { openDB } from "idb";

const DB_NAME = "mtg-vault";
const DB_VERSION = 1;
const STORE_NAME = "scannedCards";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "scanId" });
        }
      },
    });
  }
  return dbPromise;
}

export function generateScanId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function getAllCards(): Promise<ScannedCard[]> {
  const db = await getDb();
  const records: ScannedCard[] = await db.getAll(STORE_NAME);
  return records.sort((a, b) => b.scannedAt - a.scannedAt);
}

export async function putCard(record: ScannedCard): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, record);
}

export async function removeCard(scanId: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, scanId);
}

export async function updateCard(
  scanId: string,
  card: ScryfallCardWithDistance,
): Promise<void> {
  const db = await getDb();
  const existing: ScannedCard | undefined = await db.get(STORE_NAME, scanId);
  if (existing) {
    existing.card = card;
    await db.put(STORE_NAME, existing);
  }
}

export async function clearCards(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}
