import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Pencil, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useAuth, can } from "@/lib/auth";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/nc")({
  component: NCPage,
});

const TYPES = [
  "Non-conformité produit / service",
  "Réclamation",
  "Non-conformité système / Violation des procédures",
  "Non-conformité qualité, sécurité, hygiène, environnement",
];

// Must match database check constraint exactly
const STATUTS: { value: string; label: string }[] = [
  { value: "ouverte",   label: "Ouverte"   },
  { value: "en_cours",  label: "En cours"  },
  { value: "cloturee",  label: "Clôturée"  },
];

interface NC {
  id: string;
  reference: string;
  name: string;
  date_incident: string;
  type_nc: string;
  description: string;
  reaction_immediate: string | null;
  statut: string;
}

const empty = {
  name: "",
  date_incident: "",
  type_nc: TYPES[0],
  description: "",
  reaction_immediate: "",
  statut: "ouverte", // matches DB constraint
};

function NCPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NC | null>(null);
  const [form, setForm] = useState({ ...empty });

  const list = useQuery({
    queryKey: ["nc"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("non_conformites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.date_incident || !form.description.trim())
        throw new Error("Date et description requises");

      if (editing) {
        const { error } = await supabase
          .from("non_conformites")
          .update({
            name: form.name,
            date_incident: form.date_incident,
            type_nc: form.type_nc,
            description: form.description,
            reaction_immediate: form.reaction_immediate || null,
            statut: form.statut,
          })
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const year = new Date().getFullYear();
        const count = (list.data?.length ?? 0) + 1;
        const reference = `NC-SMQ-${year}-${String(count).padStart(3, "0")}`;

        const { error } = await supabase.from("non_conformites").insert({
          reference,
          name: form.name,
          date_incident: form.date_incident,
          type_nc: form.type_nc,
          description: form.description,
          reaction_immediate: form.reaction_immediate || null,
          statut: form.statut,
          created_by: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "NC mise à jour" : "NC créée");
      qc.invalidateQueries({ queryKey: ["nc"] });
      setOpen(false);
      setEditing(null);
      setForm({ ...empty });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("non_conformites")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("NC supprimée");
      qc.invalidateQueries({ queryKey: ["nc"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  };

  const openEdit = (nc: any) => {
    setEditing(nc);
    setForm({
      name: nc.name || "",
      date_incident: nc.date_incident.slice(0, 16),
      type_nc: nc.type_nc,
      description: nc.description,
      reaction_immediate: nc.reaction_immediate ?? "",
      statut: nc.statut,
    });
    setOpen(true);
  };

  const triggerCAPA = (nc: NC) =>
    navigate({ to: "/capa", search: { nc: nc.id } as any });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fiches Non-Conformité</h1>
          <p className="text-muted-foreground">Déclaration et suivi des non-conformités</p>
        </div>

        {can.createNC(profile?.role) && (
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) { setEditing(null); setForm({ ...empty }); }
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" />Nouvelle NC
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editing ? `Modifier ${editing.reference}` : "Nouvelle Non-Conformité"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {!editing && (
                  <div className="text-xs text-muted-foreground">
                    Référence : <span className="font-mono">auto (NC-SMQ-{new Date().getFullYear()}-XXX)</span>
                  </div>
                )}

                <div>
                  <Label>Nom de la NC *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Donnez un nom à cette non-conformité"
                    required
                  />
                </div>

                <div>
                  <Label>Date et heure de l'incident *</Label>
                  <Input
                    type="datetime-local"
                    value={form.date_incident}
                    onChange={(e) => setForm({ ...form, date_incident: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>Type de NC *</Label>
                  <RadioGroup
                    value={form.type_nc}
                    onValueChange={(v) => setForm({ ...form, type_nc: v })}
                    className="mt-2 space-y-2"
                  >
                    {TYPES.map((t) => (
                      <div key={t} className="flex items-start gap-2">
                        <RadioGroupItem value={t} id={t} />
                        <Label htmlFor={t} className="font-normal cursor-pointer">{t}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <Label>Description des faits *</Label>
                  <Textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>Réaction immédiate</Label>
                  <Textarea
                    rows={3}
                    value={form.reaction_immediate}
                    onChange={(e) => setForm({ ...form, reaction_immediate: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Statut</Label>
                  <Select
                    value={form.statut}
                    onValueChange={(v) => setForm({ ...form, statut: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUTS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Enregistrer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : (list.data?.length ?? 0) === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              Aucune non-conformité enregistrée.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data?.map((nc) => (
                  <TableRow key={nc.id}>
                    <TableCell className="font-medium">{nc.name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{nc.reference}</TableCell>
                    <TableCell>
                      {format(new Date(nc.date_incident), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{nc.type_nc}</TableCell>
                    <TableCell><StatutBadge s={nc.statut} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {can.createCAPA(profile?.role) && (
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => triggerCAPA(nc)}
                            title="Déclencher CAPA"
                          >
                            <Wrench className="h-4 w-4" />
                          </Button>
                        )}
                        {can.manageNC(profile?.role) && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(nc)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => { if (confirm("Supprimer cette NC ?")) del.mutate(nc.id); }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
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

function StatutBadge({ s }: { s: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    cloturee: { label: "Clôturée", variant: "default" },
    en_cours: { label: "En cours", variant: "secondary" },
    ouverte:  { label: "Ouverte",  variant: "destructive" },
  };
  const { label, variant } = map[s] ?? { label: s, variant: "default" };
  return <Badge variant={variant}>{label}</Badge>;
}