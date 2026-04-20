"use client";

import { UserData } from "@/components/context/UserContext";
import { Badge } from "@/components/ui/badge";

export const TenantIndicator = () => {
  const { tenantId, role } = UserData();

  if (!tenantId) return null;

  const getBankName = () => {
    if (tenantId === 'bank_a') return 'JBank';
    if (tenantId === 'bank_b') return 'OBank';
    return 'JavaBank';
  };

  const getBankColor = () => {
    if (tenantId === 'bank_a') return 'bg-green-100 text-green-700 border-green-200';
    if (tenantId === 'bank_b') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`${getBankColor()} flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full`}>
        {getBankName()}
      </Badge>
    </div>
  );
};
