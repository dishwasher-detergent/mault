import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { neon } from "@/lib/auth/client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconBuilding,
  IconCheck,
  IconPlus,
  IconSettings,
} from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { useOrg } from "../api/use-organization";

const createSchema = z.object({ name: z.string().min(1) });
type CreateValues = z.infer<typeof createSchema>;

export function OrgSwitcher({ side = "right" }: { side?: "right" | "top" }) {
  const { orgs, activeOrg, setActiveOrg } = useOrg();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "" },
  });

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
      if (data) await setActiveOrg(data.id);
      form.reset();
      setCreateOpen(false);
      toast.success(`Organization "${name.trim()}" created.`);
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Failed to create organization.",
      );
    }
  }

  return (
    <>
      <DropdownMenu>
        <div className="relative">
          <DropdownMenuTrigger
            render={
              <Button size="icon" variant="outline">
                <IconBuilding />
              </Button>
            }
          />
          {activeOrg && (
            <span className="pointer-events-none absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary text-[0.6rem] font-bold leading-none text-primary-foreground">
              {activeOrg.name[0].toUpperCase()}
            </span>
          )}
        </div>
        <DropdownMenuContent
          side={side}
          align="end"
          sideOffset={8}
          className="w-64"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            {orgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => setActiveOrg(org.id)}
              >
                <span className="flex-1 truncate">{org.name}</span>
                {org.id === activeOrg?.id && (
                  <IconCheck size={14} className="text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <IconPlus size={14} />
            New organization
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/app/settings")}>
            <IconSettings size={14} />
            Manage organizations
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DynamicDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) form.reset();
        }}
        title="New Organization"
        description="Create a new organization to scope your bins, collections, and calibration."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-org-form"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Creating…" : "Create"}
            </Button>
          </>
        }
        footerClassName="flex-col-reverse md:flex-row"
      >
        <form id="create-org-form" onSubmit={form.handleSubmit(handleCreate)}>
          <Input
            placeholder="Organization name"
            {...form.register("name")}
            autoFocus
          />
        </form>
      </DynamicDialog>
    </>
  );
}
