import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, LayoutDashboard, FileText, PlusCircle, Wrench, Users, Wallet, Cpu } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCurrentUser } from "@/hooks/use-current-user";

const citizenItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Report Issue", url: "/complaints/new", icon: PlusCircle },
  { title: "My Complaints", url: "/complaints", icon: FileText },
];

const staffItems = [
  { title: "Work Orders", url: "/work-orders", icon: Wrench },
  { title: "Contractors", url: "/contractors", icon: Users },
  { title: "Budgets", url: "/budgets", icon: Wallet },
  { title: "OS Scheduler", url: "/os-scheduler", icon: Cpu },
];

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { data: user } = useCurrentUser();
  const items = user?.isStaff ? [...citizenItems, ...staffItems] : citizenItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1 font-bold tracking-tight text-sidebar-foreground">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Activity className="h-4 w-4" />
          </span>
          <span className="group-data-[collapsible=icon]:hidden">UrbanPulse</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = currentPath === item.url || currentPath.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
