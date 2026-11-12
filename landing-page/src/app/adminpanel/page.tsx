import type { Metadata } from 'next';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminLogin from '@/components/admin/AdminLogin';
import { adminConfigured, isAdmin } from '@/lib/admin/session';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }
};

export const dynamic = 'force-dynamic';

export default async function AdminPanelPage() {
  if (!adminConfigured()) return <AdminLogin configured={false} />;
  if (!(await isAdmin())) return <AdminLogin configured />;
  return <AdminDashboard />;
}
