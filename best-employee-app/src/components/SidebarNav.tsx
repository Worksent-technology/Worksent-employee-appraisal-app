"use client";


import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calculator,
  Home,
  LogIn,
  Network,
  ShieldCheck,
  UserCog,
  Users,
  ClipboardList,
} from "lucide-react";
import type { ReactNode } from "react";
import LogoutButton from "./LogoutButton";

function NavItem({
  href,
  icon,
  label,
  active,
  indent = false,
}: {
  href: string;
  icon?: ReactNode;
  label: string;
  active: boolean;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md py-2.5 text-sm font-medium ${
        indent ? "pl-11 pr-3" : "px-3"
      } ${
        active
          ? "bg-accent/10 text-accent"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
      }`}
    >
      {icon && (
        <span className={active ? "text-accent" : "text-neutral-400"}>{icon}</span>
      )}
      {label}
    </Link>
  );
}

export default function SidebarNav({
  roleKey,
  roleName,
  isAdmin,
  name,
}: {
  roleKey: string | null;
  roleName: string | null;
  isAdmin: boolean;
  name: string | null;
}) {
  const pathname = usePathname();

  const adminChildren = [
    { href: "/dashboard/hr", icon: <ClipboardList size={16} />, label: "Evaluations" },
    { href: "/hr/results", icon: <BarChart3 size={16} />, label: "Combined results" },
    { href: "/hr/users", icon: <UserCog size={16} />, label: "Manage logins" },
    { href: "/hr/teams", icon: <Network size={16} />, label: "Teams" },
    { href: "/hr/roles", icon: <ShieldCheck size={16} />, label: "Roles" },
  ];

  return (
    <div className="flex flex-col h-full">
      <nav className="flex-1 px-3 py-4 space-y-1.5">
        <NavItem href="/" icon={<Home size={18} />} label="Process" active={pathname === "/"} />
        <NavItem
          href="/calculator"
          icon={<Calculator size={18} />}
          label="Calculator"
          active={pathname === "/calculator"}
        />
        <NavItem
          href="/employees"
          icon={<Users size={18} />}
          label="Employees"
          active={pathname === "/employees"}
        />

        {isAdmin && (
          <div className="pt-3">
            <div className="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-neutral-800">
              <span className="text-neutral-400">
                <ShieldCheck size={18} />
              </span>
              {roleName ?? "HR"} Dashboard
            </div>
            <div className="ml-[1.15rem] border-l border-black/10 space-y-1.5">
              {adminChildren.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={pathname === item.href}
                  indent
                />
              ))}
            </div>
          </div>
        )}

        {roleKey && !isAdmin && (
          <div className="pt-3">
            <NavItem
              href={`/dashboard/${roleKey}`}
              icon={<ClipboardList size={18} />}
              label={`${roleName ?? roleKey} Dashboard`}
              active={pathname === `/dashboard/${roleKey}`}
            />
          </div>
        )}
      </nav>

      <div className="border-t border-black/10 px-3 py-4">
        {roleKey ? (
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-sm text-neutral-600 truncate">{name}</span>
            <LogoutButton />
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 rounded-md bg-accent px-3 py-2.5 text-sm font-medium text-white hover:bg-accent-dark"
          >
            <LogIn size={18} />
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}