ALTER TABLE "bin_sets" ADD CONSTRAINT "bin_sets_guid_idx" UNIQUE("guid");--> statement-breakpoint
ALTER TABLE "bins" ADD CONSTRAINT "bins_guid_idx" UNIQUE("guid");