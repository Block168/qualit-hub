import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, can } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/amdec")({
  component: AmdecPage,
});

const SOUS_ENSEMBLES = [
  "Système documentaire", "Audit interne", "Actions correctives",
  "Satisfaction client", "Revue de direction", "Compétences",
  "Infrastructure", "Pilotage des processus", "Amélioration continue",
  "Risques et opportunités",
];

const SEED: Array<Omit<AmdecRow, "id" | "numero">> = [
  { sous_ensemble: "Système documentaire", element: "Procédures", fonction: "Encadrer les processus", mode_defaillance: "Procédure obsolète", cause: "Mise à jour non planifiée", effet: "Non-conformité ISO", detection: "Audit interne" },
  { sous_ensemble: "Système documentaire", element: "Enregistrements", fonction: "Tracer les activités", mode_defaillance: "Perte de document", cause: "Mauvais archivage", effet: "Perte traçabilité", detection: "Contrôle périodique" },
  { sous_ensemble: "Audit interne", element: "Planning audit", fonction: "Vérifier conformité", mode_defaillance: "Audit non réalisé", cause: "Manque ressources", effet: "Dérive non détectée", detection: "Revue de direction" },
  { sous_ensemble: "Audit interne", element: "Auditeur", fonction: "Évaluer", mode_defaillance: "Manque d'objectivité", cause: "Conflit d'intérêt", effet: "Constats biaisés", detection: "Revue par pairs" },
  { sous_ensemble: "Actions correctives", element: "Suivi CAPA", fonction: "Clôturer écarts", mode_defaillance: "CAPA non clôturée", cause: "Manque suivi", effet: "Récurrence", detection: "Tableau de bord" },
  { sous_ensemble: "Actions correctives", element: "Analyse causes", fonction: "Identifier cause racine", mode_defaillance: "Analyse superficielle", cause: "Méthode mal appliquée", effet: "Solution inefficace", detection: "Audit qualité" },
  { sous_ensemble: "Satisfaction client", element: "Enquête", fonction: "Mesurer satisfaction", mode_defaillance: "Faible taux retour", cause: "Format inadapté", effet: "Données non représentatives", detection: "Analyse statistique" },
  { sous_ensemble: "Satisfaction client", element: "Réclamations", fonction: "Capturer mécontentement", mode_defaillance: "Réclamation perdue", cause: "Canal non identifié", effet: "Insatisfaction non traitée", detection: "Suivi commercial" },
  { sous_ensemble: "Revue de direction", element: "Données d'entrée", fonction: "Alimenter décisions", mode_defaillance: "Données incomplètes", cause: "Absence consolidation", effet: "Décisions erronées", detection: "Validation préalable" },
  { sous_ensemble: "Revue de direction", element: "Compte rendu", fonction: "Tracer décisions", mode_defaillance: "CR non diffusé", cause: "Oubli", effet: "Actions non engagées", detection: "Liste de diffusion" },
  { sous_ensemble: "Compétences", element: "Plan formation", fonction: "Développer compétences", mode_defaillance: "Formations annulées", cause: "Budget réduit", effet: "Lacunes compétences", detection: "Évaluation annuelle" },
  { sous_ensemble: "Compétences", element: "Évaluation", fonction: "Mesurer aptitudes", mode_defaillance: "Évaluation subjective", cause: "Grille floue", effet: "Décisions inéquitables", detection: "Audit RH" },
  { sous_ensemble: "Infrastructure", element: "Équipements", fonction: "Produire", mode_defaillance: "Panne", cause: "Maintenance insuffisante", effet: "Arrêt production", detection: "Indicateur GMAO" },
  { sous_ensemble: "Infrastructure", element: "Locaux", fonction: "Accueillir activité", mode_defaillance: "Conditions dégradées", cause: "Entretien différé", effet: "Risque H&S", detection: "Inspection mensuelle" },
  { sous_ensemble: "Pilotage des processus", element: "Indicateurs", fonction: "Mesurer performance", mode_defaillance: "Indicateur non suivi", cause: "Absence pilote", effet: "Dérive invisible", detection: "Revue mensuelle" },
  { sous_ensemble: "Pilotage des processus", element: "Cartographie", fonction: "Décrire processus", mode_defaillance: "Carto obsolète", cause: "Pas de mise à jour", effet: "Mauvaise compréhension", detection: "Revue annuelle" },
  { sous_ensemble: "Amélioration continue", element: "Suggestions", fonction: "Capter idées", mode_defaillance: "Pas de suggestions", cause: "Manque d'animation", effet: "Stagnation", detection: "Compteur boîte à idées" },
  { sous_ensemble: "Amélioration continue", element: "Plans d'action", fonction: "Mettre en œuvre", mode_defaillance: "Actions non terminées", cause: "Priorités changeantes", effet: "Bénéfices non atteints", detection: "Pilotage projet" },
  { sous_ensemble: "Risques et opportunités", element: "Cartographie risques", fonction: "Identifier risques", mode_defaillance: "Risque non identifié", cause: "Analyse partielle", effet: "Crise non anticipée", detection: "Revue trimestrielle" },
];

