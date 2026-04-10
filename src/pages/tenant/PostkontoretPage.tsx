import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EmailComposeForm } from "@/components/postkontoret/EmailComposeForm";
import { CaseLinkingSection } from "@/components/postkontoret/CaseLinkingSection";
import { CaseActions } from "@/components/postkontoret/CaseActions";
import { useAuth } from "@/hooks/useAuth";
import { useCanDo } from "@/hooks/useCanDo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  CASE_STATUS_LABELS,
  CASE_STATUS_COLOR,
  CASE_PRIORITY_LABELS,
  CASE_PRIORITY_COLOR,
  type CaseStatus,
  type CasePriority,
  type CaseNextAction,
} from "@/lib/case-labels";
import {
  Mail,
  MailOpen,
  Search,
  RefreshCw,
  UserCheck,
  Users,
  AlertCircle,
  Clock,
  Lock,
  ArrowRightLeft,
  Paperclip,
  Inbox,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

type Case = {
  id: string;
  tenant_id: string;
  case_number: string;
  title: string;
  status: CaseStatus;
  priority: CasePriority;
  next_action: CaseNextAction;
  due_at: string | null;
  mailbox_address: string | null;
  owner_user_id: string | null;
  assigned_to_user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  last_activity_at: string | null;
  created_at: string;
  company_id: string | null;
  site_id: string | null;
  asset_id: string | null;
  job_id: string | null;
  warranty_case_id: string | null;
};

type CaseItem = {
  id: string;
  case_id: string;
  type: string;
  subject: string | null;
  from_email: string | null;
  from_name: string | null;
  body_preview: string | null;
  body_html: string | null;
  body_text: string | null;
  received_at: string | null;
  sent_at: string | null;
  created_at: string;
  to_emails: string[] | null;
  cc_emails: string[] | null;
  attachments_meta: any[] | null;
};

type FilterType = "all" | "mine" | "new" | "in_progress" | "waiting" | "closed";

const FILTER_OPTIONS: { key: FilterType; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "Alle", icon: Inbox },
  { key: "mine", label: "Mine saker", icon: UserCheck },
  { key: "new", label: "Nye", icon: AlertCircle },
  { key: "in_progress", label: "Under arbeid", icon: ArrowRightLeft },
  { key: "waiting", label: "Avventer", icon: Clock },
  { key: "closed", label: "Lukket", icon: Lock },
];

