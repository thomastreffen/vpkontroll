import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  RefreshCw,
  Trash2,
  Plus,
  Zap,
  ArrowRight,
  Inbox,
  Clock,
  Shield,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Credential = Tables<"tenant_credentials">;
type Mailbox = Tables<"mailboxes">;

type SetupStep = "provider" | "connect" | "mailbox" | "activate" | "done";

export default function PostkontoretSetup() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const { data: credentials } = useQuery({
    queryKey: ["postkontoret-credentials", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_credentials")
        .select("*")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return data as Credential[];
    },
    enabled: !!tenantId,
  });

  const { data: mailboxes, refetch: refetchMailboxes } = useQuery({
    queryKey: ["postkontoret-mailboxes", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mailboxes")
        .select("*")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return data as Mailbox[];
    },
    enabled: !!tenantId,
  });

  const [mailboxAddress, setMailboxAddress] = useState("");
  const [mailboxName, setMailboxName] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const connectedCred = credentials?.find((c) => c.status === "connected");
  const activeMailbox = mailboxes?.find((m) => m.is_enabled);
  const hasMailbox = !!activeMailbox;

  const getCurrentStep = (): SetupStep => {
    if (!connectedCred) return "provider";
    if (connectedCred.status !== "connected") return "connect";
    if (!hasMailbox) return "mailbox";
    return "done";
  };

  const currentStep = getCurrentStep();

  const addMailboxMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !connectedCred || !mailboxAddress.trim()) return;
      const { error } = await supabase.from("mailboxes").insert({
        tenant_id: tenantId,
        address: mailboxAddress.trim().toLowerCase(),
        display_name: mailboxName.trim() || mailboxAddress.trim(),
        provider: connectedCred.provider,
        is_enabled: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postkontoret-mailboxes"] });
      toast.success("Mailboks lagt til og aktivert!");
      setMailboxAddress("");
      setMailboxName("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMailboxMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mailboxes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postkontoret-mailboxes"] });
      toast.success("Mailboks fjernet");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMailboxMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("mailboxes")
        .update({ is_enabled: enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postkontoret-mailboxes"] });
      toast.success("Mailboks oppdatert");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const testConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("inbox-sync", {
        body: { test_only: true },
      });
      if (error) throw error;
      if (data?.error) {
        setTestResult("error");
        toast.error("Test feilet: " + data.error);
      } else {
        setTestResult("success");
        toast.success("Tilkobling fungerer!");
      }
    } catch (err: any) {
      setTestResult("error");
      toast.error("Kunne ikke teste tilkoblingen");
    } finally {
      setTestingConnection(false);
    }
  };

  const providerLabel = connectedCred?.provider === "google" ? "Google Workspace" : "Microsoft 365";

  const stepIndicator = (step: SetupStep, index: number) => {
    const steps: SetupStep[] = ["provider", "mailbox", "done"];
    const currentIndex = steps.indexOf(currentStep === "connect" ? "provider" : currentStep === "activate" ? "mailbox" : currentStep);
    const stepIndex = index;
    const isCompleted = stepIndex < currentIndex;
    const isCurrent = stepIndex === currentIndex;

    return (
      <div className="flex items-center gap-2">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            isCompleted
              ? "bg-green-600 text-white"
              : isCurrent
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isCompleted ? "✓" : index + 1}
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Postkontoret – Oppsett</CardTitle>
            <CardDescription className="text-xs">
              Konfigurer hvilken e-postkonto Postkontoret skal hente og sende e-post fra
            </CardDescription>
          </div>
          {currentStep === "done" && (
            <Badge className="ml-auto bg-green-600/10 text-green-600 border-green-600/20">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Aktiv
            </Badge>
          )}
          {currentStep !== "done" && (
            <Badge variant="outline" className="ml-auto text-yellow-600 border-yellow-600/30">
              <AlertCircle className="w-3 h-3 mr-1" /> Ikke ferdig satt opp
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-2">
            {stepIndicator("provider", 0)}
            <span className="text-xs font-medium">Koble provider</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mx-2" />
          <div className="flex items-center gap-2">
            {stepIndicator("mailbox", 1)}
            <span className="text-xs font-medium">Velg mailboks</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mx-2" />
          <div className="flex items-center gap-2">
            {stepIndicator("done", 2)}
            <span className="text-xs font-medium">Aktiv</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">1. E-post-provider</h3>
            {connectedCred?.status === "connected" && (
              <Badge variant="outline" className="text-green-600 border-green-600/30 text-[10px]">
                <CheckCircle2 className="w-3 h-3 mr-1" /> {providerLabel} tilkoblet
              </Badge>
            )}
          </div>

          {!connectedCred || connectedCred.status !== "connected" ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <Shield className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground mb-1">
                Ingen e-post-provider er koblet til ennå
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Koble Google Workspace eller Microsoft 365 i seksjonen ovenfor først
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{providerLabel}</p>
                    {connectedCred.tenant_domain && (
                      <p className="text-xs text-muted-foreground">{connectedCred.tenant_domain}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={testConnection}
                    disabled={testingConnection}
                  >
                    {testingConnection ? (
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    ) : testResult === "success" ? (
                      <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                    ) : testResult === "error" ? (
                      <XCircle className="w-3 h-3 mr-1 text-destructive" />
                    ) : (
                      <Zap className="w-3 h-3 mr-1" />
                    )}
                    Test tilkobling
                  </Button>
                </div>
              </div>
              {connectedCred.last_sync_at && (
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Siste synk: {new Date(connectedCred.last_sync_at).toLocaleString("nb-NO")}
                </p>
              )}
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">2. Mailboks for Postkontoret</h3>
            {hasMailbox && (
              <Badge variant="outline" className="text-green-600 border-green-600/30 text-[10px]">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Konfigurert
              </Badge>
            )}
          </div>

          {connectedCred?.status !== "connected" ? (
            <p className="text-xs text-muted-foreground">
              Koble en e-post-provider først (steg 1) for å sette opp mailboks.
            </p>
          ) : (
            <>
              {mailboxes && mailboxes.length > 0 && (
                <div className="space-y-2">
                  {mailboxes.map((mb) => (
                    <div
                      key={mb.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        mb.is_enabled
                          ? "border-green-200 dark:border-green-800/30 bg-green-50/50 dark:bg-green-950/10"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Mail className={`w-4 h-4 ${mb.is_enabled ? "text-green-600" : "text-muted-foreground"}`} />
                        <div>
                          <p className="text-sm font-medium">{mb.display_name}</p>
                          <p className="text-xs text-muted-foreground">{mb.address}</p>
                        </div>
                        {mb.is_enabled ? (
                          <Badge className="bg-green-600/10 text-green-600 border-green-600/20 text-[10px]">Aktiv</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">Deaktivert</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => toggleMailboxMutation.mutate({ id: mb.id, enabled: !mb.is_enabled })}
                        >
                          {mb.is_enabled ? "Deaktiver" : "Aktiver"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeMailboxMutation.mutate(mb.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {hasMailbox ? "Legg til en ekstra mailboks" : "Legg til mailboks-adressen Postkontoret skal bruke"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">E-postadresse</Label>
                    <Input
                      value={mailboxAddress}
                      onChange={(e) => setMailboxAddress(e.target.value)}
                      placeholder="post@firma.no"
                      type="email"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Visningsnavn (valgfritt)</Label>
                    <Input
                      value={mailboxName}
                      onChange={(e) => setMailboxName(e.target.value)}
                      placeholder="Firma Kundeservice"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full text-xs"
                  disabled={!mailboxAddress.trim() || addMailboxMutation.isPending}
                  onClick={() => addMailboxMutation.mutate()}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  {addMailboxMutation.isPending ? "Legger til..." : "Legg til og aktiver mailboks"}
                </Button>
              </div>
            </>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">3. Status</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-3 text-center">
              <div className={`w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center ${
                connectedCred?.status === "connected" ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
              }`}>
                {connectedCred?.status === "connected" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs font-medium">Provider</p>
              <p className="text-[10px] text-muted-foreground">
                {connectedCred?.status === "connected" ? providerLabel : "Ikke koblet"}
              </p>
            </div>

            <div className="rounded-lg border border-border p-3 text-center">
              <div className={`w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center ${
                hasMailbox ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
              }`}>
                {hasMailbox ? (
                  <Mail className="w-4 h-4 text-green-600" />
                ) : (
                  <Mail className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs font-medium">Mailboks</p>
              <p className="text-[10px] text-muted-foreground">
                {hasMailbox ? activeMailbox!.address : "Ikke konfigurert"}
              </p>
            </div>

            <div className="rounded-lg border border-border p-3 text-center">
              <div className={`w-8 h-8 rounded-full mx-auto mb-1.5 flex items-center justify-center ${
                currentStep === "done" ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
              }`}>
                {currentStep === "done" ? (
                  <Zap className="w-4 h-4 text-green-600" />
                ) : (
                  <Zap className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs font-medium">Postkontoret</p>
              <p className="text-[10px] text-muted-foreground">
                {currentStep === "done" ? "Aktiv" : "Ikke aktiv"}
              </p>
            </div>
          </div>

          {connectedCred?.last_sync_at && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Siste synkronisering: {new Date(connectedCred.last_sync_at).toLocaleString("nb-NO")}
            </p>
          )}

          {connectedCred?.status === "error" && (
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-xs text-destructive font-medium">Tilkoblingsfeil – prøv å koble til på nytt</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
