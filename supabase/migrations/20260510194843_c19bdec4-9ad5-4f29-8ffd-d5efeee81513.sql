-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'responsable_qualite', 'pilote', 'auditeur');

-- Profiles
CREATE TABLE public.users_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'auditeur',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.users_profiles ENABLE ROW LEVEL SECURITY;

-- Security definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users_profiles WHERE id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_role(_user_id uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.users_profiles WHERE id = _user_id
$$;

-- Profile policies
CREATE POLICY "profiles_select_all" ON public.users_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_self" ON public.users_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own_name" ON public.users_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.users_profiles WHERE id = auth.uid()));
CREATE POLICY "profiles_admin_all" ON public.users_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup. First signup becomes admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first boolean;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.users_profiles) INTO is_first;
  INSERT INTO public.users_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    CASE WHEN is_first THEN 'admin'::public.app_role ELSE 'auditeur'::public.app_role END
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Sequences for auto-generated references
CREATE SEQUENCE public.nc_seq;
CREATE SEQUENCE public.capa_seq;

CREATE OR REPLACE FUNCTION public.gen_nc_ref() RETURNS text LANGUAGE sql AS $$
  SELECT 'NC-SMQ-' || EXTRACT(YEAR FROM now())::text || '-' || LPAD(nextval('public.nc_seq')::text, 3, '0')
$$;
CREATE OR REPLACE FUNCTION public.gen_capa_ref() RETURNS text LANGUAGE sql AS $$
  SELECT 'CAPA-' || EXTRACT(YEAR FROM now())::text || '-' || LPAD(nextval('public.capa_seq')::text, 3, '0')
$$;

-- NON CONFORMITES
CREATE TABLE public.non_conformites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT public.gen_nc_ref(),
  date_incident timestamptz NOT NULL,
  type_nc text NOT NULL,
  description text NOT NULL,
  reaction_immediate text,
  statut text NOT NULL DEFAULT 'Ouverte',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.non_conformites ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER nc_updated BEFORE UPDATE ON public.non_conformites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "nc_select_all" ON public.non_conformites FOR SELECT TO authenticated USING (true);
CREATE POLICY "nc_insert" ON public.non_conformites FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'responsable_qualite') OR public.has_role(auth.uid(),'pilote')
);
CREATE POLICY "nc_update" ON public.non_conformites FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'responsable_qualite')
);
CREATE POLICY "nc_delete" ON public.non_conformites FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'responsable_qualite')
);

-- CAPA
CREATE TABLE public.capa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT public.gen_capa_ref(),
  nc_id uuid REFERENCES public.non_conformites(id) ON DELETE SET NULL,
  description_probleme text NOT NULL,
  actions_confinement text,
  why1 text, rep1 text,
  why2 text, rep2 text,
  why3 text, rep3 text,
  why4 text, rep4 text,
  why5 text, rep5 text,
  cause_racine text,
  actions_correctives text,
  date_cible_corrective date,
  responsable_corrective text,
  actions_preventives text,
  date_cible_preventive date,
  responsable_preventive text,
  kpi_avant numeric,
  kpi_apres numeric,
  statut text NOT NULL DEFAULT 'Ouverte',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.capa ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER capa_updated BEFORE UPDATE ON public.capa FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "capa_select_all" ON public.capa FOR SELECT TO authenticated USING (true);
CREATE POLICY "capa_insert" ON public.capa FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'responsable_qualite') OR public.has_role(auth.uid(),'pilote')
);
CREATE POLICY "capa_update" ON public.capa FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'responsable_qualite')
);
CREATE POLICY "capa_delete" ON public.capa FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'responsable_qualite')
);

-- AMDEC
CREATE TABLE public.amdec (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero serial NOT NULL UNIQUE,
  sous_ensemble text NOT NULL,
  element text NOT NULL,
  fonction text NOT NULL,
  mode_defaillance text NOT NULL,
  cause text NOT NULL,
  effet text NOT NULL,
  detection text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.amdec ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER amdec_updated BEFORE UPDATE ON public.amdec FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "amdec_select_all" ON public.amdec FOR SELECT TO authenticated USING (true);
CREATE POLICY "amdec_insert" ON public.amdec FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'responsable_qualite')
);
CREATE POLICY "amdec_update" ON public.amdec FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'responsable_qualite')
);
CREATE POLICY "amdec_delete" ON public.amdec FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'responsable_qualite')
);

-- KPI HISTORIQUE
CREATE TABLE public.kpi_historique (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mois date NOT NULL UNIQUE,
  taux_efficacite numeric NOT NULL,
  cible numeric NOT NULL DEFAULT 95,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kpi_historique ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kpi_select_all" ON public.kpi_historique FOR SELECT TO authenticated USING (true);
CREATE POLICY "kpi_insert" ON public.kpi_historique FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'responsable_qualite')
);
CREATE POLICY "kpi_update" ON public.kpi_historique FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'responsable_qualite')
);
CREATE POLICY "kpi_delete" ON public.kpi_historique FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'admin')
);