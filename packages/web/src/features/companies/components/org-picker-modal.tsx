import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { neon } from "@/lib/auth/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconBuilding, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useOrg } from "../api/use-organization";

const ORG_KEY = "activeOrgId";

const createSchema = z.object({ name: z.string().min(1) });
type CreateValues = z.infer<typeof createSchema>;

export function OrgPickerModal() {
  const [needsPick, setNeedsPick] = useState(
    () => !localStorage.getItem(ORG_KEY),
  );
  const [showCreate, setShowCreate] = useState(false);
  const { orgs, setActiveOrg } = useOrg();
  const { isPending } = neon.auth.useListOrganizations();

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "" },
  });

  async function handlePick(id: string) {
    await setActiveOrg(id);
    setNeedsPick(false);
  }

  async function handleCreate({ name }: CreateValues) {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    try {
      const { data, error } = await neon.auth.organization.create({
        name: name.trim(),
        slug,
      });
      if (error) throw new Error(error.message);
      if (data) await handlePick(data.id);
      form.reset();
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Failed to create organization.",
      );
    }
  }

  return (
    <Dialog open={needsPick && !isPending}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Choose an organization</DialogTitle>
          <DialogDescription>
            Select or create an organization to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {orgs.map((org) => (
            <Button
              key={org.id}
              variant="outline"
              className="justify-start"
              onClick={() => handlePick(org.id)}
            >
              <IconBuilding size={14} />
              {org.name}
            </Button>
          ))}

          {!showCreate ? (
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => setShowCreate(true)}
            >
              <IconPlus size={14} />
              New organization
            </Button>
          ) : (
            <form
              onSubmit={form.handleSubmit(handleCreate)}
              className="flex gap-2"
            >
              <Input
                placeholder="Organization name"
                {...form.register("name")}
                autoFocus
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating…" : "Create"}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
