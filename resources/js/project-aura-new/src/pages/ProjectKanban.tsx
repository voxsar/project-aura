import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Project } from "@/types/project";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Task, User } from "@/types/task";
import { StageDialog } from "@/components/StageDialog";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List } from "lucide-react";
import { Stage } from "@/types/stage";
import { TaskDialog } from "@/components/TaskDialog";
import { StageManagement } from "@/components/StageManagement";
import { Department } from "@/types/department";
import { HistoryDialog } from "@/components/HistoryDialog";
import { useHistory } from "@/hooks/use-history";
import { useUser } from "@/hooks/use-user";
import { TaskListView } from "@/components/TaskListView";
import { ReviewTaskDialog } from "@/components/ReviewTaskDialog";

import { useToast } from "@/hooks/use-toast";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

export default function ProjectKanban() {
  const { projectName } = useParams<{ projectName: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isStageManagementOpen, setIsStageManagementOpen] = useState(false);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isReviewTaskDialogOpen, setIsReviewTaskDialogOpen] = useState(false);
  const [reviewTask, setReviewTask] = useState<Task | null>(null);

  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { history, addHistoryEntry } = useHistory(projectName);
  const { currentUser } = useUser();
  const { toast } = useToast();
  const [view, setView] = useState<"kanban" | "list">("kanban");

  useEffect(() => {
    const savedProjects = localStorage.getItem("taskflow_projects");
    if (savedProjects) {
      try {
        const projectsData: Project[] = JSON.parse(savedProjects);
        let currentProject = projectsData.find(p => p.name === projectName);

        // Check if team-lead has access to this project
        if (currentUser?.role === "team-lead" && currentProject) {
          const hasMatchingDepartment = currentProject.department?.id === currentUser.department;

          // Special permission: Digital Department can access Design Department projects
          const savedDepartments = localStorage.getItem("taskflow_departments");
          let hasSpecialPermission = false;
          if (savedDepartments) {
            try {
              const departmentsData: Department[] = JSON.parse(savedDepartments);
              const currentDept = departmentsData.find(d => d.id === currentUser.department);
              const isDigitalDept = currentDept?.name.toLowerCase() === "digital";
              const isDesignProject = currentProject.department?.name.toLowerCase() === "design";
              hasSpecialPermission = isDigitalDept && isDesignProject;
            } catch {
              hasSpecialPermission = false;
            }
          }

          if (!hasMatchingDepartment && !hasSpecialPermission) {
            setProject(null);
            return;
          }
        }

        setProject(currentProject || null);
      } catch {
        setProject(null);
      }
    }

    // Load tasks from localStorage
    const savedTasks = localStorage.getItem("taskflow_tasks");
    if (savedTasks) {
      try {
        const allStoredTasks: Task[] = JSON.parse(savedTasks);
        setAllTasks(allStoredTasks); // Store all tasks
        const projectTasks = allStoredTasks.filter(task => task.project === projectName);
        setTasks(projectTasks);
      } catch {
        setTasks([]);
        setAllTasks([]);
      }
    } else {
      setTasks([]);
      setAllTasks([]);
    }

    // Load team members from localStorage
    const savedTeamMembers = localStorage.getItem("taskflow_team_members");
    if (savedTeamMembers) {
      try {
        const allStoredTeamMembers: User[] = JSON.parse(savedTeamMembers);
        setTeamMembers(allStoredTeamMembers);
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
  }, [projectName, currentUser]);

  const updateProjectInStorage = (updatedProject: Project) => {
    const savedProjects = localStorage.getItem("taskflow_projects");
    if (savedProjects) {
      try {
        const projectsData: Project[] = JSON.parse(savedProjects);
        const updatedProjects = projectsData.map(p =>
          p.name === updatedProject.name ? updatedProject : p
        );
        localStorage.setItem("taskflow_projects", JSON.stringify(updatedProjects));
        setProject(updatedProject);
      } catch {
        // handle error
      }
    }
  };

  const updateTasksInStorage = (updatedTasks: Task[]) => {
    const savedTasks = localStorage.getItem("taskflow_tasks");
    let allStoredTasks: Task[] = [];
    if (savedTasks) {
      try {
        allStoredTasks = JSON.parse(savedTasks);
      } catch (error) {
        console.error("Error parsing tasks from localStorage", error);
      }
    }

    // Remove tasks belonging to the current project and add the updated ones
    const otherProjectTasks = allStoredTasks.filter(task => task.project !== projectName);
    const newAllTasks = [...otherProjectTasks, ...updatedTasks];
    localStorage.setItem("taskflow_tasks", JSON.stringify(newAllTasks));
    setTasks(updatedTasks);
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    if (!currentUser || !projectName) return;
    setTasks(prevTasks => {
      const taskToUpdate = prevTasks.find(task => task.id === taskId);
      if (!taskToUpdate) return prevTasks;

      // If stage changes, auto-assign to main responsible and reset user status
      // UNLESS we're explicitly setting the assignee (like in revision workflow)
      if (updates.projectStage && updates.projectStage !== taskToUpdate.projectStage) {
        // Only auto-assign if we're NOT explicitly setting it in the updates
        if (!('assignee' in updates) && project) {
          const targetStage = project.stages.find(s => s.id === updates.projectStage);
          if (targetStage?.mainResponsibleId) {
            const mainResponsible = teamMembers.find(m => m.id === targetStage.mainResponsibleId);
            if (mainResponsible) {
              updates.assignee = mainResponsible.name;
            } else {
              updates.assignee = ""; // Unassign if main responsible not found
            }
          } else {
            updates.assignee = ""; // Unassign if no main responsible set
          }
        }
        if (!('userStatus' in updates)) {
          updates.userStatus = "pending"; // Reset user-level status
        }

        // Check if moving to the last stage (rightmost stage)
        if (project) {
          const sortedStages = [...project.stages].sort((a, b) => a.order - b.order);
          const lastStage = sortedStages[sortedStages.length - 1];

          if (updates.projectStage === lastStage.id) {
            // Add "Completed" tag if not already present
            const currentTags = taskToUpdate.tags || [];
            if (!currentTags.includes("Completed")) {
              updates.tags = [...currentTags, "Completed"];
            }
          } else {
            // Remove "Completed" tag if moving away from last stage
            const currentTags = taskToUpdate.tags || [];
            if (currentTags.includes("Completed")) {
              updates.tags = currentTags.filter(tag => tag !== "Completed");
            }
          }
        }

        addHistoryEntry({
          action: 'UPDATE_TASK_STATUS',
          entityId: taskId,
          entityType: 'task',
          projectId: projectName,
          userId: currentUser.id,
          details: {
            from: taskToUpdate.projectStage,
            to: updates.projectStage,
          },
        });
      }

      if (updates.assignee && updates.assignee !== taskToUpdate.assignee) {
        addHistoryEntry({
          action: 'UPDATE_TASK_ASSIGNEE',
          entityId: taskId,
          entityType: 'task',
          projectId: projectName,
          userId: currentUser.id,
          details: {
            from: taskToUpdate.assignee,
            to: updates.assignee,
          },
        });
      }

      const updated = prevTasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      );
      updateTasksInStorage(updated); // Update localStorage
      return updated;
    });
  };

  const handleSaveTask = (task: Omit<Task, "id" | "createdAt">) => {
    if (!currentUser || !projectName) return;

    let updatedTasks: Task[];
    if (editingTask) {
      updatedTasks = tasks.map(t =>
        t.id === editingTask.id ? { ...t, ...task } : t
      );
      addHistoryEntry({
        action: 'UPDATE_TASK',
        entityId: editingTask.id,
        entityType: 'task',
        projectId: projectName,
        userId: currentUser.id,
        details: {
          from: editingTask,
          to: { ...editingTask, ...task },
        },
      });
    } else {
      const newTask: Task = {
        ...task,
        id: `task-${Date.now()}`, // Generate a unique ID
        createdAt: new Date().toISOString(),
      };
      updatedTasks = [...tasks, newTask];
      addHistoryEntry({
        action: 'CREATE_TASK',
        entityId: newTask.id,
        entityType: 'task',
        projectId: projectName,
        userId: currentUser.id,
        details: {
          title: newTask.title,
        },
      });
    }
    updateTasksInStorage(updatedTasks);
    setIsTaskDialogOpen(false);
    setEditingTask(null);
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleTaskDelete = (taskId: string) => {
    if (!currentUser || !projectName) return;
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (taskToDelete) {
      addHistoryEntry({
        action: 'DELETE_TASK',
        entityId: taskId,
        entityType: 'task',
        projectId: projectName,
        userId: currentUser.id,
        details: { title: taskToDelete.title },
      });
    }
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    updateTasksInStorage(updatedTasks);
  };

  const handleAddStage = () => {
    setEditingStage(null);
    setIsStageDialogOpen(true);
  };

  const handleEditStage = (stage: Stage) => {
    setEditingStage(stage);
    setIsStageDialogOpen(true);
  };

  const handleDeleteStage = (stageId: string) => {
    if (!project || !currentUser) return;
    const stageToDelete = project.stages.find(s => s.id === stageId);



    if (stageToDelete) {
      addHistoryEntry({
        action: 'DELETE_STAGE',
        entityId: stageId,
        entityType: 'stage',
        projectId: project.name,
        userId: currentUser.id,
        details: { title: stageToDelete.title },
      });
    }
    const updatedStages = project.stages.filter(s => s.id !== stageId);
    const updatedProject = { ...project, stages: updatedStages };
    updateProjectInStorage(updatedProject);
  };

  const handleSaveStage = (stage: Omit<Stage, "order">) => {
    if (!project || !currentUser) return;

    let updatedStages: Stage[];
    if (editingStage) {


      updatedStages = project.stages.map(s =>
        s.id === editingStage.id ? { ...s, ...stage } : s
      );
      addHistoryEntry({
        action: 'UPDATE_STAGE',
        entityId: editingStage.id,
        entityType: 'stage',
        projectId: project.name,
        userId: currentUser.id,
        details: { from: editingStage, to: { ...editingStage, ...stage } },
      });
    } else {
      const newStage = { ...stage, order: project.stages.length, id: `stage-${Date.now()}` };
      updatedStages = [...project.stages, newStage];
      addHistoryEntry({
        action: 'CREATE_STAGE',
        entityId: newStage.id,
        entityType: 'stage',
        projectId: project.name,
        userId: currentUser.id,
        details: { title: newStage.title },
      });
    }

    const updatedProject = { ...project, stages: updatedStages };
    updateProjectInStorage(updatedProject);
    setIsStageDialogOpen(false);
    setEditingStage(null);
  };

  const handleApproveTask = (taskId: string, targetStageId: string, comment?: string) => {
    if (!project || !currentUser) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Move task to selected stage
    handleTaskUpdate(taskId, {
      projectStage: targetStageId,
      isInSpecificStage: false,
      previousStage: undefined,
      originalAssignee: undefined,
      revisionComment: undefined,
    });

    // Add history entry if comment provided
    if (comment) {
      addHistoryEntry({
        action: "UPDATE_TASK_STATUS",
        entityId: taskId,
        entityType: "task",
        details: {
          action: "approved",
          comment: comment,
          targetStage: project?.stages.find(s => s.id === targetStageId)?.title || targetStageId,
        },
        projectId: project?.name || "",
        userId: currentUser?.id || "unknown",
      });
    }

    toast({
      title: "Task approved",
      description: `Task moved to ${project?.stages.find(s => s.id === targetStageId)?.title || "selected stage"}.`,
    });

    setIsReviewTaskDialogOpen(false);
    setReviewTask(null);
  };

  const handleRequestRevision = (taskId: string, targetStageId: string, comment: string) => {
    if (!currentUser || !project) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const originalAssignee = task.originalAssignee || task.assignee;

    if (!originalAssignee) {
      toast({
        title: "Error",
        description: "Could not find the task assignee.",
        variant: "destructive",
      });
      return;
    }

    // Add to revision history
    const newRevision = {
      id: Date.now().toString(),
      comment: comment,
      requestedBy: currentUser.name,
      requestedAt: new Date().toISOString(),
    };

    const updatedRevisionHistory = [
      ...(task.revisionHistory || []),
      newRevision,
    ];

    // Add "Redo" tag
    const updatedTags = (task.tags || []);
    if (!updatedTags.includes("Redo")) {
      updatedTags.push("Redo");
    }

    // Move task to selected stage with original assignee
    handleTaskUpdate(taskId, {
      projectStage: targetStageId,
      assignee: originalAssignee,
      userStatus: "pending",
      isInSpecificStage: false,
      revisionComment: comment,
      revisionHistory: updatedRevisionHistory,
      tags: updatedTags,
      previousStage: undefined,
      originalAssignee: undefined,
    });

    toast({
      title: "Revision requested",
      description: `Task sent to ${project?.stages.find(s => s.id === targetStageId)?.title || "selected stage"} for ${originalAssignee} with Redo tag.`,
    });

    setIsReviewTaskDialogOpen(false);
    setReviewTask(null);
  };



  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Fixed header */}
      <div className="flex-shrink-0 border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">{project.description}</p>
          </div>
          <div className="flex gap-2">
            {(currentUser?.role === "admin" || currentUser?.role === "team-lead") && (
              <>
                <Button variant="outline" onClick={() => setIsHistoryDialogOpen(true)}>
                  View History
                </Button>
                <Button variant="outline" onClick={() => setIsStageManagementOpen(true)}>
                  Manage Stages
                </Button>
                <Button
                  onClick={() => {
                    setEditingTask(null);
                    setIsTaskDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(value) => {
              if (value) setView(value as "kanban" | "list");
            }}
          >
            <ToggleGroupItem value="kanban" aria-label="Kanban view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Scrollable content section */}
      <div className="flex-1 overflow-auto p-4">
        {view === "kanban" ? (
          <div className="h-full w-full">
            <KanbanBoard
              tasks={tasks}
              stages={[...project.stages]
                .sort((a, b) => a.order - b.order)}
              onTaskUpdate={handleTaskUpdate}
              onTaskEdit={handleTaskEdit}
              onTaskDelete={handleTaskDelete}
              useProjectStages={true}
              canManageTasks={currentUser?.role !== "user"}
              canDragTasks={currentUser?.role !== "user"}
              onTaskReview={(task) => {
                setReviewTask(task);
                setIsReviewTaskDialogOpen(true);
              }}

            />
          </div>
        ) : (
          <TaskListView
            tasks={tasks}
            stages={[...project.stages]
              .sort((a, b) => a.order - b.order)}
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDelete}
            onTaskUpdate={handleTaskUpdate}
            teamMembers={teamMembers}
            canManage={currentUser?.role !== "user"}
            onTaskReview={(task) => {
              setReviewTask(task);
              setIsReviewTaskDialogOpen(true);
            }}
            showReviewButton={currentUser?.role === "admin" || currentUser?.role === "team-lead"}

          />
        )}
      </div>

      {/* Dialogs */}
      <HistoryDialog
        open={isHistoryDialogOpen}
        onOpenChange={setIsHistoryDialogOpen}
        history={history}
        teamMembers={teamMembers}
      />
      <TaskDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        onSave={handleSaveTask}
        editTask={editingTask}
        availableStatuses={project.stages}
        useProjectStages={true}
        availableProjects={[project.name]}
        teamMembers={teamMembers}
        departments={departments}
        allTasks={allTasks}
      />

      <StageManagement
        open={isStageManagementOpen}
        onOpenChange={setIsStageManagementOpen}
        stages={project.stages}
        onAddStage={handleAddStage}
        onEditStage={handleEditStage}
        onDeleteStage={handleDeleteStage}
      />

      <StageDialog
        open={isStageDialogOpen}
        onOpenChange={setIsStageDialogOpen}
        onSave={handleSaveStage}
        existingStages={project.stages}
        editStage={editingStage}
        teamMembers={teamMembers}
      />

      <ReviewTaskDialog
        open={isReviewTaskDialogOpen}
        onOpenChange={setIsReviewTaskDialogOpen}
        task={reviewTask}
        stages={project.stages}
        onApprove={handleApproveTask}
        onRequestRevision={handleRequestRevision}
      />


    </div>
  );
}