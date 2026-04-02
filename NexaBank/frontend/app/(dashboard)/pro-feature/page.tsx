"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Lock,
  Bitcoin,
  TrendingUp,
  Zap,
  ArrowRight,
  CheckCircle2,
  Gem,
  Receipt,
  Library,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCcw,
  BookOpen,
  DollarSign
} from "lucide-react"
import { toast } from "sonner"
import axios from "axios"
import { API_BASE_URL } from "@/lib/api"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { useEventTracker } from "@/hooks/useEventTracker"
import { UserData } from "@/components/context/UserContext"

const featureData: Record<string, {
  title: string
  tagline: string
  description: string
  icon: any
  gradient: string
  perks: string[]
}> = {
  "ai-insights": {
    title: "Finance Library",
    tagline: "Premium knowledge base for professional banking and investments.",
    description: "Access curated eBooks, case studies, and real-time market research. From risk management to advanced portfolio theory, our library is the ultimate resource for the informed investor.",
    icon: Library,
    gradient: "from-violet-600 via-indigo-600 to-blue-600",
    perks: [
      "Exclusive eBooks on Modern Monetary Theory",
      "Real-time institutional research reports",
      "Advanced risk management framework guides",
      "Tax strategy webinars and archives",
    ]
  },
  "crypto-trading": {
    title: "Crypto Trading",
    tagline: "Institutional-grade digital asset management.",
    description: "Trade BTC, ETH, and other top-tier assets with zero slippage. Integrated cold-storage security and instant fiat-to-crypto conversion.",
    icon: Bitcoin,
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    perks: [
      "Direct exchange access with institutional liquidity",
      "Automated stop-loss and limit orders",
      "Tax-ready transaction exports",
    ]
  },
  "wealth-management-pro": {
    title: "Wealth Management",
    tagline: "Sophisticated portfolio tracking and rebalancing.",
    description: "Get a 360-degree view of your global net worth. Automated asset allocation and tax-loss harvesting for high-net-worth individuals.",
    icon: Gem,
    gradient: "from-emerald-600 via-teal-600 to-cyan-600",
    perks: [
      "Custom asset allocation strategies",
      "Direct indexing and fractional share support",
      "Consolidated tax reporting for all assets",
    ]
  },
  "bulk-payroll-processing": {
    title: "Payroll Pro",
    tagline: "Enterprise-scale payroll automation.",
    description: "Manage global teams with automated tax filings and instant direct deposits. Scalable from 10 to 10,000 employees.",
    icon: Receipt,
    gradient: "from-blue-700 via-indigo-700 to-purple-700",
    perks: [
      "Instant bulk payout to employee nodes",
      "Automated compliance tracking",
      "Employee self-service portal integration",
    ]
  },
}

function ProFeatureContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const featureId = searchParams.get("id") || "ai-insights"
  const feature = featureData[featureId] || featureData["ai-insights"]
  const FeatureIcon = feature.icon

  const [isUnlocked, setIsUnlocked] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [unlocking, setUnlocking] = useState(false)

  const { isAuth } = UserData()
  const { track } = useEventTracker()

  useEffect(() => {
    track(`pro.${featureId}.view`)
  }, [featureId, track])  useEffect(() => {
    if (isAuth) fetchStatus()
  }, [featureId, isAuth])

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/pro/status`, { withCredentials: true })
      const active = res.data.some((l: any) => l.featureId === featureId)
      setIsUnlocked(active)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  const handleUnlock = async () => {
    setUnlocking(true)
    try {
      await axios.post(`${API_BASE_URL}/pro/unlock`, { featureId }, { withCredentials: true })
      toast.success(`Subscription Unlocked! ₹2,000 deducted from your account. ${feature.title} is now active for 30 days.`)
      setIsUnlocked(true)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Unlock failed";
      if (errorMsg.includes("Insufficient")) {
        toast.error("Insufficient Funds to Unlock Pro. Minimum ₹2,000 balance required in your account.");
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setUnlocking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-20">
        <RefreshCcw className="animate-spin h-8 w-8 text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 space-y-8 animate-fade-in max-w-5xl mx-auto w-full">
      {/* Hero Section */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${feature.gradient} p-8 md:p-12 text-white shadow-2xl transition-all duration-500`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FeatureIcon className="h-6 w-6" />
            </div>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              {isUnlocked ? <CheckCircle2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {isUnlocked ? "Enterprise Pro Active" : "License Required"}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">{feature.title}</h1>
          <p className="text-lg text-white/80 font-medium max-w-xl">{feature.tagline}</p>
        </div>
      </div>

      {!isUnlocked ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-2 border-primary/20 bg-primary/5 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-black flex items-center gap-2">
                <DollarSign className="text-emerald-500" />
                Unlock Enterprise Access
              </CardTitle>
              <CardDescription>Get full access to {feature.title} for 30 days.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-1 text-4xl font-black text-zinc-900">
                ₹2,000
                <span className="text-sm font-medium text-zinc-500">/ per month</span>
              </div>
              <ul className="space-y-2">
                {feature.perks.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-zinc-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {p}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleUnlock}
                disabled={unlocking}
                className="w-full h-12 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 font-bold"
              >
                {unlocking ? "Processing Payment..." : "Pay ₹2,000 & Unlock Now"}
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-zinc-100 bg-zinc-50/50">
            <CardHeader>
              <CardTitle className="text-xl font-black">Why upgrade?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600 leading-relaxed space-y-4">
              <p>{feature.description}</p>
              <div className="p-4 bg-white rounded-xl border border-zinc-100 italic text-zinc-500">
                "NexaBank Pro gave us the transparency we needed for our payroll and wealth tracking. Highly recommended."
                <br />— <span className="font-bold text-zinc-700">Abhishek K.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
          {featureId === "ai-insights" && <FinanceLibraryModule />}
          {featureId === "crypto-trading" && <CryptoTradingModule />}
          {featureId === "wealth-management-pro" && <WealthManagementModule />}
          {featureId === "bulk-payroll-processing" && <PayrollModule />}
        </div>
      )}
    </div>
  )
}

