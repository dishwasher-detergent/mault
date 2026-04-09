import { SET_NAME_MAX_LENGTH } from "@magic-vault/shared";
import { z } from "zod";

export const createCollectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(SET_NAME_MAX_LENGTH, `Name must be ${SET_NAME_MAX_LENGTH} characters or less`),
});

export type CreateCollectionFormValues = z.infer<typeof createCollectionSchema>;
