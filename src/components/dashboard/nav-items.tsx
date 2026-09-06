import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Megaphone,
  Package,
  Landmark,
  Briefcase,
  Database,
} from "lucide-react";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "overview", label: "Executive Overview", href: "/", icon: LayoutDashboard, enabled: true },
  { key: "sales", label: "Sales & E-commerce", href: "/sales", icon: ShoppingCart, enabled: true },
  { key: "customers", label: "Customers", href: "/customers", icon: Users, enabled: true },
  { key: "marketing", label: "Marketing", href: "/marketing", icon: Megaphone, enabled: true },
  { key: "inventory", label: "Inventory", href: "/inventory", icon: Package, enabled: true },
  { key: "banking", label: "Banking & Financial", href: "/banking", icon: Landmark, enabled: true },
  { key: "hr", label: "HR / Employees", href: "/hr", icon: Briefcase, enabled: true },
  { key: "explorer", label: "Data Explorer", href: "/explorer", icon: Database, enabled: true },
];
