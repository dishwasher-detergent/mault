import { neonConfig, Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(pool, { schema });

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function authQuery<T>(
  jwtClaims: string,
  callback: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('request.jwt.claims', ${jwtClaims}, true)`,
    );
    return callback(tx);
  });
}
