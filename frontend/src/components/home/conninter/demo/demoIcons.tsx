'use client';

import {
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  ChartColumn,
  CircleUserRound,
  Home,
  MessageSquare,
  QrCode,
  Search,
  Settings,
  Shield,
  Store,
  Users,
} from "lucide-react";

export const demoIconMap = {
  home: Home,
  users: Users,
  store: Store,
  calendar: CalendarDays,
  briefcase: Briefcase,
  chat: MessageSquare,
  chart: ChartColumn,
  shield: Shield,
  person: CircleUserRound,
  qr: QrCode,
  search: Search,
  bell: Bell,
  building: Building2,
  settings: Settings,
} as const;

export type DemoIconName = keyof typeof demoIconMap;
