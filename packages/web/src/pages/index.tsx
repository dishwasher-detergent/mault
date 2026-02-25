import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">Magic Vault</h1>
      <p className="text-muted-foreground text-lg">MTG card scanner and sorter</p>
      <div className="flex gap-3">
        <Button asChild>
          <Link to="/auth/sign-in">Sign In</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/auth/sign-up">Sign Up</Link>
        </Button>
      </div>
    </div>
  );
}
