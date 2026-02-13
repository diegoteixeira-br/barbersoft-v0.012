import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { InfluencerPartnership, useInfluencerLeadRevenue } from "@/hooks/useInfluencerPartnerships";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  influencer: InfluencerPartnership | null;
  onSubmit: (values: any) => void;
  isLoading?: boolean;
}

export function InfluencerPaymentModal({ open, onOpenChange, influencer, onSubmit, isLoading }: Props) {
  const { data: leadRevenue } = useInfluencerLeadRevenue(influencer?.referral_code);
  const now = new Date();
  const [periodMonth, setPeriodMonth] = useState(String(now.getMonth()));
  const [periodYear, setPeriodYear] = useState(String(now.getFullYear()));
  const [paymentMethod, setPaymentMethod] = useState("pix");

  if (!influencer) return null;

  const revenueValue = leadRevenue || 0;
  const amount = revenueValue * (influencer.commission_percent / 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const month = Number(periodMonth);
    const year = Number(periodYear);
    const periodStart = new Date(year, month, 1).toISOString().split("T")[0];
    const periodEnd = new Date(year, month + 1, 0).toISOString().split("T")[0];

    onSubmit({
      partnership_id: influencer.id,
      period_start: periodStart,
      period_end: periodEnd,
      mrr_base: revenueValue,
      commission_percent: influencer.commission_percent,
      amount,
      status: "pending",
      payment_method: paymentMethod,
    });
    onOpenChange(false);
  };

  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Gerar Pagamento - {influencer.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mês</Label>
              <Select value={periodMonth} onValueChange={setPeriodMonth}>
                <SelectTrigger className="bg-slate-700 border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano</Label>
              <Input type="number" value={periodYear} onChange={e => setPeriodYear(e.target.value)} className="bg-slate-700 border-slate-600" />
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Receita dos leads vinculados</span>
              <span>R$ {revenueValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Comissão</span>
              <span>{influencer.commission_percent}%</span>
            </div>
            <div className="flex justify-between font-bold text-green-400 border-t border-slate-600 pt-2">
              <span>Valor da comissão</span>
              <span>R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            A comissão é calculada sobre o valor pago pelos leads vinculados ao link deste influenciador. Comissão vitalícia enquanto o lead mantiver assinatura ativa.
          </p>
          <div>
            <Label>Método de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="bg-slate-700 border-slate-600"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-slate-600">Cancelar</Button>
            <Button type="submit" disabled={isLoading}>Gerar Pagamento</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
