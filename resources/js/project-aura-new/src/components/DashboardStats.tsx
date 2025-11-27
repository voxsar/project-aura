import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, AlertCircle, TrendingUp, CheckCircle2 } from "lucide-react";
import { Task } from "@/types/task";
import { isToday, isPast, isFuture, addDays } from "date-fns";

interface DashboardStatsProps {
  tasks: Task[];
}

export function DashboardStats({ tasks }: DashboardStatsProps) {
  const today = new Date();
  
  const dueToday = tasks.filter(
    (task) => task.userStatus !== "complete" && isToday(new Date(task.dueDate))
  ).length;

  const overdue = tasks.filter(
    (task) =>
      task.userStatus !== "complete" &&
      isPast(new Date(task.dueDate)) &&
      !isToday(new Date(task.dueDate))
  ).length;

  const upcoming = tasks.filter((task) => {
    const dueDate = new Date(task.dueDate);
    const nextWeek = addDays(today, 7);
    return (
      task.userStatus !== "complete" &&
      isFuture(dueDate) &&
      dueDate <= nextWeek
    );
  }).length;

  const completed = tasks.filter((task) => task.userStatus === "complete" && task.projectStage !== null).length;

  const stats = [
    {
      title: "Due Today",
      value: dueToday,
      icon: Clock,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Overdue",
      value: overdue,
      icon: AlertCircle,
      iconColor: "text-status-overdue",
      bgColor: "bg-status-overdue/10",
    },
    {
      title: "Upcoming (7 days)",
      value: upcoming,
      icon: TrendingUp,
      iconColor: "text-status-progress",
      bgColor: "bg-status-progress/10",
    },
    {
      title: "Completed",
      value: completed,
      icon: CheckCircle2,
      iconColor: "text-status-done",
      bgColor: "bg-status-done/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
