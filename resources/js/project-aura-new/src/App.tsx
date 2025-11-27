import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import UserDashboard from "./pages/UserDashboard";
import Tasks from "./pages/Tasks";
import Team from "./pages/Team";
import NotFound from "./pages/NotFound";
import ProjectKanban from "./pages/ProjectKanban";
import UserProjectStageTasks from "./pages/UserProjectStageTasks";
import { UserProvider, useUser } from "@/hooks/use-user";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, setCurrentUser, teamMembers } = useUser();

  const handleUserChange = (userId: string) => {
    const selectedUser = teamMembers.find(member => member.id === userId);
    if (selectedUser) {
      setCurrentUser(selectedUser);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {currentUser && <AppSidebar />}
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 h-16 border-b border-border/50 flex items-center justify-between px-6 bg-card/80 backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-accent/50 transition-colors" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden md:block">View as:</span>
              <Select onValueChange={handleUserChange} value={currentUser?.id}>
                <SelectTrigger className="w-[200px] bg-background/50 border-border/50 hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span>{member.name}</span>
                        <span className="text-xs text-muted-foreground">({member.role})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <UserProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout><UserDashboard /></AppLayout>} />
            <Route path="/tasks" element={<AppLayout><Tasks /></AppLayout>} />
            <Route path="/project/:projectName" element={<AppLayout><ProjectKanban /></AppLayout>} />
            <Route path="/team" element={<AppLayout><Team /></AppLayout>} />
            <Route path="/user-project/:projectName/stage/:stageId" element={<AppLayout><UserProjectStageTasks /></AppLayout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </UserProvider>
);

export default App;
