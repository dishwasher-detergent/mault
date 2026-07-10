import { neon } from "@/lib/auth/client";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const { data, isPending } = neon.auth.useSession();
  const isSignedIn = !isPending && !!data?.user;
  const navigate = useNavigate();

  async function handleSignOut() {
    await neon.auth.signOut();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">Landing</div>
  );
}
