"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ProfileSidebar() {
  const pathname = usePathname();

  const sidebarItems = [
    {
      section: "Orders",
      items: [
        { label: "Orders & Returns", href: "/orders" },
      ],
    },
    {
      section: "Account",
      items: [
        { label: "Profile", href: "/my-profile" },
        { label: "Addresses", href: "/addresses" },
        { label: "Delete Account", href: "/delete-account" },
      ],
    },
    {
      section: "Legal",
      items: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms & Conditions", href: "/terms" },
      ],
    },
  ];

  return (
    <div className="w-full">
      <nav className="space-y-6">
        {sidebarItems.map((section, idx) => (
          <div key={idx}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">
              {section.section}
            </h3>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                        isActive
                          ? "bg-[#CF6144] text-white font-medium"
                          : "text-neutral-700 hover:bg-neutral-100 hover:text-[#CF6144]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

