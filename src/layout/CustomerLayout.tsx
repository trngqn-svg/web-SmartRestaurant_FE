import { Outlet, Link, useLocation, useSearchParams } from "react-router-dom";
import { cn } from "../utils/cn";
import { cartCount, useCartStore } from "../store/cart.store";
import { 
  UtensilsCrossed, 
  ShoppingBag, 
  ClipboardList, 
  User, 
} from "lucide-react";

export default function CustomerLayout() {
  const loc = useLocation();
  const [sp] = useSearchParams();
  const table = sp.get("table") || "";
  const token = sp.get("token") || "";

  const lines = useCartStore((s) => s.lines);
  const n = cartCount(lines);

  const q = `?table=${encodeURIComponent(table)}&token=${encodeURIComponent(token)}`;

  const navItems = [
    { path: "/menu", label: "Menu", icon: UtensilsCrossed },
    { path: "/cart", label: "Cart", icon: ShoppingBag, badge: n },
    { path: "/orders", label: "Orders", icon: ClipboardList },
    { path: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans text-slate-900">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden lg:flex w-74 flex-col fixed inset-y-0 left-0 bg-[#0F172A] z-40 shadow-2xl">
        <div className="p-8 flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex flex-col items-center text-center mb-12">
            <div className="h-16 w-16 bg-slate-800/50 border border-slate-700 rounded-2xl flex items-center justify-center mb-2">
              <UtensilsCrossed className="text-[#E2B13C] w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-[#E2B13C] tracking-tight">Smart Restaurant</h1>
          </div>
          
          {/* Nav Links */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const isActive = loc.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link 
                  key={item.path} 
                  to={`${item.path}${item.path === '/profile' ? '' : q}`}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group",
                    isActive 
                      ? "bg-[#E2B13C] text-[#0F172A] shadow-lg shadow-[#E2B13C]/20" 
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-[#0F172A]" : "group-hover:text-[#E2B13C]")} />
                  <span className="flex-1 font-bold text-sm tracking-wide">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-black",
                      isActive ? "bg-[#0F172A] text-white" : "bg-[#E2B13C] text-[#0F172A]"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 lg:ml-80">
        <div className={cn(
          "mx-auto w-full lg:px-4 lg:pt-4",
          "pb-20 lg:pb-12",
        )}>
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Outlet />
          </div>
        </div>
      </main>

      {/* --- MOBILE BOTTOM NAV --- */}
      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-[#0F172A] px-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.2)]">
        <div className="mx-auto flex max-w-md items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = loc.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                to={`${item.path}${item.path === '/profile' ? '' : q}`}
                className={cn(
                  "flex flex-col items-center justify-center transition-all duration-300 relative px-4 py-1",
                  isActive ? "text-[#E2B13C]" : "text-slate-500"
                )}
              >
                <div className="relative">
                  <Icon className={cn("w-5 h-5", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#E2B13C] text-[10px] font-black text-[#0F172A] ring-2 ring-[#0F172A]">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] mt-1.5 font-bold tracking-widest uppercase",
                  isActive ? "opacity-100" : "opacity-50"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-1 w-1 h-1 bg-[#E2B13C] rounded-full shadow-[0_0_8px_#E2B13C]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}