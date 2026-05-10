import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, can } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/capa")({
  validateSearch: (s: Record<string, unknown>) => ({ nc: (s.nc as string) || undefined }),
  component: CapaPage,
});

const STATUTS = ["Ouverte", "En cours", "Clôturée"];

interface CAPA {
  id: string; reference: string; nc_id: string | null;
  description_probleme: string; cause_racine: string | null;
  statut: string; kpi_avant: number | null; kpi_apres: number | null;
  date_cible_corrective: string | null;
}

const emptyForm = {
  nc_id: "" as string | "",
  description_probleme: "", actions_confinement: "",
  why1: "", rep1: "", why2: "", rep2: "", why3: "", rep3: "",
  why4: "", rep4: "", why5: "", rep5: "",
  cause_racine: "",
  actions_correctives: "", date_cible_corrective: "", responsable_corrective: "",
  actions_preventives: "", date_cible_preventive: "", responsable_preventive: "",
  kpi_avant: "", kpi_apres: "",
  statut: "Ouverte",
};

function CapaPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const ncList = useQuery({
    queryKey: ["nc_for_capa"],
    queryFn: async () => {
      const { data, error } = await supabase.from("non_conformites")
        .select("id, reference").order("created_at", { ascending: false });
      if (error) throw error;
      return data as { id: string; reference: string }[];
    },
  });

  const list = useQuery({
    queryKey: ["capa"],
    queryFn: async () => {
      const { data, error } = await supabase.from("capa")
        .select("*, non_conformites(reference)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Pre-fill from NC link query param
  useEffect(() => {
    if (search.nc) {
      setForm((f) => ({ ...emptyForm, nc_id: search.nc as string }));
      setEditing(null);
      setOpen(true);
    }
  }, [search.nc]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.description_probleme.trim()) throw new Error("Description du problème requise");
      const payload = {
        nc_id: form.nc_id || null,
        description_probleme: form.description_probleme,
        actions_confinement: form.actions_confinement || null,
        why1: form.why1 || null, rep1: form.rep1 || null,
        why2: form.why2 || null, rep2: form.rep2 || null,
        why3: form.why3 || null, rep3: form.rep3 || null,
        why4: form.why4 || null, rep4: form.rep4 || null,
        why5: form.why5 || null, rep5: form.rep5 || null,
        cause_racine: form.cause_racine || null,
        actions_correctives: form.actions_correctives || null,
        date_cible_corrective: form.date_cible_corrective || null,
        responsable_corrective: form.responsable_corrective || null,
        actions_preventives: form.actions_preventives || null,
        date_cible_preventive: form.date_cible_preventive || null,
        responsable_preventive: form.responsable_preventive || null,
        kpi_avant: form.kpi_avant === "" ? null : Number(form.kpi_avant),
        kpi_apres: form.kpi_apres === "" ? null : Number(form.kpi_apres),
        statut: form.statut,
      };
      if (editing) {
        const { error } = await supabase.from("capa").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        const { error } = await supabase.from("capa").insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "CAPA mise à jour" : "CAPA créée");
      qc.invalidateQueries({ queryKey: ["capa"] });
      setOpen(false); setEditing(null); setForm({ ...emptyForm });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("capa").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["capa"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setOpen(true); };
  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      nc_id: c.nc_id ?? "",
      description_probleme: c.description_probleme ?? "",
      actions_confinement: c.actions_confinement ?? "",
      why1: c.why1 ?? "", rep1: c.rep1 ?? "",
      why2: c.why2 ?? "", rep2: c.rep2 ?? "",
      why3: c.why3 ?? "", rep3: c.rep3 ?? "",
      why4: c.why4 ?? "", rep4: c.rep4 ?? "",
      why5: c.why5 ?? "", rep5: c.rep5 ?? "",
      cause_racine: c.cause_racine ?? "",
      actions_correctives: c.actions_correctives ?? "",
      date_cible_corrective: c.date_cible_corrective ?? "",
      responsable_corrective: c.responsable_corrective ?? "",
      actions_preventives: c.actions_preventives ?? "",
      date_cible_preventive: c.date_cible_preventive ?? "",
      responsable_preventive: c.responsable_preventive ?? "",
      kpi_avant: c.kpi_avant?.toString() ?? "",
      kpi_apres: c.kpi_apres?.toString() ?? "",
      statut: c.statut ?? "Ouverte",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Actions Correctives & Préventives</h1>
          <p className="text-muted-foreground">Analyse 5 Pourquoi et plan d'actions</p>
        </div>
        {can.createCAPA(profile?.role) && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm({ ...emptyForm }); } }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Nouvelle CAPA</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? `Modifier ${editing.reference}` : "Nouvelle CAPA"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {!editing && <div className="text-xs text-muted-foreground">Référence : <span className="font-mono">auto (CAPA-{new Date().getFullYear()}-XXX)</span></div>}
                <div>
                  <Label>NC liée</Label>
                  <Select value={form.nc_id || "none"} onValueChange={(v) => setForm({ ...form, nc_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Aucune —</SelectItem>
                      {ncList.data?.map((n) => <SelectItem key={n.id} value={n.id}>{n.reference}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Description du problème *</Label><Textarea rows={3} value={form.description_probleme} onChange={(e) => setForm({ ...form, description_probleme: e.target.value })} required /></div>
                <div><Label>Actions de confinement</Label><Textarea rows={2} value={form.actions_confinement} onChange={(e) => setForm({ ...form, actions_confinement: e.target.value })} /></div>

                <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                  <h3 className="font-semibold text-sm">Analyse 5 Pourquoi</h3>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className="grid grid-cols-2 gap-2">
                      <Input placeholder={`Pourquoi ${n}`} value={(form as any)[`why${n}`]} onChange={(e) => setForm({ ...form, [`why${n}`]: e.target.value } as any)} />
                      <Input placeholder={`Réponse ${n}`} value={(form as any)[`rep${n}`]} onChange={(e) => setForm({ ...form, [`rep${n}`]: e.target.value } as any)} />
                    </div>
                  ))}
                </div>

                <div className="border-2 border-destructive/40 rounded-lg p-4 bg-destructive/5">
                  <Label className="text-destructive font-semibold">⚠ Cause racine</Label>
                  <Textarea rows={2} className="mt-2 border-destructive/30" value={form.cause_racine} onChange={(e) => setForm({ ...form, cause_racine: e.target.value })} />
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-sm">Actions correctives</h3>
                  <Textarea rows={2} placeholder="Actions" value={form.actions_correctives} onChange={(e) => setForm({ ...form, actions_correctives: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Date cible</Label><Input type="date" value={form.date_cible_corrective} onChange={(e) => setForm({ ...form, date_cible_corrective: e.target.value })} /></div>
                    <div><Label className="text-xs">Responsable</Label><Input value={form.responsable_corrective} onChange={(e) => setForm({ ...form, responsable_corrective: e.target.value })} /></div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-sm">Actions préventives</h3>
                  <Textarea rows={2} placeholder="Actions" value={form.actions_preventives} onChange={(e) => setForm({ ...form, actions_preventives: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Date cible</Label><Input type="date" value={form.date_cible_preventive} onChange={(e) => setForm({ ...form, date_cible_preventive: e.target.value })} /></div>
                    <div><Label className="text-xs">Responsable</Label><Input value={form.responsable_preventive} onChange={(e) => setForm({ ...form, responsable_preventive: e.target.value })} /></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div><Label>KPI avant (%)</Label><Input type="number" step="0.1" value={form.kpi_avant} onChange={(e) => setForm({ ...form, kpi_avant: e.target.value })} /></div>
                  <div><Label>KPI après (%)</Label><Input type="number" step="0.1" value={form.kpi_apres} onChange={(e) => setForm({ ...form, kpi_apres: e.target.value })} /></div>
                  <div>
                    <Label>Statut</Label>
                    <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enregistrer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (list.data?.length ?? 0) === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Aucune CAPA.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>NC liée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date cible</TableHead>
                  <TableHead>KPI avant → après</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data?.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.reference}</TableCell>
                    <TableCell className="font-mono text-xs">{c.non_conformites?.reference ?? "—"}</TableCell>
                    <TableCell><Badge variant={c.statut === "Clôturée" ? "default" : c.statut === "En cours" ? "secondary" : "destructive"}>{c.statut}</Badge></TableCell>
                    <TableCell>{c.date_cible_corrective ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {c.kpi_avant != null ? `${c.kpi_avant}%` : "—"} → {c.kpi_apres != null ? `${c.kpi_apres}%` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {can.manageCAPA(profile?.role) && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => { if (confirm("Supprimer ?")) del.mutate(c.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
