import { AdminLayout } from "@/components/admin/AdminLayout";
import { KPICard } from "@/components/admin/KPICard";
import { ConversionChart } from "@/components/admin/ConversionChart";
import { ReferralRankingCard } from "@/components/admin/ReferralRankingCard";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useInfluencerPartnerships } from "@/hooks/useInfluencerPartnerships";
import { Building2, DollarSign, UserPlus, CreditCard, Handshake } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();
  const { partnershipsQuery } = useInfluencerPartnerships();
  
  const activeInfluencers = (partnershipsQuery.data || []).filter(i => i.status === "active");
  const totalCommissionPercent = activeInfluencers.reduce((s, i) => s + Number(i.commission_percent), 0);
  const estimatedCommission = (stats?.mrr || 0) * (totalCommissionPercent / 100);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Visão geral do SaaS BarberSoft</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <KPICard
                title="Barbearias Ativas"
                value={stats?.totalActiveCompanies || 0}
                icon={<Building2 className="h-6 w-6" />}
              />
              <KPICard
                title="MRR Estimado"
                value={`R$ ${(stats?.mrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                icon={<DollarSign className="h-6 w-6" />}
              />
              <KPICard
                title="Novos Cadastros"
                value={stats?.newSignups30Days || 0}
                subtitle="Últimos 30 dias"
                icon={<UserPlus className="h-6 w-6" />}
              />
              <KPICard
                title="Status de Pagamento"
                value={`${stats?.companiesUpToDate || 0} ok`}
                subtitle={`${stats?.companiesOverdue || 0} atrasados`}
                icon={<CreditCard className="h-6 w-6" />}
              />
              <KPICard
                title="Comissões Influencers"
                value={`R$ ${estimatedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                subtitle={`${activeInfluencers.length} ativos`}
                icon={<Handshake className="h-6 w-6" />}
              />
            </div>

            <ConversionChart data={stats?.visitsByDay || []} />
            <ReferralRankingCard />
          </>
        )}
      </div>
    </AdminLayout>
  );
}
