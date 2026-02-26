import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">Magic Vault</h1>
      <p className="text-muted-foreground text-lg">
        MTG card scanner and sorter
      </p>
      <div className="flex gap-3">
        <Button nativeButton={false} render={<Link to="/auth/sign-in" />}>
          Sign In
        </Button>
        <Button
          nativeButton={false}
          variant="outline"
          render={<Link to="/auth/sign-up" />}
        >
          Sign Up
        </Button>
      </div>
    </div>
  );
}
