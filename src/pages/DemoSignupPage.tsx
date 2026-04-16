import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Building2, Mail, User, Lock, CheckCircle2, ArrowRight } from "lucide-react";

export default function DemoSignupPage() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !email.trim() || !password) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("demo-signup", {
        body: {
          company_name: companyName.trim(),
          admin_email: email.trim(),
          admin_name: name.trim() || undefined,
          admin_password: password,
        },
      });
      if (error || !data?.ok) {
        toast.error(data?.error || "Noe gikk galt ved opprettelse av demo");
        return;
      }
      setDone(true);
    } catch {
      toast.error("Kunne ikke opprette demo-konto");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Demo-konto opprettet!</h1>
            <p className="text-muted-foreground">
              Din 14-dagers gratis prøveversjon er klar. Logg inn med e-posten og passordet du registrerte.
            </p>
          </div>
          <Button onClick={() => navigate("/login")} className="w-full gap-2">
            Gå til innlogging <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Prøv VPKontroll gratis</h1>
          <p className="text-sm text-muted-foreground">
            Opprett en gratis demo-konto med 14 dagers prøveperiode. Ingen kredittkort nødvendig.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Bedriftsnavn *
            </Label>
            <Input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="F.eks. Varmepumpe AS"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Ditt navn
            </Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ola Nordmann"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> E-post *
            </Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ola@bedrift.no"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Passord *
            </Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minst 6 tegn"
              minLength={6}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !companyName.trim() || !email.trim() || !password}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Opprett gratis demo
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Har du allerede konto?{" "}
          <Link to="/login" className="text-primary hover:underline">Logg inn</Link>
        </p>
      </Card>
    </div>
  );
}
