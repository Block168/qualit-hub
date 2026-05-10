-- Add name column to non_conformites table
ALTER TABLE public.non_conformites ADD COLUMN name text NOT NULL DEFAULT '';

-- Add comment
COMMENT ON COLUMN public.non_conformites.name IS 'User-defined name for the non-conformity';
