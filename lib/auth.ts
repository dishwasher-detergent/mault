import { createAuthClient } from "@neondatabase/neon-js/auth";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react";

export const authClient = createAuthClient(
	import.meta.env.VITE_NEON_AUTH_URL,
	{ adapter: BetterAuthReactAdapter() },
);
