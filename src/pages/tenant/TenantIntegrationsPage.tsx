import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertCircle, Clock, Settings, Plus, ExternalLink, Copy, Unplug } from "lucide-react";
import PostkontoretSetup from "@/components/postkontoret/PostkontoretSetup";
import type { Tables } from "@/integrations/supabase/types";

type Credential = Tables<"tenant_credentials">;
type Provider = Credential["provider"];

const providerInfo: Record<Provider, { label: string; abbr: string; description: string; scopes: string[]; shared?: boolean }> = {
  microsoft: {
    label: "Microsoft 365",
    abbr: "MS",
    description: "E-post, kalender og kontakter via Microsoft Graph API",
    scopes: ["Mail.Read", "Mail.Send", "Calendars.ReadWrite", "Contacts.Read"],
  },
  google: {
    label: "Google Workspace",
    abbr: "G",
    description: "Gmail, Google Calendar og Google Kontakter",
    scopes: ["gmail.readonly", "gmail.send", "calendar", "contacts.readonly"],
    shared: true,
  },
};

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  connected: { label: "Tilkoblet", icon: CheckCircle2, className: "text-green-600" },
  disconnected: { label: "Frakoblet", icon: XCircle, className: "text-muted-foreground" },
  error: { label: "Feil", icon: AlertCircle, className: "text-destructive" },
  pending: { label: "Venter på tilkobling", icon: Clock, className: "text-yellow-600" },
};

