import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";

export default function ForbiddenPage() {
  return (
    <div className="pt-10">
      <div className="mx-auto max-w-xl rounded-xl border bg-card/40 p-6 shadow-glow">
        <h1 className="font-display text-4xl">403</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don’t have permission to access this page.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="hero">
            <NavLink to="/training">Go to Training</NavLink>
          </Button>
          <Button asChild variant="outline">
            <NavLink to="/">Back to Home</NavLink>
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          If you believe you should have access, ask an admin to grant your user ID the admin role.
        </p>
      </div>
    </div>
  );
}
