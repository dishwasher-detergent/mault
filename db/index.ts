import { auth } from "@/lib/auth/server";
import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function authQuery<T>(
  callback: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const { data } = await auth.token();
  if (!data?.token) throw new Error("No Neon auth token available");

  const [, payload] = data.token.split(".");
  const claims = Buffer.from(payload, "base64url").toString();

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('request.jwt.claims', ${claims}, true)`,
    );
    return callback(tx);
  });
}
