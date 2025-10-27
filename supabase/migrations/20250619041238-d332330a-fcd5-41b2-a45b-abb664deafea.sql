
-- Create profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        CREATE TABLE public.profiles (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            name TEXT,
            email TEXT,
            "role" TEXT DEFAULT 'customer' CHECK ("role" IN ('admin', 'customer')),
            status TEXT DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Suspended')),
            phone TEXT,
            address TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END$$;

-- Create function to handle user creation if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, "role")
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 
        NEW.email,
        CASE 
            WHEN NEW.email = 'admin@example.com' THEN 'admin'
            ELSE 'customer'
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Check if pets table exists and create if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pets') THEN
        CREATE TABLE public.pets (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'reptile', 'other')),
          species TEXT NOT NULL,
          breed TEXT,
          weight TEXT,
          birth_date DATE NOT NULL,
          gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
    END IF;
END$$;

-- Check if appointments table exists and create if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') THEN
        CREATE TABLE public.appointments (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          pet_name TEXT NOT NULL,
          service TEXT NOT NULL,
          appointment_date DATE NOT NULL,
          time_slot TEXT NOT NULL,
          owner_name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
    END IF;
END$$;

-- Enable RLS on existing tables (this is idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create policies for profiles table
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Allow profile creation during signup (more permissive)
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (true);

-- Allow service role to manage profiles (for triggers)
CREATE POLICY "Service role can manage profiles" 
  ON public.profiles 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Drop existing pet policies if they exist
DROP POLICY IF EXISTS "Users can view their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can insert their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can update their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can delete their own pets" ON public.pets;

-- Create policies for pets table
CREATE POLICY "Users can view their own pets" 
  ON public.pets 
  FOR SELECT 
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own pets" 
  ON public.pets 
  FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own pets" 
  ON public.pets 
  FOR UPDATE 
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own pets" 
  ON public.pets 
  FOR DELETE 
  USING (auth.uid() = owner_id);

-- Drop existing appointment policies if they exist
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete their own appointments" ON public.appointments;

-- Create policies for appointments table
CREATE POLICY "Users can view their own appointments" 
  ON public.appointments 
  FOR SELECT 
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own appointments" 
  ON public.appointments 
  FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own appointments" 
  ON public.appointments 
  FOR UPDATE 
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own appointments" 
  ON public.appointments 
  FOR DELETE 
  USING (auth.uid() = owner_id);

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all pets" ON public.pets;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;

-- Admin policies (admins can view/manage all data)
-- Create lightweight admins table to avoid self-referential policy recursion
CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE POLICY "Admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update any profile" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete any profile" 
  ON public.profiles 
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all pets" 
  ON public.pets 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all appointments" 
  ON public.appointments 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins a
      WHERE a.user_id = auth.uid()
    )
  );
