import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useContactDetail } from "@/hooks/useContactDetail";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Mail, Phone, Building2, MapPin, TrendingUp, Wrench, ClipboardList, Pencil } from "lucide-react";
import {
  DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, formatCurrency,
} from "@/lib/crm-labels";
import {
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS,
  SITE_TYPE_LABELS, formatDate,
} from "@/lib/domain-labels";
import { ContactEditDialog } from "@/components/crud/ContactEditDialog";
import { useCanDo } from "@/hooks/useCanDo";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { contact, company, sites, deals, jobs, activities } = useContactDetail(id);
  const { canDo } = useCanDo();
  const [editOpen, setEditOpen] = useState(false);

  if (contact.isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!contact.data) {
    return <div className="text-center py-20 text-muted-foreground">Kontaktperson ikke funnet</div>;
  }

  const c = contact.data;
  const fullName = `${c.first_name} ${c.last_name || ""}`.trim();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tenant/crm/contacts"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {c.first_name[0]}{(c.last_name || "")[0] || ""}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{fullName}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                {c.title && <span>{c.title}</span>}
                {company.data && (
                  <Link to={`/tenant/crm/companies/${company.data.id}`} className="flex items-center gap-1 text-primary hover:underline">
                    <Building2 className="h-3 w-3" />{company.data.name}
                  </Link>
                )}
                {c.is_primary_contact && <Badge variant="secondary" className="text-[10px]">Primærkontakt</Badge>}
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-sm">
            {c.email && <span className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3.5 w-3.5" />{c.email}</span>}
            {c.phone && <span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{c.phone}</span>}
            {c.mobile && <span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{c.mobile}</span>}
            {c.city && <span className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{c.address ? `${c.address}, ` : ""}{c.postal_code} {c.city}</span>}
          </div>
        </div>
        {canDo("contacts.edit") && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />Rediger
          </Button>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />Oversikt</TabsTrigger>
          <TabsTrigger value="deals" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Salg ({deals.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5"><Wrench className="h-3.5 w-3.5" />Jobber ({jobs.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Aktivitet ({activities.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Sites where contact is primary */}
          {(sites.data?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Primærkontakt for anleggssteder</h3>
              <div className="grid gap-2">
                {sites.data!.map(s => (
                  <Link key={s.id} to={`/tenant/crm/sites/${s.id}`}>
                    <Card className="p-3 hover:shadow-md transition-shadow flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{s.name || s.address || "Uten navn"}</p>
                        <p className="text-xs text-muted-foreground">{s.address}, {s.postal_code} {s.city}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{SITE_TYPE_LABELS[s.site_type] || s.site_type}</Badge>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {c.notes && (
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-1">Notater</h3>
              <p className="text-sm text-muted-foreground">{c.notes}</p>
            </Card>
          )}

          {/* Empty state */}
          {!sites.data?.length && !c.notes && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Ingen tilknyttede steder eller notater ennå
            </div>
          )}
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          {!deals.data?.length ? <Empty text="Ingen salg" /> : (
            <div className="grid gap-3">
              {deals.data.map(d => (
                <Link key={d.id} to={`/tenant/crm/deals/${d.id}`}>
                  <Card className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-medium text-sm">{d.title}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(d.value as number | null)} · {formatDate(d.expected_close_date)}</p>
                    </div>
                    <Badge className={`text-[10px] ${DEAL_STAGE_COLORS[d.stage as keyof typeof DEAL_STAGE_COLORS] || ""}`}>
                      {DEAL_STAGE_LABELS[d.stage as keyof typeof DEAL_STAGE_LABELS] || d.stage}
                    </Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          {!jobs.data?.length ? <Empty text="Ingen jobber" /> : (
            <div className="grid gap-3">
              {jobs.data.map(j => (
                <Link key={j.id} to={`/tenant/crm/jobs/${j.id}`}>
                  <Card className="p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-medium text-sm">{j.job_number} – {j.title}</p>
                      <p className="text-xs text-muted-foreground">{JOB_TYPE_LABELS[j.job_type] || j.job_type} · {formatDate(j.scheduled_start)}</p>
                    </div>
                    <Badge className={`text-[10px] ${JOB_STATUS_COLORS[j.status] || ""}`}>
                      {JOB_STATUS_LABELS[j.status] || j.status}
                    </Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          {!activities.data?.length ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Ingen aktiviteter registrert ennå
            </div>
          ) : (
            <div className="grid gap-2">
              {activities.data.map(a => (
                <Card key={a.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{a.subject || a.type}</p>
                      {a.body && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.body}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ContactEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        contact={c}
        onSaved={() => contact.refetch()}
      />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-center py-10 text-sm text-muted-foreground">{text}</div>;
}
