import { LayoutDashboard, Users, FolderKanban, Inbox, Plus, Layers, Pencil, Trash2, FileCog } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { ProjectDialog } from "./ProjectDialog";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { Project } from "@/types/project";
import { Stage } from "@/types/stage";
import { User, UserRole, Task } from "@/types/task";
import { useUser } from "@/hooks/use-user";
import { useHistory } from "@/hooks/use-history";
import { Department } from "@/types/department";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const mainMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ["admin", "team-lead", "user"] },
  { title: "Team", url: "/team", icon: Users, roles: ["admin", "team-lead"] },
  { title: "Tasks", url: "/tasks", icon: Inbox, roles: ["admin", "team-lead"] },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useUser();
  const { addHistoryEntry } = useHistory();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignedProjectsOpen, setAssignedProjectsOpen] = useState(true);
  const [departmentProjectsOpen, setDepartmentProjectsOpen] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [userAssignedProjects, setUserAssignedProjects] = useState<Project[]>([]);
  const [userDepartmentProjects, setUserDepartmentProjects] = useState<Project[]>([]);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const userRole = currentUser?.role;

  // Load projects from localStorage on mount
  useEffect(() => {
    const savedProjects = localStorage.getItem("taskflow_projects");
    if (savedProjects) {
      try {
        const projectsData: Project[] = JSON.parse(savedProjects);
        setProjects(projectsData);
      } catch {
        setProjects([]);
      }
    } else {
      setProjects([]);
    }

    // Load team members from localStorage
    if (userRole === "admin" || userRole === "team-lead") {
      const savedTeamMembers = localStorage.getItem("taskflow_team_members");
      if (savedTeamMembers) {
        try {
          setTeamMembers(JSON.parse(savedTeamMembers));
        } catch {
          setTeamMembers([]);
        }
      } else {
        setTeamMembers([]);
      }

      // Load departments from localStorage
      const savedDepartments = localStorage.getItem("taskflow_departments");
      if (savedDepartments) {
        try {
          setDepartments(JSON.parse(savedDepartments));
        } catch {
          setDepartments([]);
        }
      } else {
        setDepartments([]);
      }
    }

    // For users, load projects and stages they're assigned to
    if (userRole === "user" && currentUser) {
      const savedTasks = localStorage.getItem("taskflow_tasks");
      const savedDepartments = localStorage.getItem("taskflow_departments");

      if (savedDepartments) {
        try {
          setDepartments(JSON.parse(savedDepartments));
        } catch {
          setDepartments([]);
        }
      }

      if (savedTasks && savedProjects) {
        try {
          const allTasks: Task[] = JSON.parse(savedTasks);
          const projectsData: Project[] = JSON.parse(savedProjects);

          // Get unique project-stage combinations where user has tasks
          const userProjectStages = new Map<string, Set<string>>();
          allTasks
            .filter(task => task.assignee === currentUser.name)
            .forEach(task => {
              if (task.project && task.projectStage) {
                if (!userProjectStages.has(task.project)) {
                  userProjectStages.set(task.project, new Set());
                }
                userProjectStages.get(task.project)?.add(task.projectStage);
              }
            });

          // Filter projects and include only stages where user has tasks
          const assignedProjects = projectsData
            .filter(project => userProjectStages.has(project.name))
            .map(project => ({
              ...project,
              stages: project.stages.filter(stage =>
                userProjectStages.get(project.name)?.has(stage.id)
              )
            }))
            .filter(project => project.stages.length > 0); // Only show projects with visible stages

          setUserAssignedProjects(assignedProjects);

          // Get all projects from user's department
          // Special permission: Digital Department users can see Design Department projects too
          let departmentsData: Department[] = [];
          if (savedDepartments) {
            try {
              departmentsData = JSON.parse(savedDepartments);
            } catch {
              departmentsData = [];
            }
          }

          const currentDept = departmentsData.find(d => d.id === currentUser.department);
          const isDigitalDept = currentDept?.name.toLowerCase() === "digital";

          const departmentProjects = projectsData.filter(
            project => {
              const isOwnDepartment = project.department?.id === currentUser.department;
              const isDesignProject = isDigitalDept && project.department?.name.toLowerCase() === "design";
              return isOwnDepartment || isDesignProject;
            }
          );
          setUserDepartmentProjects(departmentProjects);
        } catch {
          setUserAssignedProjects([]);
          setUserDepartmentProjects([]);
        }
      }
    }
  }, [userRole, currentUser]);

  const handleProjectSave = (
    name: string,
    description: string,
    stages: Stage[],
    emails: string[],
    phoneNumbers: string[],
    department?: Department
  ) => {
    if (!currentUser) return;
    const savedProjects = localStorage.getItem("taskflow_projects");
    let projectsData: Project[] = [];

    if (savedProjects) {
      try {
        projectsData = JSON.parse(savedProjects);
      } catch {
        projectsData = [];
      }
    }

    const newProject: Project = {
      name,
      description,
      createdAt: new Date().toISOString(),
      stages,
      emails,
      phoneNumbers,
      department,
    };

    projectsData.push(newProject);
    localStorage.setItem("taskflow_projects", JSON.stringify(projectsData));
    setProjects(projectsData);

    addHistoryEntry({
      action: 'CREATE_PROJECT',
      entityId: newProject.name,
      entityType: 'project',
      projectId: newProject.name,
      userId: currentUser.id,
      details: { name: newProject.name },
    });

    toast({
      title: "Project created",
      description: `${name} has been created with ${stages.length} workflow stages.`,
    });
  };

  const handleProjectUpdate = (
    name: string,
    description: string,
    stages: Stage[],
    emails: string[],
    phoneNumbers: string[],
    department?: Department
  ) => {
    if (!currentUser || !projectToEdit) return;

    const savedProjects = localStorage.getItem("taskflow_projects");
    let projectsData: Project[] = [];

    if (savedProjects) {
      try {
        projectsData = JSON.parse(savedProjects);
      } catch {
        projectsData = [];
      }
    }

    const projectIndex = projectsData.findIndex(p => p.name === projectToEdit.name);
    if (projectIndex === -1) return;

    const updatedProject: Project = {
      ...projectsData[projectIndex],
      name,
      description,
      stages,
      emails,
      phoneNumbers,
      department,
    };

    projectsData[projectIndex] = updatedProject;
    localStorage.setItem("taskflow_projects", JSON.stringify(projectsData));
    setProjects(projectsData);

    addHistoryEntry({
      action: 'UPDATE_PROJECT',
      entityId: updatedProject.name,
      entityType: 'project',
      projectId: updatedProject.name,
      userId: currentUser.id,
      details: { name: updatedProject.name },
    });

    toast({
      title: "Project updated",
      description: `${name} has been updated successfully.`,
    });

    setProjectToEdit(null);
  };

  const handleProjectDelete = () => {
    if (!currentUser || !projectToDelete) return;

    const savedProjects = localStorage.getItem("taskflow_projects");
    let projectsData: Project[] = [];

    if (savedProjects) {
      try {
        projectsData = JSON.parse(savedProjects);
      } catch {
        projectsData = [];
      }
    }

    const updatedProjects = projectsData.filter(p => p.name !== projectToDelete.name);
    localStorage.setItem("taskflow_projects", JSON.stringify(updatedProjects));
    setProjects(updatedProjects);

    // Also delete all tasks related to this project
    const savedTasks = localStorage.getItem("taskflow_tasks");
    if (savedTasks) {
      try {
        const tasksData: Task[] = JSON.parse(savedTasks);
        const updatedTasks = tasksData.filter(t => t.project !== projectToDelete.name);
        localStorage.setItem("taskflow_tasks", JSON.stringify(updatedTasks));
      } catch (error) { /* handle error */ }
    }

    addHistoryEntry({
      action: 'DELETE_PROJECT',
      entityId: projectToDelete.name,
      entityType: 'project',
      projectId: projectToDelete.name,
      userId: currentUser.id,
      details: { name: projectToDelete.name },
    });

    toast({
      title: "Project deleted",
      description: `${projectToDelete.name} has been deleted.`,
      variant: "destructive",
    });

    // Navigate to home if currently viewing the deleted project
    if (location.pathname.includes(encodeURIComponent(projectToDelete.name))) {
      navigate('/');
    }

    setProjectToDelete(null);
  };

  const isProjectActive = (projectName: string) => {
    return location.pathname === `/project/${encodeURIComponent(projectName)}`;
  };

  const isStageActive = (projectName: string, stageId: string) => {
    return location.pathname === `/user-project/${encodeURIComponent(projectName)}/stage/${stageId}`;
  };

  const toggleProjectExpanded = (projectName: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectName)) {
        newSet.delete(projectName);
      } else {
        newSet.add(projectName);
      }
      return newSet;
    });
  };

  const toggleDepartmentExpanded = (departmentId: string) => {
    setExpandedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(departmentId)) {
        newSet.delete(departmentId);
      } else {
        newSet.add(departmentId);
      }
      return newSet;
    });
  };

  // Group projects by department (admin) or filter flat list (team-lead)
  const projectsByDepartment = useMemo(() => {
    let filteredProjects = projects;

    // Filter projects by department for team-lead
    if (userRole === "team-lead" && currentUser) {
      const currentDept = departments.find(d => d.id === currentUser.department);
      const isDigitalDept = currentDept?.name.toLowerCase() === "digital";

      filteredProjects = projects.filter(project => {
        // Include projects that have a department matching the team-lead's department
        // OR projects with no department (for backward compatibility)
        const hasMatchingDepartment = project.department?.id === currentUser.department;
        const hasNoDepartment = !project.department;

        // Special permission: Digital Department can see Design Department projects too
        const isDesignProject = project.department?.name.toLowerCase() === "design";
        const hasSpecialPermission = isDigitalDept && isDesignProject;

        return hasMatchingDepartment || hasNoDepartment || hasSpecialPermission;
      });

      // For Digital dept team-lead, group by department (Digital and Design)
      // For other team-leads, return flat structure
      if (isDigitalDept) {
        const grouped = filteredProjects.reduce((acc, project) => {
          // Use the project's actual department for grouping
          const projectDept = project.department;
          const deptId = projectDept?.id || 'uncategorized';
          const deptName = projectDept?.name || 'Uncategorized';

          if (!acc[deptId]) {
            acc[deptId] = {
              id: deptId,
              name: deptName,
              projects: []
            };
          }
          acc[deptId].projects.push(project);
          return acc;
        }, {} as Record<string, { id: string; name: string; projects: Project[] }>);

        return grouped;
      } else {
        // For other team-leads, don't group by department - return flat structure
        return {
          'flat': {
            id: 'flat',
            name: '',
            projects: filteredProjects
          }
        };
      }
    }

    // For admin, group by department
    return filteredProjects.reduce((acc, project) => {
      const deptId = project.department?.id || 'uncategorized';
      const deptName = project.department?.name || 'Uncategorized';

      if (!acc[deptId]) {
        acc[deptId] = {
          id: deptId,
          name: deptName,
          projects: []
        };
      }
      acc[deptId].projects.push(project);
      return acc;
    }, {} as Record<string, { id: string; name: string; projects: Project[] }>);
  }, [projects, userRole, currentUser, departments]);

  const departmentGroups = Object.values(projectsByDepartment).sort((a, b) => {
    if (a.id === 'uncategorized') return 1;
    if (b.id === 'uncategorized') return -1;
    return a.name.localeCompare(b.name);
  });

  const filteredMainMenuItems = mainMenuItems.filter(item =>
    userRole && item.roles.includes(userRole)
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <FolderKanban className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">TaskFlow</h2>
            <p className="text-xs text-muted-foreground">Project Manager</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(userRole === "admin" || userRole === "team-lead") && (
          <SidebarGroup>
            <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
              <div className="flex items-center justify-between px-2">
                <CollapsibleTrigger className="flex flex-1 items-center justify-between py-1.5 text-sm font-medium hover:bg-sidebar-accent rounded-md transition-colors">
                  <SidebarGroupLabel className="hover:bg-transparent">Projects</SidebarGroupLabel>
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${projectsOpen ? "rotate-90" : ""
                      }`}
                  />
                </CollapsibleTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-1"
                  onClick={() => setIsProjectDialogOpen(true)}
                  title="Add new project"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {departmentGroups.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No projects found
                      </div>
                    ) : userRole === "team-lead" && departmentGroups[0]?.id === 'flat' ? (
                      // Non-Digital Team-lead: Show flat list of projects without department grouping
                      departmentGroups[0]?.projects.map((project) => (
                        <SidebarMenuItem
                          key={project.name}
                          onMouseEnter={() => setHoveredProject(project.name)}
                          onMouseLeave={() => setHoveredProject(null)}
                        >
                          <div className="relative group">
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={`/project/${encodeURIComponent(project.name)}`}
                                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent ${isProjectActive(project.name)
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                  : ""
                                  }`}
                              >
                                <FolderKanban className="h-4 w-4" />
                                <span className="text-sm flex-1">{project.name}</span>
                              </NavLink>
                            </SidebarMenuButton>
                            {hoveredProject === project.name && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-sidebar z-10">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 hover:bg-primary hover:text-white transition-all duration-200"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setProjectToEdit(project);
                                    setIsProjectDialogOpen(true);
                                  }}
                                  title="Edit project"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:bg-destructive hover:text-white transition-all duration-200"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setProjectToDelete(project);
                                  }}
                                  title="Delete project"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </SidebarMenuItem>
                      ))
                    ) : (
                      // Admin or Digital Team-lead: Show grouped by department
                      departmentGroups.map((departmentGroup) => (
                        <Collapsible
                          key={departmentGroup.id}
                          open={expandedDepartments.has(departmentGroup.id)}
                          onOpenChange={() => toggleDepartmentExpanded(departmentGroup.id)}
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton className="w-full">
                                <div className="flex items-center gap-2 flex-1">
                                  <FileCog className="h-4 w-4" />
                                  <span className="text-sm font-medium">{departmentGroup.name}</span>
                                  <span className="text-xs text-muted-foreground">({departmentGroup.projects.length})</span>
                                </div>
                                <ChevronRight
                                  className={`h-4 w-4 transition-transform ${expandedDepartments.has(departmentGroup.id) ? "rotate-90" : ""
                                    }`}
                                />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {departmentGroup.projects.map((project) => (
                                  <SidebarMenuSubItem
                                    key={project.name}
                                    onMouseEnter={() => setHoveredProject(project.name)}
                                    onMouseLeave={() => setHoveredProject(null)}
                                  >
                                    <div className="relative group">
                                      <SidebarMenuSubButton asChild>
                                        <NavLink
                                          to={`/project/${encodeURIComponent(project.name)}`}
                                          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent ${isProjectActive(project.name)
                                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                            : ""
                                            }`}
                                        >
                                          <FolderKanban className="h-4 w-4" />
                                          <span className="text-sm flex-1">{project.name}</span>
                                        </NavLink>
                                      </SidebarMenuSubButton>
                                      {hoveredProject === project.name && (userRole === "admin" || userRole === "team-lead") && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-sidebar z-10">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 hover:bg-primary hover:text-white transition-all duration-200"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setProjectToEdit(project);
                                              setIsProjectDialogOpen(true);
                                            }}
                                            title="Edit project"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:bg-destructive hover:text-white transition-all duration-200"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setProjectToDelete(project);
                                            }}
                                            title="Delete project"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {userRole === "user" && userAssignedProjects.length > 0 && (
          <SidebarGroup>
            <Collapsible open={assignedProjectsOpen} onOpenChange={setAssignedProjectsOpen}>
              <div className="flex items-center justify-between px-2">
                <CollapsibleTrigger className="flex flex-1 items-center justify-between py-1.5 text-sm font-medium hover:bg-sidebar-accent rounded-md transition-colors">
                  <SidebarGroupLabel className="hover:bg-transparent">Assigned Projects</SidebarGroupLabel>
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${assignedProjectsOpen ? "rotate-90" : ""
                      }`}
                  />
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {userAssignedProjects.map((project) => (
                      <Collapsible
                        key={project.name}
                        open={expandedProjects.has(project.name)}
                        onOpenChange={() => toggleProjectExpanded(project.name)}
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton className="w-full">
                              <div className="flex items-center gap-2 flex-1">
                                <FolderKanban className="h-4 w-4" />
                                <span className="text-sm">{project.name}</span>
                              </div>
                              <ChevronRight
                                className={`h-4 w-4 transition-transform ${expandedProjects.has(project.name) ? "rotate-90" : ""
                                  }`}
                              />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {project.stages
                                .map((stage) => (
                                  <SidebarMenuSubItem key={stage.id}>
                                    <SidebarMenuSubButton asChild>
                                      <NavLink
                                        to={`/user-project/${encodeURIComponent(project.name)}/stage/${stage.id}`}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent ${isStageActive(project.name, stage.id)
                                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                          : ""
                                          }`}
                                      >
                                        <Layers className="h-3 w-3" />
                                        <span className="text-sm">{stage.title}</span>
                                      </NavLink>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {userRole === "user" && userDepartmentProjects.length > 0 && (
          <SidebarGroup>
            <Collapsible open={departmentProjectsOpen} onOpenChange={setDepartmentProjectsOpen}>
              <div className="flex items-center justify-between px-2">
                <CollapsibleTrigger className="flex flex-1 items-center justify-between py-1.5 text-sm font-medium hover:bg-sidebar-accent rounded-md transition-colors">
                  <SidebarGroupLabel className="hover:bg-transparent">
                    {departments.find(d => d.id === currentUser?.department)?.name || 'Department'} Projects
                  </SidebarGroupLabel>
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${departmentProjectsOpen ? "rotate-90" : ""
                      }`}
                  />
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {userDepartmentProjects.map((project) => (
                      <SidebarMenuItem key={project.name}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={`/project/${encodeURIComponent(project.name)}`}
                            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent ${isProjectActive(project.name)
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : ""
                              }`}
                          >
                            <FolderKanban className="h-4 w-4" />
                            <span className="text-sm">{project.name}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>

      <ProjectDialog
        open={isProjectDialogOpen}
        onOpenChange={(open) => {
          setIsProjectDialogOpen(open);
          if (!open) setProjectToEdit(null);
        }}
        onSave={projectToEdit ? handleProjectUpdate : handleProjectSave}
        existingProjects={projects.map(p => p.name)}
        teamMembers={teamMembers}
        editProject={projectToEdit || undefined}
        departments={departments}
        currentUser={currentUser}
      />

      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone and will also delete all tasks associated with this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleProjectDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
