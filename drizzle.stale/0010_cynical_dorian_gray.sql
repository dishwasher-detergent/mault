ALTER TABLE "module_configs" ALTER COLUMN "pusher_left" SET DEFAULT 150;--> statement-breakpoint
ALTER TABLE "module_configs" ALTER COLUMN "pusher_right" SET DEFAULT 460;--> statement-breakpoint
ALTER TABLE "module_configs" ADD COLUMN "paddle_closed" integer DEFAULT 150 NOT NULL;--> statement-breakpoint
ALTER TABLE "module_configs" ADD COLUMN "paddle_open" integer DEFAULT 307 NOT NULL;--> statement-breakpoint
ALTER TABLE "module_configs" DROP COLUMN "paddle_left";--> statement-breakpoint
ALTER TABLE "module_configs" DROP COLUMN "paddle_neutral";--> statement-breakpoint
ALTER TABLE "module_configs" DROP COLUMN "paddle_right";