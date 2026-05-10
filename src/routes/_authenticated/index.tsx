import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { Loader2, Plus, Target, TrendingUp, FileWarning, Wrench, Grid3x3 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, can } from "@/lib/auth";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

const TARGET = 95;

function Dashboard() {
  const { profile } = useAuth();
  const qc = useQueryClient();

  const kpis = useQuery({
    queryKey: ["kpi_historique"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_historique")
        .select("*")
        .order("mois", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const counts = useQuery({
    queryKey: ["dashboard_counts"],
    queryFn: async () => {
      const [nc, capa, amdec] = await Promise.all([
        supabase.from("non_conformites").select("statut", { count: "exact", head: false }),
        supabase.from("capa").select("statut", { count: "exact", head: false }),
        supabase.from("amdec").select("id", { count: "exact", head: true }),
      ]);
      return {
        ncTotal: nc.data?.length ?? 0,
        ncOpen: nc.data?.filter((r: any) => r.statut !== "Clôturée").length ?? 0,
        capaTotal: capa.data?.length ?? 0,
        capaOpen: capa.data?.filter((r: any) => r.statut !== "Clôturée").length ?? 0,
        amdec: amdec.count ?? 0,
      };
    },
  });

  const latest = kpis.data?.[kpis.data.length - 1];
  const current = latest?.taux_efficacite ?? 0;
  const cible = latest?.cible ?? TARGET;

  const [open, setOpen] = useState(false);
  const [mois, setMois] = useState("");
  const [taux, setTaux] = useState("");
  const [note, setNote] = useState("");

  const addKpi = useMutation({
    mutationFn: async () => {
      if (!mois || !taux) throw new Error("Mois et taux requis");
      const { error } = await supabase.from("kpi_historique").insert({
        mois: `${mois}-01`,
        taux_efficacite: Number(taux),
        cible: TARGET,
        note: note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("KPI ajouté");
      qc.invalidateQueries({ queryKey: ["kpi_historique"] });
      setOpen(false); setMois(""); setTaux(""); setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const gaugeData = [{ name: "Taux", value: Number(current), fill: "var(--color-primary)" }];

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble du SMQ</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={FileWarning} label="Non-conformités" value={counts.data?.ncTotal} sub={`${counts.data?.ncOpen ?? 0} ouvertes`} />
        <StatCard icon={Wrench} label="CAPA" value={counts.data?.capaTotal} sub={`${counts.data?.capaOpen ?? 0} en cours`} />
        <StatCard icon={Grid3x3} label="Entrées AMDEC" value={counts.data?.amdec} sub="catalogue des risques" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Taux d'efficacité des actions</CardTitle>
            <CardDescription>Cible : {cible}%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="70%" outerRadius="100%" data={gaugeData} startAngle={180} endAngle={0}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background dataKey="value" cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center mt-8 pointer-events-none">
                <div className="text-5xl font-bold">{Number(current).toFixed(1)}%</div>
                <div className={`text-sm mt-1 ${current >= cible ? "text-success" : "text-destructive"}`}>
                  {current >= cible ? "✓ Objectif atteint" : `${(cible - Number(current)).toFixed(1)} pts sous l'objectif`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Évolution mensuelle</CardTitle>
              <CardDescription>Historique du taux d'efficacité</CardDescription>
            </div>
            {can.manageKPI(profile?.role) && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Ajouter KPI</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Ajouter KPI du mois</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Mois</Label><Input type="month" value={mois} onChange={(e) => setMois(e.target.value)} required /></div>
                    <div><Label>Taux d'efficacité (%)</Label><Input type="number" step="0.1" min="0" max="100" value={taux} onChange={(e) => setTaux(e.target.value)} required /></div>
                    <div><Label>Note</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => addKpi.mutate()} disabled={addKpi.isPending}>
                      {addKpi.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enregistrer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {kpis.isLoading ? (
                <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
              ) : (kpis.data?.length ?? 0) === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Aucune donnée KPI. Ajoutez le premier mois.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={kpis.data?.map((k: any) => ({
                    mois: format(parseISO(k.mois), "MMM yy", { locale: fr }),
                    taux: Number(k.taux_efficacite),
                    cible: Number(k.cible),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="mois" fontSize={12} />
                    <YAxis domain={[0, 100]} fontSize={12} />
                    <Tooltip />
                    <ReferenceLine y={cible} stroke="var(--color-warning)" strokeDasharray="4 4" label={{ value: `Cible ${cible}%`, fontSize: 11 }} />
                    <Line type="monotone" dataKey="taux" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value?: number; sub: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-3xl font-bold">{value ?? "—"}</div>
            <div className="text-xs text-muted-foreground mt-1">{sub}</div>
          </div>
          <Icon className="h-8 w-8 text-primary/40" />
        </div>
      </CardContent>
    </Card>
  );
}
