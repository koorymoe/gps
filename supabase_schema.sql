-- ===================================
-- شركة الأماني - GPS System Schema
-- ===================================

-- جدول الملفات الشخصية للموظفين
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الزبائن
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  father_name TEXT NOT NULL,
  grandfather_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  id_card_front_url TEXT DEFAULT '',
  id_card_back_url TEXT DEFAULT '',
  residence_card_front_url TEXT DEFAULT '',
  residence_card_back_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول طلبات شراء الأجهزة
CREATE TABLE device_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES profiles(id) NOT NULL,
  admin_id UUID REFERENCES profiles(id),
  purchase_type TEXT NOT NULL CHECK (purchase_type IN ('device_sim', 'device_only')),
  subscription_type TEXT CHECK (subscription_type IN ('3_months', '6_months', 'yearly')),
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'expiring_soon', 'expired_40', 'expired_80', 'terminated')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'delivered')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

-- جدول طلبات الصيانة
CREATE TABLE maintenance_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES profiles(id) NOT NULL,
  admin_id UUID REFERENCES profiles(id),
  problem_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ===================================
-- Row Level Security (RLS)
-- ===================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- الموظفون يقرؤون ملفاتهم الشخصية فقط
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- الزبائن - الكل يقرأ، الكل يكتب (موظفون ومدراء)
CREATE POLICY "customers_all" ON customers FOR ALL USING (auth.role() = 'authenticated');

-- طلبات الأجهزة - الموظف يكتب، الإداري يقرأ ويعدل
CREATE POLICY "device_requests_insert" ON device_requests FOR INSERT WITH CHECK (auth.uid() = employee_id);
CREATE POLICY "device_requests_select_employee" ON device_requests FOR SELECT USING (auth.uid() = employee_id);
CREATE POLICY "device_requests_all_admin" ON device_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- طلبات الصيانة
CREATE POLICY "maintenance_insert" ON maintenance_requests FOR INSERT WITH CHECK (auth.uid() = employee_id);
CREATE POLICY "maintenance_select_employee" ON maintenance_requests FOR SELECT USING (auth.uid() = employee_id);
CREATE POLICY "maintenance_all_admin" ON maintenance_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ===================================
-- Storage Bucket للمستندات
-- ===================================
-- أنشئ bucket اسمه "documents" في Supabase Storage
-- واجعله Public

-- ===================================
-- دالة إنشاء الملف الشخصي تلقائياً
-- ===================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'موظف'), COALESCE(NEW.raw_user_meta_data->>'role', 'employee'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
