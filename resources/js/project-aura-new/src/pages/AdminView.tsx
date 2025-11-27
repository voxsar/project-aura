import { DashboardStats } from "@/components/DashboardStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetailsDialog } from "@/components/TaskDetailsDialog";
import { isPast, isToday, isFuture, addDays } from "date-fns";
import { useEffect, useState } from "react";
import { Task } from "@/types/task";

export default function AdminView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  useEffect(() => {
    const savedTasks = localStorage.getItem("taskflow_tasks");
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch {
        setTasks([]);
      }
    }
  }, []);

  const today = new Date();

  const dueTodayTasks = tasks.filter(
    (task) => task.userStatus !== "complete" && isToday(new Date(task.dueDate))
  );

  const overdueTasks = tasks.filter(
    (task) =>
      task.userStatus !== "complete" &&
      isPast(new Date(task.dueDate)) &&
      !isToday(new Date(task.dueDate))
  );

  const upcomingTasks = tasks.filter((task) => {
    const dueDate = new Date(task.dueDate);
    const nextWeek = addDays(today, 7);
    return (
      task.userStatus !== "complete" &&
      isFuture(dueDate) &&
      dueDate <= nextWeek
    );
  });

  return (
    <div className="space-y-8 fade-in">
      {/* Hero Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-primary via-primary-light to-accent shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight">Admin Dashboard</h1>
              <p className="text-white/90 mt-1 text-lg">
                Complete system overview and analytics
              </p>
            </div>
          </div>
        </div>
      </div>

      <DashboardStats tasks={tasks} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover-lift border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5 overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500"></div>
          <CardHeader className="relative">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50" />
              <span className="font-semibold">Due Today</span>
              <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                {dueTodayTasks.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 relative">
            {dueTodayTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground font-medium">All clear for today!</p>
              </div>
            ) : (
              dueTodayTasks.slice(0, 3).map((task, index) => (
                <div key={task.id} className="slide-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <TaskCard
                    task={task}
                    onDragStart={() => { }}
                    onEdit={() => { }}
                    onDelete={() => { }}
                    onView={() => {
                      setViewTask(task);
                      setIsViewDialogOpen(true);
                    }}
                    canManage={false}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="hover-lift border-2 border-destructive/20 bg-gradient-to-br from-card to-destructive/5 overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/10 rounded-full blur-3xl group-hover:bg-destructive/20 transition-all duration-500"></div>
          <CardHeader className="relative">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-status-overdue animate-pulse shadow-lg shadow-destructive/50" />
              <span className="font-semibold">Overdue</span>
              <span className="ml-auto text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full font-medium">
                {overdueTasks.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 relative">
            {overdueTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 mb-3">
                  <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground font-medium">No overdue tasks</p>
              </div>
            ) : (
              overdueTasks.slice(0, 3).map((task, index) => (
                <div key={task.id} className="slide-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <TaskCard
                    task={task}
                    onDragStart={() => { }}
                    onEdit={() => { }}
                    onDelete={() => { }}
                    onView={() => {
                      setViewTask(task);
                      setIsViewDialogOpen(true);
                    }}
                    canManage={false}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="hover-lift border-2 border-secondary/20 bg-gradient-to-br from-card to-secondary/5 overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl group-hover:bg-secondary/20 transition-all duration-500"></div>
          <CardHeader className="relative">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-status-progress animate-pulse shadow-lg shadow-secondary/50" />
              <span className="font-semibold">Upcoming</span>
              <span className="ml-auto text-xs bg-secondary/10 text-secondary px-2 py-1 rounded-full font-medium">
                {upcomingTasks.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 relative">
            {upcomingTasks.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 mb-3">
                  <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground font-medium">No upcoming tasks</p>
              </div>
            ) : (
              upcomingTasks.slice(0, 3).map((task, index) => (
                <div key={task.id} className="slide-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <TaskCard
                    task={task}
                    onDragStart={() => { }}
                    onEdit={() => { }}
                    onDelete={() => { }}
                    onView={() => {
                      setViewTask(task);
                      setIsViewDialogOpen(true);
                    }}
                    canManage={false}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <TaskDetailsDialog
        task={viewTask}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
      />
    </div>
  );
}
