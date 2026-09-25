export type TickerStat = {
  id: string;
  label: string;
  /** Shown when not using live bookings */
  value: string;
  suffix: string;
  trend: string;
  /** Pulsing dot + accent for suffix */
  color: string;
  /** When true, value comes from shared live counter */
  useLiveBookings: boolean;
};

export const STATS_TICKER: TickerStat[] = [
  {
    id: "hospitals",
    label: "Partner Hospitals",
    value: "247",
    suffix: "+",
    trend: "+12 this month",
    color: "#001B71",
    useLiveBookings: false,
  },
  {
    id: "appointments",
    label: "Appointments Booked",
    value: "48,392",
    suffix: "",
    trend: "↑ 18% vs last month",
    color: "#16A34A",
    useLiveBookings: true,
  },
  {
    id: "reps",
    label: "Active Medical Reps",
    value: "2,847",
    suffix: "",
    trend: "across 40+ cities",
    color: "#7C3AED",
    useLiveBookings: false,
  },
  {
    id: "booking-time",
    label: "Avg. Booking Time",
    value: "47",
    suffix: "sec",
    trend: "↓ from 3.2 min",
    color: "#EA580C",
    useLiveBookings: false,
  },
  {
    id: "confirm",
    label: "Confirmation Rate",
    value: "99.4",
    suffix: "%",
    trend: "real-time sync",
    color: "#16A34A",
    useLiveBookings: false,
  },
  {
    id: "cities",
    label: "Cities Covered",
    value: "43",
    suffix: "",
    trend: "+5 new this quarter",
    color: "#4A90E2",
    useLiveBookings: false,
  },
  {
    id: "rating",
    label: "Platform Rating",
    value: "4.8",
    suffix: "/5",
    trend: "from 1,200+ reviews",
    color: "#F59E0B",
    useLiveBookings: false,
  },
  {
    id: "uptime",
    label: "Uptime",
    value: "99.97",
    suffix: "%",
    trend: "enterprise SLA",
    color: "#16A34A",
    useLiveBookings: false,
  },
];
