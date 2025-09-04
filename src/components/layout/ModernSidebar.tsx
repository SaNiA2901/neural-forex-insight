import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  TrendingUp,
  BarChart3,
  Activity,
  Brain,
  Settings,
  PieChart,
  Zap,
  Target,
  LineChart,
  Menu,
  X
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const onlineModeItems = [
  {
    title: "Онлайн режим",
    url: "/",
    icon: TrendingUp,
    description: "Работа с поставщиками котировок"
  },
  {
    title: "Графики",
    url: "/online/charts",
    icon: BarChart3,
    description: "Графики валютных пар"
  },
  {
    title: "Аналитика",
    url: "/online/analytics",
    icon: PieChart,
    description: "Аналитические данные"
  },
  {
    title: "Индикаторы",
    url: "/online/indicators",
    icon: Activity,
    description: "Технические индикаторы"
  },
  {
    title: "Паттерны",
    url: "/online/patterns",
    icon: Target,
    description: "Анализ паттернов"
  },
  {
    title: "ИИ Прогнозы",
    url: "/online/predictions",
    icon: Brain,
    description: "Прогнозы нейронных сетей"
  },
  {
    title: "Источники данных",
    url: "/online/sources",
    icon: Zap,
    description: "Настройка поставщиков"
  }
];

const manualModeItems = [
  {
    title: "Ручной режим",
    url: "/manual",
    icon: LineChart,
    description: "Работа с сессиями"
  },
  {
    title: "Графики",
    url: "/manual/charts",
    icon: BarChart3,
    description: "Графики сессий"
  },
  {
    title: "Аналитика",
    url: "/manual/analytics",
    icon: PieChart,
    description: "Анализ сессий"
  },
  {
    title: "Индикаторы",
    url: "/manual/indicators",
    icon: Activity,
    description: "Технические индикаторы"
  },
  {
    title: "Паттерны",
    url: "/manual/patterns",
    icon: Target,
    description: "Анализ паттернов"
  },
  {
    title: "ИИ Прогнозы",
    url: "/manual/predictions",
    icon: Brain,
    description: "Модели прогнозирования"
  }
];

const settingsItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    description: "Настройки"
  }
];

export function ModernSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const isOnlineMode = currentPath.startsWith('/online') || currentPath === '/';
  const isManualMode = currentPath.startsWith('/manual');
  const isOnlineExpanded = onlineModeItems.some((item) => isActive(item.url));
  const isManualExpanded = manualModeItems.some((item) => isActive(item.url));

  const getNavClassName = (path: string) => {
    const active = isActive(path);
    return cn(
      "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
      "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
      active 
        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25" 
        : "text-sidebar-foreground"
    );
  };

  return (
    <Sidebar
      className={cn(
        "transition-all duration-300 ease-in-out border-r border-sidebar-border/50",
        collapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarContent className="bg-sidebar-background/50 backdrop-blur-sm">
        {/* Logo Section */}
        <div className={cn(
          "flex items-center gap-3 p-4 border-b border-sidebar-border/50",
          collapsed && "justify-center"
        )}>
          <div className="p-2 bg-sidebar-primary rounded-lg">
            <TrendingUp className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">OptiTrend</h1>
              <p className="text-xs text-sidebar-foreground/70">Pro Analytics</p>
            </div>
          )}
        </div>

        {/* Online Mode Navigation */}
        <SidebarGroup 
          className="px-3 py-4"
        >
          <SidebarGroupLabel className={cn(
            "text-sidebar-foreground/70 text-xs font-semibold uppercase tracking-wider mb-2",
            collapsed && "hidden"
          )}>
            Онлайн торговля
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {onlineModeItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
                      <item.icon className={cn(
                        "h-5 w-5 flex-shrink-0 transition-colors",
                        isActive(item.url) && "text-sidebar-primary-foreground"
                      )} />
                      {!collapsed && (
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{item.title}</span>
                          <span className="text-xs opacity-70">{item.description}</span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Manual Mode Navigation */}
        <SidebarGroup 
          className="px-3 py-4"
        >
          <SidebarGroupLabel className={cn(
            "text-sidebar-foreground/70 text-xs font-semibold uppercase tracking-wider mb-2",
            collapsed && "hidden"
          )}>
            Ручной режим
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {manualModeItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
                      <item.icon className={cn(
                        "h-5 w-5 flex-shrink-0 transition-colors",
                        isActive(item.url) && "text-sidebar-primary-foreground"
                      )} />
                      {!collapsed && (
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{item.title}</span>
                          <span className="text-xs opacity-70">{item.description}</span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Section */}
        <SidebarGroup className="mt-auto px-3 py-4">
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
                      <item.icon className={cn(
                        "h-5 w-5 flex-shrink-0 transition-colors",
                        isActive(item.url) && "text-sidebar-primary-foreground"
                      )} />
                      {!collapsed && (
                        <span className="font-medium text-sm">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}