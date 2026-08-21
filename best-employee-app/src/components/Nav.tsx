import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import SidebarNav from "./SidebarNav";

export default async function Nav() {
  const session = await getSession();

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col bg-white shadow-[4px_0_16px_-4px_rgba(0,0,0,0.08)] z-10">
      <div className="px-4 py-5 border-b border-black/10">
        <Link href="/" className="flex items-center">
          <Image
            src="/worksent-logo.png"
            alt="Worksent"
            width={127}
            height={18}
            priority
            className="h-5 w-auto"
          />
        </Link>
      </div>
      <SidebarNav
        roleKey={session?.roleKey ?? null}
        roleName={session?.roleName ?? null}
        isAdmin={session?.isAdmin ?? false}
        name={session?.name ?? null}
      />
    </aside>
  );
}