export default function PostkontoretPage() {
  const { user, tenantId } = useAuth();
  const { canDo } = useCanDo();
  const [cases, setCases] = useState<Case[]>([]);
  const [items, setItems] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [showCompose, setShowCompose] = useState(false);

  const selectedCase = cases.find((c) => c.id === selectedId);
  const selectedItems = items.filter((i) => i.case_id === selectedId);

  const fetchCases = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .not("status", "eq", "archived")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Failed to load cases:", error);
      toast.error("Kunne ikke laste henvendelser");
    } else {
      setCases((data as unknown as Case[]) || []);
    }
    setLoading(false);
  }, [tenantId]);

  const fetchItems = useCallback(async (caseId: string) => {
    const { data } = await supabase
      .from("case_items")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });
    setItems((data as unknown as CaseItem[]) || []);
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    if (selectedId) fetchItems(selectedId);
  }, [selectedId, fetchItems]);

  // Realtime
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel("cases-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cases" }, () => fetchCases())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchCases, tenantId]);

  const syncInbox = useCallback(async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("inbox-sync");
      if (error) throw error;
      if (data?.ms_reauth) {
        toast.error("Integrasjonstilkobling må fornyes. Gå til Integrasjoner.");
        return;
      }
      toast.success(`Synkronisert! ${data?.new_cases || 0} nye saker, ${data?.new_items || 0} nye meldinger.`);
      await fetchCases();
    } catch (err: any) {
      toast.error("Synkronisering feilet: " + (err.message || "Ukjent feil"));
    } finally {
      setSyncing(false);
    }
  }, [fetchCases]);

  const openCase = (c: Case) => {
    setSelectedId(c.id);
    if (c.status === "new") {
      supabase.from("cases").update({ status: "triage" } as any).eq("id", c.id);
      setCases((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: "triage" as CaseStatus } : x)));
    }
  };

  const assignToMe = async (c: Case) => {
    if (!user) return;
    await supabase.from("cases").update({
      owner_user_id: user.id,
      assigned_to_user_id: user.id,
      assigned_at: new Date().toISOString(),
      status: c.status === "new" ? "triage" : c.status,
    } as any).eq("id", c.id);
    setCases((prev) => prev.map((x) => x.id === c.id ? { ...x, owner_user_id: user.id, assigned_to_user_id: user.id } : x));
    toast.success("Tildelt deg");
  };

  // Filter logic
  const filtered = cases.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.title.toLowerCase().includes(q) && !c.case_number.toLowerCase().includes(q) && !(c.customer_name || "").toLowerCase().includes(q) && !(c.customer_email || "").toLowerCase().includes(q)) return false;
    }
    switch (filter) {
      case "mine": return c.assigned_to_user_id === user?.id;
      case "new": return c.status === "new" || c.status === "triage";
      case "in_progress": return c.status === "in_progress";
      case "waiting": return c.status === "waiting_customer" || c.status === "waiting_internal";
      case "closed": return c.status === "closed" || c.status === "converted";
      default: return true;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Postkontoret</h1>
          <p className="text-muted-foreground mt-1">Håndter innkommende henvendelser og e-post</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={syncInbox} disabled={syncing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Synkroniserer..." : "Synk e-post"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchCases()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Oppdater
          </Button>
        </div>
      </div>

      <div className="flex gap-6 min-h-[calc(100vh-220px)]">
        {/* Left: Case list */}
        <div className="w-full max-w-md flex flex-col gap-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((f) => (
              <Button
                key={f.key}
                variant={filter === f.key ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setFilter(f.key)}
              >
                <f.icon className="h-3.5 w-3.5" />
                {f.label}
              </Button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søk saker..."
              className="pl-9"
            />
          </div>

          {/* List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Inbox className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium mb-1">Ingen saker funnet</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {cases.length === 0
                    ? "Koble en mailboks under Integrasjoner for å motta henvendelser automatisk, eller opprett en sak manuelt."
                    : "Prøv et annet filter eller søkeord."}
                </p>
                {cases.length === 0 && (
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("/tenant/integrations")}>
                    <Mail className="h-3.5 w-3.5 mr-1.5" /> Sett opp mailboks
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((c) => (
                  <Card
                    key={c.id}
                    className={`p-3 cursor-pointer transition-all hover:shadow-sm ${
                      selectedId === c.id ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => openCase(c)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {c.status === "new" ? (
                          <Mail className="h-4 w-4 text-primary" />
                        ) : (
                          <MailOpen className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">{c.case_number}</span>
                          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${CASE_STATUS_COLOR[c.status]}`}>
                            {CASE_STATUS_LABELS[c.status]}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium truncate mt-0.5">{c.title || "(Uten tittel)"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground truncate">
                            {c.customer_name || c.customer_email || "Ukjent avsender"}
                          </span>
                          {c.last_activity_at && (
                            <span className="text-[10px] text-muted-foreground/60">
                              {formatDistanceToNow(new Date(c.last_activity_at), { addSuffix: true, locale: nb })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: Case detail */}
        <div className="flex-1 min-w-0">
          {selectedCase ? (
            <Card className="h-full flex flex-col">
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-muted-foreground">{selectedCase.case_number}</span>
                      <Badge variant="outline" className={CASE_STATUS_COLOR[selectedCase.status]}>
                        {CASE_STATUS_LABELS[selectedCase.status]}
                      </Badge>
                      <Badge variant="outline" className={CASE_PRIORITY_COLOR[selectedCase.priority]}>
                        {CASE_PRIORITY_LABELS[selectedCase.priority]}
                      </Badge>
                    </div>
                    <h2 className="text-lg font-semibold mt-1">{selectedCase.title || "(Uten tittel)"}</h2>
                    {selectedCase.customer_email && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Fra: {selectedCase.customer_name ? `${selectedCase.customer_name} <${selectedCase.customer_email}>` : selectedCase.customer_email}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <CaseActions
                      caseId={selectedCase.id}
                      companyId={selectedCase.company_id}
                      siteId={selectedCase.site_id}
                      assetId={selectedCase.asset_id}
                      customerName={selectedCase.customer_name}
                      customerEmail={selectedCase.customer_email}
                      caseTitle={selectedCase.title}
                      onUpdated={() => fetchCases()}
                    />
                    {!selectedCase.assigned_to_user_id && canDo("cases.edit") && (
                      <Button size="sm" onClick={() => assignToMe(selectedCase)} className="gap-1.5">
                        <UserCheck className="h-4 w-4" />
                        Tildel meg
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-1 min-h-0">
                {/* Messages */}
                <div className="flex-1 flex flex-col min-w-0">
                  <ScrollArea className="flex-1 p-4">
                {selectedItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Ingen meldinger i denne saken ennå</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="rounded-lg border border-border/50 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{item.from_name || item.from_email || "System"}</span>
                            {item.attachments_meta && (item.attachments_meta as any[]).length > 0 && (
                              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {item.received_at
                              ? formatDistanceToNow(new Date(item.received_at), { addSuffix: true, locale: nb })
                              : formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: nb })
                            }
                          </span>
                        </div>
                        {item.subject && <p className="text-sm font-medium mb-1">{item.subject}</p>}
                        {item.body_html ? (
                          <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: item.body_html }} />
                        ) : (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.body_text || item.body_preview || ""}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Compose reply */}
              <div className="p-4 border-t border-border/50">
                <EmailComposeForm
                  caseId={selectedCase.id}
                  defaultTo={selectedCase.customer_email || ""}
                  defaultSubject={`Re: ${selectedCase.title}`}
                  onSent={() => fetchItems(selectedCase.id)}
                />
              </div>
                </div>

                {/* Right sidebar: Linking */}
                <div className="w-56 border-l border-border/50 p-3 overflow-y-auto">
                  <CaseLinkingSection
                    caseData={{
                      id: selectedCase.id,
                      company_id: selectedCase.company_id ?? null,
                      site_id: selectedCase.site_id ?? null,
                      asset_id: selectedCase.asset_id ?? null,
                      job_id: selectedCase.job_id ?? null,
                      warranty_case_id: selectedCase.warranty_case_id ?? null,
                    }}
                    onUpdated={() => fetchCases()}
                  />
                </div>
              </div>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Inbox className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Velg en sak for å se detaljer</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