interface AmdecRow {
  id: string; numero: number; sous_ensemble: string; element: string;
  fonction: string; mode_defaillance: string; cause: string;
  effet: string; detection: string;
}

const empty = {
  sous_ensemble: SOUS_ENSEMBLES[0], element: "", fonction: "",
  mode_defaillance: "", cause: "", effet: "", detection: "",
};

function AmdecPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AmdecRow | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [seeded, setSeeded] = useState(false);

  const list = useQuery({
    queryKey: ["amdec"],
    queryFn: async () => {
      const { data, error } = await supabase.from("amdec").select("*").order("numero", { ascending: true });
      if (error) throw error;
      return data as AmdecRow[];
    },
  });

  // Auto-seed on first load if empty
  useEffect(() => {
    if (!list.data || seeded || list.isLoading) return;
    if (list.data.length === 0 && can.manageAMDEC(profile?.role)) {
      setSeeded(true);
      supabase.from("amdec").insert(SEED).then(({ error }) => {
        if (!error) qc.invalidateQueries({ queryKey: ["amdec"] });
      });
    }
  }, [list.data, list.isLoading, seeded, profile, qc]);

  const save = useMutation({
    mutationFn: async () => {
      const required = ["element", "fonction", "mode_defaillance", "cause", "effet", "detection"] as const;
      for (const k of required) if (!(form as any)[k].trim()) throw new Error(`Champ requis : ${k}`);
      if (editing) {
        const { error } = await supabase.from("amdec").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("amdec").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Entrée mise à jour" : "Entrée ajoutée");
      qc.invalidateQueries({ queryKey: ["amdec"] });
      setOpen(false); setEditing(null); setForm({ ...empty });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("amdec").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["amdec"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => { setEditing(null); setForm({ ...empty }); setOpen(true); };
  const openEdit = (r: AmdecRow) => {
    setEditing(r);
    setForm({
      sous_ensemble: r.sous_ensemble, element: r.element, fonction: r.fonction,
      mode_defaillance: r.mode_defaillance, cause: r.cause, effet: r.effet, detection: r.detection,
    });
    setOpen(true);
  };

  const filtered = filter === "all" ? list.data : list.data?.filter((r) => r.sous_ensemble === filter);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AMDEC</h1>
          <p className="text-muted-foreground">Analyse des Modes de Défaillance, de leurs Effets et de leur Criticité</p>
        </div>
        {can.manageAMDEC(profile?.role) && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm({ ...empty }); } }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Ajouter entrée</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? `Modifier entrée n°${editing.numero}` : "Nouvelle entrée AMDEC"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Sous-ensemble *</Label>
                  <Select value={form.sous_ensemble} onValueChange={(v) => setForm({ ...form, sous_ensemble: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SOUS_ENSEMBLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Élément *</Label><Input value={form.element} onChange={(e) => setForm({ ...form, element: e.target.value })} /></div>
                  <div><Label>Fonction *</Label><Input value={form.fonction} onChange={(e) => setForm({ ...form, fonction: e.target.value })} /></div>
                </div>
                <div><Label>Mode de défaillance *</Label><Input value={form.mode_defaillance} onChange={(e) => setForm({ ...form, mode_defaillance: e.target.value })} /></div>
                <div><Label>Cause de la défaillance *</Label><Input value={form.cause} onChange={(e) => setForm({ ...form, cause: e.target.value })} /></div>
                <div><Label>Effet de la défaillance *</Label><Input value={form.effet} onChange={(e) => setForm({ ...form, effet: e.target.value })} /></div>
                <div><Label>Détection *</Label><Input value={form.detection} onChange={(e) => setForm({ ...form, detection: e.target.value })} /></div>
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

      <div className="flex items-center gap-3">
        <Label className="text-sm">Filtre par sous-ensemble :</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {SOUS_ENSEMBLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{filtered?.length ?? 0} entrée(s)</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : (filtered?.length ?? 0) === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Aucune entrée.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Sous-ensemble</TableHead>
                    <TableHead>Élément</TableHead>
                    <TableHead>Fonction</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Cause</TableHead>
                    <TableHead>Effet</TableHead>
                    <TableHead>Détection</TableHead>
                    {can.manageAMDEC(profile?.role) && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono">{r.numero}</TableCell>
                      <TableCell className="text-xs">{r.sous_ensemble}</TableCell>
                      <TableCell className="text-sm">{r.element}</TableCell>
                      <TableCell className="text-sm">{r.fonction}</TableCell>
                      <TableCell className="text-sm">{r.mode_defaillance}</TableCell>
                      <TableCell className="text-sm">{r.cause}</TableCell>
                      <TableCell className="text-sm">{r.effet}</TableCell>
                      <TableCell className="text-sm">{r.detection}</TableCell>
                      {can.manageAMDEC(profile?.role) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => { if (confirm("Supprimer ?")) del.mutate(r.id); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
