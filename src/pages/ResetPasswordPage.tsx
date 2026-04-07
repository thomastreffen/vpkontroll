import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Flame } from "lucide-react";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { user, loading, isPasswordRecovery, clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [waitingForSession, setWaitingForSession] = useState(true);

  // Give auth state time to settle after redirect
  useEffect(() => {
    const timer = setTimeout(() => setWaitingForSession(false), 2000);
    // Clear early if we get a session or recovery flag
    if (isPasswordRecovery || user) {
      setWaitingForSession(false);
      clearTimeout(timer);
    }
    return () => clearTimeout(timer);
  }, [isPasswordRecovery, user]);

  const canReset = isPasswordRecovery || user;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passordene stemmer ikke overens");
      return;
    }
    if (password.length < 6) {
      toast.error("Passordet må være minst 6 tegn");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      clearPasswordRecovery();
      toast.success("Passordet er oppdatert!");
      navigate("/admin");
    }
  };

  if (!canReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Ugyldig eller utløpt tilbakestillingslenke.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Flame className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Nytt passord</CardTitle>
          <CardDescription>Velg et nytt passord for kontoen din</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nytt passord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Bekreft passord</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Oppdaterer..." : "Oppdater passord"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
