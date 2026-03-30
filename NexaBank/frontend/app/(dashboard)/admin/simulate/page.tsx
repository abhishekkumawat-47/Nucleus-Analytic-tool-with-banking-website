"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { API_BASE_URL } from "@/lib/api"
import { AdminGuard } from "@/components/AdminGuard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Database, 
  Play, 
  CheckCircle2, 
  Loader2,
  TrendingUp,
  Activity,
  UserPlus,
  ShieldAlert
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminSimulatePage() {
  const [count, setCount] = useState(20)
  const [tenantId, setTenantId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [bankList, setBankList] = useState<any[]>([])

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/tenants/ifsc-list`, { withCredentials: true });
        setBankList(res.data || []);
        if (res.data && res.data.length > 0) {
          setTenantId(res.data[0].tenantId);
        }
      } catch (err) {
        console.error("Failed to fetch bank list:", err);
      }
    };
    fetchBanks();
  }, []);

  const handleSimulate = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await axios.post(`${API_BASE_URL}/events/simulate`, { count, tenantId }, { withCredentials: true })
      setResult(res.data)
      toast.success("Simulation complete!")
    } catch (err: any) {
      console.error("Simulation failed:", err)
      toast.error(err.response?.data?.error || "Simulation failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminGuard>
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
        <div className="flex justify-between items-start">
           <div>
              <h1 className="text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
                 Analytics Simulation
              </h1>
              <p className="text-muted-foreground font-medium mt-1">Generate high-fidelity synthetic user data for your analytics dashboards.</p>
           </div>
           
           <div className="bg-amber-50 border border-amber-100 px-6 py-4 rounded-3xl flex items-center gap-4">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
              <div>
                 <p className="text-xs font-black text-amber-900 uppercase">Warning</p>
                 <p className="text-xs font-bold text-amber-700">Creates permanent mock records in database.</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-1 space-y-6">
              <Card className="rounded-[2.5rem] border-zinc-100 shadow-xl shadow-zinc-200/50">
                 <CardHeader>
                    <CardTitle className="text-xl font-black">Simulator Config</CardTitle>
                    <CardDescription className="font-medium">Define population parameters.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-6">
                    <div className="space-y-2">
                       <Label className="text-xs font-black uppercase text-zinc-400">Target Tenant</Label>
                       <Select value={tenantId} onValueChange={setTenantId}>
                          <SelectTrigger className="h-12 rounded-2xl font-bold border-zinc-100">
                             <SelectValue placeholder="Select Bank" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-zinc-100">
                             {bankList.map((bank) => (
                               <SelectItem key={bank.tenantId} value={bank.tenantId} className="font-bold">
                                 {bank.bankName} ({bank.tenantId})
                               </SelectItem>
                             ))}
                          </SelectContent>
                       </Select>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-xs font-black uppercase text-zinc-400">User Count (Max 100)</Label>
                       <Input 
                         type="number" 
                         value={count} 
                         onChange={(e) => setCount(Number(e.target.value))}
                         className="h-12 rounded-2xl font-bold border-zinc-100"
                       />
                    </div>

                    <Button 
                      className="w-full h-14 rounded-2xl bg-zinc-900 hover:bg-violet-600 text-white font-black shadow-lg shadow-zinc-200 transition-all cursor-pointer"
                      onClick={handleSimulate}
                      disabled={loading}
                    >
                       {loading ? <Loader2 className="mr-2 animate-spin h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                       {loading ? 'Processing...' : 'Run Simulation'}
                    </Button>
                 </CardContent>
              </Card>

              <div className="bg-zinc-50 border border-zinc-100 p-8 rounded-[2.5rem] space-y-4">
                 <h3 className="font-black text-zinc-900 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-violet-600" />
                    How it works
                 </h3>
                 <ul className="space-y-3">
                    {[
                      'Generates unique names & emails',
                      'Assigns valid bank IFSC prefixes',
                      'Simulates KYC document uploads',
                      'Creates random loan histories',
                      'Logs realistic login events'
                    ].map((step, i) => (
                      <li key={i} className="flex gap-2 text-xs font-medium text-zinc-600">
                         <div className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1 opacity-50" />
                         {step}
                      </li>
                    ))}
                 </ul>
              </div>
           </div>

           <div className="lg:col-span-2 space-y-6">
              {!result && !loading && (
                 <div className="h-full min-h-[400px] border-2 border-dashed border-zinc-100 rounded-[3rem] flex flex-col items-center justify-center text-center p-12 bg-zinc-50/30">
                    <Database className="h-16 w-16 text-zinc-200 mb-4" />
                    <h3 className="text-xl font-bold text-zinc-400 italic">No Active Results</h3>
                    <p className="text-sm text-zinc-400 max-w-xs mt-2 font-medium">Configure and run the simulator to see population statistics and analytics effects.</p>
                 </div>
              )}

              {loading && (
                 <div className="h-full min-h-[400px] bg-white border border-zinc-100 rounded-[3rem] flex flex-col items-center justify-center text-center p-12 shadow-sm">
                    <div className="h-20 w-20 rounded-full flex items-center justify-center mb-6">
                       <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
                    </div>
                    <h3 className="text-xl font-black text-zinc-900">Populating Records...</h3>
                    <p className="text-muted-foreground font-medium mt-2">Connecting to analytics engine and generating secure user profiles.</p>
                 </div>
              )}

              {result && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       {[
                         { label: 'Identities', value: result.usersCreated, color: 'text-violet-700', icon: UserPlus },
                         { label: 'Applications', value: result.loansApplied, color: 'text-violet-700', icon: Database },
                         { label: 'Compliant', value: result.kycCompleted, color: 'text-violet-700', icon: CheckCircle2 },
                         { label: 'Analytics Opt-in', value: result.fullyCompleted, color: 'text-violet-700', icon: TrendingUp }
                       ].map((stat, i) => (
                         <div key={i} className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm flex flex-col items-center text-center">
                            <stat.icon className={`h-6 w-6 ${stat.color} mb-3`} />
                            <span className="text-3xl font-black text-zinc-900">{stat.value}</span>
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{stat.label}</span>
                         </div>
                       ))}
                    </div>

                    <div className="bg-emerald-600 p-8 rounded-2xl text-white">
                       <div className="flex gap-6 items-start">
                          <div>
                             <h3 className="text-xl font-black tracking-tight">Records Live</h3>
                             <p className="text-emerald-100 font-medium mt-1 leading-relaxed">
                                The simulation for {tenantId === 'bank_a' ? 'NexaBank' : 'SafeX Bank'} has concluded. 
                                These users are now available in the Admin Loan Processing queue and are actively generating events for the Analytics dashboard.
                             </p>
                          </div>
                       </div>
                    </div>
                 </div>
              )}
           </div>
        </div>
      </div>
    </AdminGuard>
  )
}
