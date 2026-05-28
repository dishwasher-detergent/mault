import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { neon } from "@/lib/auth/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconTrash } from "@tabler/icons-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type OrgRole = "owner" | "admin" | "member";

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

const renameSchema = z.object({ name: z.string().min(1) });
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]),
});

type RenameValues = z.infer<typeof renameSchema>;
type InviteValues = z.infer<typeof inviteSchema>;

export function OrgSettings() {
  const { data: orgs, refetch: refetchOrgs } = neon.auth.useListOrganizations();
  const { data: activeOrg, refetch: refetchActive } =
    neon.auth.useActiveOrganization();
  const { data: activeMember } = neon.auth.useActiveMember();

  const myRole = activeMember?.role as OrgRole | undefined;
  const canManage = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  const renameForm = useForm<RenameValues>({
    resolver: zodResolver(renameSchema),
    defaultValues: { name: "" },
  });

  const inviteForm = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "member" },
  });

  async function handleRename({ name }: RenameValues) {
    if (!activeOrg) return;
    try {
      const { error } = await neon.auth.organization.update({
        organizationId: activeOrg.id,
        data: { name },
      });
      if (error) throw new Error(error.message);
      renameForm.reset();
      await refetchActive();
      toast.success("Organization renamed.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to rename.");
    }
  }

  async function handleInvite({ email, role }: InviteValues) {
    if (!activeOrg) return;
    try {
      const { error } = await neon.auth.organization.inviteMember({
        email,
        role,
        organizationId: activeOrg.id,
      });
      if (error) throw new Error(error.message);
      inviteForm.reset();
      await refetchActive();
      toast.success("Invite sent.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send invite.");
    }
  }

  async function handleCancelInvite(invitationId: string) {
    try {
      const { error } = await neon.auth.organization.cancelInvitation({
        invitationId,
      });
      if (error) throw new Error(error.message);
      await refetchActive();
      toast.success("Invite cancelled.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel invite.");
    }
  }

  async function handleChangeRole(memberId: string, role: OrgRole) {
    try {
      const { error } = await neon.auth.organization.updateMemberRole({
        memberId,
        role,
        organizationId: activeOrg!.id,
      });
      if (error) throw new Error(error.message);
      await refetchActive();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update role.");
    }
  }

  async function handleRemoveMember(memberId: string) {
    try {
      const { error } = await neon.auth.organization.removeMember({
        memberIdOrEmail: memberId,
        organizationId: activeOrg!.id,
      });
      if (error) throw new Error(error.message);
      await refetchActive();
      toast.success("Member removed.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove member.");
    }
  }

  async function handleDelete() {
    if (!activeOrg) return;
    if (!confirm(`Delete "${activeOrg.name}"? This cannot be undone.`)) return;
    try {
      const { error } = await neon.auth.organization.delete({
        organizationId: activeOrg.id,
      });
      if (error) throw new Error(error.message);
      await refetchOrgs();
      toast.success("Organization deleted.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete.");
    }
  }

  const pendingInvites =
    activeOrg?.invitations?.filter((i) => i.status === "pending") ?? [];

  return (
    <div className="flex flex-col gap-6">
      {!activeOrg && (
        <p className="text-sm text-muted-foreground">
          No organization selected. Use the organization menu in the sidebar to
          create or switch organizations.
        </p>
      )}

      {activeOrg && (
        <>
          {canManage && (
            <form
              onSubmit={renameForm.handleSubmit(handleRename)}
              className="flex flex-col gap-2"
            >
              <h3 className="text-sm font-medium">Rename "{activeOrg.name}"</h3>
              <div className="flex gap-2">
                <Input
                  placeholder={activeOrg.name}
                  {...renameForm.register("name")}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={renameForm.formState.isSubmitting}
                >
                  {renameForm.formState.isSubmitting ? "Saving…" : "Rename"}
                </Button>
              </div>
            </form>
          )}

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Members</h3>
            <div className="flex flex-col divide-y divide-border rounded-lg border">
              {activeOrg.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 px-3 py-2 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">
                      {m.user.name || m.user.email}
                    </p>
                    {m.user.name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {m.user.email}
                      </p>
                    )}
                  </div>
                  {canManage && m.role !== "owner" ? (
                    <select
                      className="text-xs bg-transparent border border-border rounded px-1.5 py-0.5"
                      value={m.role}
                      onChange={(e) =>
                        handleChangeRole(m.id, e.target.value as OrgRole)
                      }
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                  ) : (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {ROLE_LABELS[m.role as OrgRole]}
                    </span>
                  )}
                  {isOwner && m.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(m.id)}
                    >
                      <IconTrash size={14} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {canManage && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">Invite member</h3>
              <form
                onSubmit={inviteForm.handleSubmit(handleInvite)}
                className="flex gap-2"
              >
                <Input
                  type="email"
                  placeholder="Email address"
                  {...inviteForm.register("email")}
                  className="flex-1"
                />
                <Controller
                  control={inviteForm.control}
                  name="role"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-28 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button
                  type="submit"
                  disabled={inviteForm.formState.isSubmitting}
                >
                  {inviteForm.formState.isSubmitting ? "Sending…" : "Invite"}
                </Button>
              </form>

              {pendingInvites.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground">
                    Pending invites
                  </p>
                  <div className="flex flex-col divide-y divide-border rounded-lg border">
                    {pendingInvites.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs"
                      >
                        <span className="flex-1 text-muted-foreground truncate">
                          {inv.email}
                        </span>
                        <span className="capitalize text-muted-foreground">
                          {inv.role}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancelInvite(inv.id)}
                        >
                          <IconTrash size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {isOwner && (
            <div className="flex flex-col gap-3 bg-destructive rounded-lg p-4 text-destructive-foreground">
              <h3 className="text-sm font-medium">Danger zone</h3>
              <p className="text-xs">
                Permanently deletes "{activeOrg.name}" and all its data.
              </p>
              <Button variant="secondary" size="sm" onClick={handleDelete}>
                Delete organization
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