export default function TenantIntegrationsPage() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [editProvider, setEditProvider] = useState<Provider | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [tenantDomain, setTenantDomain] = useState("");

  const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-callback`;

  const { data: credentials, isLoading } = useQuery({
    queryKey: ["my-credentials", tenantId],
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

  // Listen for OAuth popup messages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "oauth-success") {
        toast.success("Tilkobling vellykket!");
        queryClient.invalidateQueries({ queryKey: ["my-credentials"] });
      } else if (e.data?.type === "oauth-error") {
        toast.error("Tilkobling feilet: " + (e.data.error || "Ukjent feil"));
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [queryClient]);

  // --- Shared Google connect (no credentials needed) ---
  const googleConnectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("oauth-start", {
        body: { provider: "google", tenant_id: tenantId },
      });
      if (error) throw error;
      if (data?.auth_url) {
        window.open(data.auth_url, "oauth-popup", "width=600,height=700,popup=yes");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // --- Per-tenant credential upsert (Microsoft) ---
  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !editProvider) return;
      const existing = credentials?.find((c) => c.provider === editProvider);

      const payload: any = {
        client_id: clientId,
        tenant_domain: tenantDomain || null,
        status: "pending" as Credential["status"],
      };
      if (clientSecret) {
        payload.client_secret_encrypted = clientSecret;
      }

      if (existing) {
        const { error } = await supabase
          .from("tenant_credentials")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tenant_credentials").insert({
          ...payload,
          tenant_id: tenantId,
          provider: editProvider,
          client_secret_encrypted: clientSecret,
          scopes: providerInfo[editProvider].scopes,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-credentials"] });
      toast.success("Credentials lagret — klar for tilkobling");
      closeEdit();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const connectMutation = useMutation({
    mutationFn: async (provider: Provider) => {
      const cred = credentials?.find((c) => c.provider === provider);
      if (!cred) throw new Error("Sett opp credentials først");

      const { data, error } = await supabase.functions.invoke("oauth-start", {
        body: { provider, credential_id: cred.id },
      });
      if (error) throw error;
      if (data?.auth_url) {
        window.open(data.auth_url, "oauth-popup", "width=600,height=700,popup=yes");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (provider: Provider) => {
      const cred = credentials?.find((c) => c.provider === provider);
      if (!cred) return;
      const { error } = await supabase
        .from("tenant_credentials")
        .update({
          access_token_encrypted: null,
          refresh_token_encrypted: null,
          token_expires_at: null,
          status: "disconnected" as Credential["status"],
        })
        .eq("id", cred.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-credentials"] });
      toast.success("Tilkobling fjernet");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEdit = (provider: Provider) => {
    const existing = credentials?.find((c) => c.provider === provider);
    setClientId(existing?.client_id ?? "");
    setClientSecret("");
    setTenantDomain(existing?.tenant_domain ?? "");
    setEditProvider(provider);
  };

  const closeEdit = () => {
    setEditProvider(null);
    setClientId("");
    setClientSecret("");
    setTenantDomain("");
  };

  const getCredential = (provider: Provider) =>
    credentials?.find((c) => c.provider === provider);

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    toast.success("Redirect URI kopiert");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Integrasjoner</h1>
        <p className="text-muted-foreground mt-1">
          Koble til Microsoft 365 og/eller Google Workspace
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(Object.entries(providerInfo) as [Provider, typeof providerInfo.microsoft][]).map(([provider, info]) => {
          const cred = getCredential(provider);
          const sc = statusConfig[cred?.status ?? "disconnected"];
          const isConnected = cred?.status === "connected";
          const isShared = info.shared;
          const hasCreds = !!cred?.client_id;

          return (
            <Card key={provider} className="border-border/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-sm font-bold">
                    {info.abbr}
                  </div>
                  <div>
                    <CardTitle className="text-base">{info.label}</CardTitle>
                    <CardDescription className="text-xs">{info.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 ${sc.className}`}>
                    <sc.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{sc.label}</span>
                  </div>
                  {isShared && !isConnected && (
                    <Badge variant="secondary" className="text-[10px]">Ett-klikk</Badge>
                  )}
                  {!isShared && (
                    <Badge variant="outline" className="text-xs">
                      {hasCreds ? "Konfigurert" : "Ikke satt opp"}
                    </Badge>
                  )}
                </div>

                {cred?.last_verified_at && (
                  <p className="text-xs text-muted-foreground">
                    Sist verifisert: {new Date(cred.last_verified_at).toLocaleString("nb-NO")}
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  {isConnected ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => disconnectMutation.mutate(provider)}
                      disabled={disconnectMutation.isPending}
                    >
                      <Unplug className="w-4 h-4 mr-2" />
                      Koble fra
                    </Button>
                  ) : isShared ? (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => googleConnectMutation.mutate()}
                      disabled={googleConnectMutation.isPending}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Koble til med Google
                    </Button>
                  ) : hasCreds ? (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => connectMutation.mutate(provider)}
                      disabled={connectMutation.isPending}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Koble til {info.label}
                    </Button>
                  ) : null}

                  {!isShared && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => openEdit(provider)}
                    >
                      {hasCreds ? (
                        <><Settings className="w-4 h-4 mr-2" />Endre credentials</>
                      ) : (
                        <><Plus className="w-4 h-4 mr-2" />Sett opp credentials</>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Microsoft credentials dialog */}
      <Dialog open={!!editProvider} onOpenChange={(o) => { if (!o) closeEdit(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editProvider ? providerInfo[editProvider].label : ""} — Credentials
            </DialogTitle>
            <DialogDescription>
              Legg inn app-registrering fra Azure/Google Cloud Console
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); upsertMutation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder={editProvider === "microsoft" ? "Application (client) ID" : "OAuth Client ID"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <Input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="••••••••"
                required={!getCredential(editProvider!)}
              />
              {getCredential(editProvider!) && (
                <p className="text-xs text-muted-foreground">La stå tom for å beholde nåværende secret</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                {editProvider === "microsoft" ? "Tenant ID / Domene" : "Google Workspace-domene"}
              </Label>
              <Input
                value={tenantDomain}
                onChange={(e) => setTenantDomain(e.target.value)}
                placeholder={editProvider === "microsoft" ? "contoso.onmicrosoft.com" : "firma.no"}
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium mb-1">Redirect URI:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs break-all flex-1">{redirectUri}</code>
                <Button type="button" variant="ghost" size="icon" className="shrink-0 h-6 w-6" onClick={copyRedirectUri}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "Lagrer..." : "Lagre credentials"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
