import { Link } from "react-router";
import {
  ArrowLeft,
  BarChart3,
  Gamepad2,
  Receipt,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { id: "dashboard", label: "Console", icon: BarChart3, href: "/admin" },
  { id: "games", label: "Games", icon: Gamepad2, href: "/admin/games" },
  { id: "transactions", label: "Tx", icon: Receipt, href: "/admin/transactions" },
  { id: "users", label: "Users", icon: Users, href: "/admin/users" },
];

export function AdminMobileNav({ active }: { active: string }) {
  const { logout } = useAuth();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#222] bg-[#0b0d14]/95 backdrop-blur-xl px-2 py-2">
      <div className="grid grid-cols-6 gap-1">
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            className={`flex flex-col items-center justify-center gap-1 rounded px-1 py-2 text-[9px] tracking-wider ${
              active === item.id
                ? "text-[#00f0ff] bg-white/5"
                : "text-[#e1f5fe]/40"
            }`}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={logout}
          className="flex flex-col items-center justify-center gap-1 rounded px-1 py-2 text-[9px] tracking-wider text-[#ff003c]/70"
        >
          <Zap className="h-4 w-4" />
          <span>Out</span>
        </button>
        <Link
          to="/"
          className="flex flex-col items-center justify-center gap-1 rounded px-1 py-2 text-[9px] tracking-wider text-[#e1f5fe]/40"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Site</span>
        </Link>
      </div>
    </nav>
  );
}