function FinanceLibraryModule() {
  const [downloading, setDownloading] = useState<string | null>(null)
  
  const handleDownload = async (title: string) => {
    setDownloading(title)
    try {
      await axios.post(`${API_BASE_URL}/pro/download_book`, { title }, { withCredentials: true })
      toast.success(`${title} downloaded successfully!`)
    } catch (err) {
      toast.error("Failed to download book.")
    } finally {
      setDownloading(null)
    }
  }

  const books = [
    { title: "Risk & Return: Modern Banking", author: "Dr. Elena Vance", color: "bg-blue-100" },
    { title: "The Sovereign Individual", author: "James Dale Davidson", color: "bg-violet-100" },
    { title: "Liquidity and Financial Stability", author: "Bank of International Settlements", color: "bg-emerald-100" },
    { title: "Decentralized Finance (DeFi) 101", author: "Coinbase Institutional", color: "bg-amber-100" },
  ]
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {books.map((b, i) => (
        <Card key={i} className="group hover:border-blue-300 transition-all cursor-pointer">
          <CardContent className="p-6 flex items-center gap-6">
            <div className={`h-24 w-16 ${b.color} rounded shadow-sm flex items-center justify-center p-2 text-center`}>
              <BookOpen className="h-6 w-6 text-zinc-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg group-hover:text-blue-600 transition-colors">{b.title}</h3>
              <p className="text-sm text-zinc-500 mb-4">{b.author}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full gap-2"
                onClick={() => handleDownload(b.title)}
                disabled={downloading === b.title}
              >
                {downloading === b.title ? "Downloading..." : "Download PDF"} <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CryptoTradingModule() {
  const [amount, setAmount] = useState("")
  const btcPrice = 64205.12
  const [trading, setTrading] = useState(false)

  const handleTrade = async (type: string) => {
    if (!amount) return toast.error("Enter an amount")
    setTrading(true)
    try {
      await axios.post(`${API_BASE_URL}/pro/trade`, { asset: "BTC", amount: parseFloat(amount), price: btcPrice, type }, { withCredentials: true })
      toast.success(`Trade Successful! ${type} ${amount} BTC at ₹${btcPrice.toLocaleString('en-IN')} per BTC.`)
      setAmount("")
    } catch (err: any) {
      const tradeErr = err.response?.data?.error || "Trade failed";
      if (tradeErr.includes("Insufficient")) {
        toast.error("Insufficient funds for this trade. Please deposit more funds.");
      } else {
        toast.error(tradeErr);
      }
    } finally {
      setTrading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>BTC / INR Market</CardTitle>
          <CardDescription>Live Price: ₹5,412,042.45 (+3.4%)</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-end gap-1">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="flex-1 bg-emerald-500/20 rounded-t" style={{ height: `${20 + Math.random() * 80}%` }}></div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Trade Terminal</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-zinc-400">Order Size (BTC)</label>
            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => handleTrade("BUY")} disabled={trading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12">BUY</Button>
            <Button onClick={() => handleTrade("SELL")} disabled={trading} className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-12">SELL</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function WealthManagementModule() {
  const [rebalancing, setRebalancing] = useState(false)
  const data = [
    { name: "Stocks", value: 400, color: "#4f46e5" },
    { name: "Crypto", value: 300, color: "#f59e0b" },
    { name: "Real Estate", value: 300, color: "#10b981" },
    { name: "Cash", value: 200, color: "#6366f1" },
  ]
  
  const handleRebalance = async () => {
    setRebalancing(true)
    try {
      await axios.post(`${API_BASE_URL}/pro/rebalance_wealth`, {}, { withCredentials: true })
      toast.success("Portfolio successfully rebalanced according to target weights.")
    } catch (err) {
      toast.error("Failed to rebalance portfolio.")
    } finally {
      setRebalancing(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card>
        <CardHeader><CardTitle>Asset Allocation</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card><CardContent className="p-6 flex items-center justify-between"><div><p className="text-xs font-bold text-zinc-400 uppercase">Portfolio Balance</p><p className="text-3xl font-black">₹12,450,000</p></div><TrendingUp className="text-emerald-500 h-8 w-8" /></CardContent></Card>
        <Button 
          onClick={handleRebalance}
          disabled={rebalancing}
          className="w-full h-16 bg-zinc-900 text-white hover:bg-zinc-800 text-lg font-bold rounded-2xl gap-2 shadow-xl shadow-zinc-200"
        >
          {rebalancing ? "Analyzing assets..." : "Rebalance Portfolio"} <RefreshCcw className={`h-5 w-5 ${rebalancing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  )
}

function PayrollModule() {
  const [processing, setProcessing] = useState(false)
  const employees = [
    { name: "Rahul S.", role: "Lead Engineer", salary: "120,000" },
    { name: "Priya K.", role: "Product Manager", salary: "105,000" },
    { name: "Amit V.", role: "UI Designer", salary: "90,000" },
  ]
  const handleBulkPay = async () => {
    setProcessing(true)
    try {
      await axios.post(`${API_BASE_URL}/pro/process_payroll`, { totalAmount: 315000, employeesCount: 3 }, { withCredentials: true })
      toast.success("Bulk Payroll Batch Sent to 3 Nodes!")
    } catch (err: any) {
      if (err.response?.data?.error?.includes("Insufficient funds")) {
        toast.error("Insufficient Funds in your account to process payroll batch (Requires ₹315,000).")
      } else {
        toast.error("Failed to process payroll batch.")
      }
    } finally {
      setProcessing(false)
    }
  }
  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-black">Business Payroll Batch #842</CardTitle>
        <CardDescription>Automated secure payout distribution.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {employees.map((e, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gradient-to-br from-zinc-200 to-zinc-300 rounded-full flex items-center justify-center font-bold text-zinc-600">{e.name[0]}</div>
                <div><p className="font-bold text-sm text-zinc-800">{e.name}</p><p className="text-xs text-zinc-500 font-medium">{e.role}</p></div>
              </div>
              <p className="font-bold text-lg">₹{e.salary}</p>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-6">
          <Button onClick={handleBulkPay} disabled={processing} className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl gap-2 shadow-lg shadow-blue-200">
            {processing ? "Signing Transactions..." : `Process Batch (₹315,000)`}
            <ArrowRight className="h-4 w-4" />
          </Button>
      </CardFooter>
    </Card>
  )
}

export default function ProFeaturePage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><RefreshCcw className="animate-spin" /></div>}>
      <ProFeatureContent />
    </Suspense>
  )
}
