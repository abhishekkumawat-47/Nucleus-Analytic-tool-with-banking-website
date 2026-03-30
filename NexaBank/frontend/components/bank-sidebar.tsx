"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CreditCard,
  Home,
  LogOut,
  Settings,
  User,
  Users,
  Wallet,
  History,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export function BankSidebar() {
  const pathname = usePathname()

  const routes = [
    {
      label: "Dashboard",
      icon: Home,
      href: "/dashboard",
      active: pathname === "/dashboard",
    },
    {
      label: "Transactions",
      icon: CreditCard,
      href: "/transactions",
      active: pathname === "/transactions",
    },
    {
      label: "Payees",
      icon: Users,
      href: "/payees",
      active: pathname === "/payees",
    },
    {
      label: "Transactions",
      icon: History,
      href: "/transactions",
      active: pathname === "/transactions",
    },
    {
      label: "Profile",
      icon: User,
      href: "/profile",
      active: pathname === "/profile",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/settings",
      active: pathname === "/settings",
    },
  ]

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          {/* <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open Menu">
            <Menu className="h-5 w-5" />
          </Button> */}
        </SheetTrigger>

        <SheetContent aria-describedby={undefined} side="left" className="p-0 bg-sidebar">
          <SheetHeader>
            <SheetTitle></SheetTitle>
          </SheetHeader>
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-sidebar-border">
              <div className="flex items-center gap-2">
                <Wallet className="h-6 w-6 text-primary" />
                <span className="font-bold text-xl">NexaBank</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto py-2">
              <nav className="grid gap-1 px-2">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${route.active
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                  >
                    <route.icon className="h-4 w-4" />
                    {route.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="p-4 border-t border-sidebar-border mt-auto">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" className="gap-2" asChild>
                  <Link href="/login">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

    </>
  )
}

