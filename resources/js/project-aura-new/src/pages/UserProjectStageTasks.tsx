import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { Task, User } from "@/types/task";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Stage } from "@/types/stage";
import { Project } from "@/types/project";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List } from "lucide-react";
import { UserStageDialog } from "@/components/UserStageDialog";
import { StageManagement } from "@/components/StageManagement";
import { useToast } from "@/hooks/use-toast";
import { TaskDialog } from "@/components/TaskDialog";
import { Department } from "@/types/department";
import { TaskListView } from "@/components/TaskListView";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

const getDefaultUserTaskStages = (): Stage[] => [
  { id: "pending", title: "Pending", color: "bg-status-todo", order: 0, type: "user" },
  { id: "complete", title: "Complete", color: "bg-status-done", order: 999, type: "user" },
];

export default function UserProjectStageTasks() {
  const { projectName, stageId } = useParams<{ projectName: string; stageId: string }>();
  const { currentUser } = useUser();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [userStages, setUserStages] = useState<Stage[]>(getDefaultUserTaskStages());
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [isStageManagementOpen, setIsStageManagementOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  useEffect(() => {
    // Load user's custom stages from localStorage
    if (currentUser && projectName && stageId) {
      const savedUserStages = localStorage.getItem(`taskflow_user_stages_${currentUser.id}_${projectName}_${stageId}`);
      if (savedUserStages) {
        try {
          const customStages: Stage[] = JSON.parse(savedUserStages);
          setUserStages(customStages);
        } catch {
          setUserStages(getDefaultUserTaskStages());
        }
      } else {
        setUserStages(getDefaultUserTaskStages());
      }
    }
  }, [currentUser, projectName, stageId]);

  useEffect(() => {
    if (currentUser && projectName && stageId) {
      const savedProjects = localStorage.getItem("taskflow_projects");
      if (savedProjects) {
        try {
          const allProjects: Project[] = JSON.parse(savedProjects);
          const currentProject = allProjects.find(p => p.name === projectName);
          setProject(currentProject || null);
          if (currentProject) {
            const currentStage = currentProject.stages.find(s => s.id === stageId);



            setStage(currentStage || null);
          }
        } catch (error) { /* handle error */ }
      }

      const savedTasks = localStorage.getItem("taskflow_tasks");
      if (savedTasks) {
        try {
          const allStoredTasks: Task[] = JSON.parse(savedTasks);
          setAllTasks(allStoredTasks); // Store all tasks
          const filteredTasks = allStoredTasks.filter(
            (task) =>
              task.assignee === currentUser.name &&
              task.project === projectName &&
              task.projectStage === stageId
          );
          setTasks(filteredTasks);
        } catch {
          setAllTasks([]);
        }
      }

      const savedTeamMembers = localStorage.getItem("taskflow_team_members");
      if (savedTeamMembers) try { setTeamMembers(JSON.parse(savedTeamMembers)); } catch (error) { /* handle error */ }

      const savedDepartments = localStorage.getItem("taskflow_departments");
      if (savedDepartments) try { setDepartments(JSON.parse(savedDepartments)); } catch (error) { /* handle error */ }
    }
  }, [currentUser, projectName, stageId]);

  const updateTasksInStorage = (updatedTask: Task) => {
    const savedTasks = localStorage.getItem("taskflow_tasks");
    let allTasks: Task[] = [];
    if (savedTasks) try { allTasks = JSON.parse(savedTasks); } catch (error) { /* handle error */ }

    const updatedAllTasks = allTasks.map(t =>
      t.id === updatedTask.id ? updatedTask : t
    );
    localStorage.setItem("taskflow_tasks", JSON.stringify(updatedAllTasks));
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    // We'll use storageUpdates for the permanent/backend changes
    const storageUpdates = { ...updates };

    // We'll use localUpdates for what the user sees immediately
    // We want to preserve the "complete" status locally even if it changes to "pending" in storage
    const localUpdates = { ...updates };

    // If task is marked as complete, check for auto-transition
    if (updates.userStatus === "complete" && project && stage) {
      const currentProjectStage = project.stages.find(s => s.id === stage.id);

      if (currentProjectStage) {
        let targetStageId: string | undefined;

        // Check if there is a linked review stage
        if (currentProjectStage.linkedReviewStageId) {
          targetStageId = currentProjectStage.linkedReviewStageId;
        } else {
          // Move to next sequential stage
          const sortedStages = [...project.stages].sort((a, b) => a.order - b.order);
          const currentIndex = sortedStages.findIndex(s => s.id === currentProjectStage.id);
          if (currentIndex !== -1 && currentIndex < sortedStages.length - 1) {
            targetStageId = sortedStages[currentIndex + 1].id;
          }
        }

        if (targetStageId) {
          const task = tasks.find(t => t.id === taskId);
          const currentAssignee = task?.assignee || currentUser?.name || "";
          const targetStage = project.stages.find(s => s.id === targetStageId);

          storageUpdates.projectStage = targetStageId;

          if (targetStage?.isReviewStage) {
            // Moving to Review Stage
            storageUpdates.previousStage = stage.id;
            storageUpdates.originalAssignee = currentAssignee;
            storageUpdates.assignee = currentAssignee; // Keep assignee for context
            // userStatus remains "complete"

            toast({
              title: "Task Submitted",
              description: `Task moved to ${targetStage.title} for review.`,
            });
          } else {
            // Moving to next regular stage - auto-assign to main responsible
            storageUpdates.userStatus = "pending"; // Reset status for storage

            // Auto-assign to main responsible person of target stage
            if (targetStage?.mainResponsibleId) {
              const mainResponsible = teamMembers.find(m => m.id === targetStage.mainResponsibleId);
              if (mainResponsible) {
                storageUpdates.assignee = mainResponsible.name;
              } else {
                storageUpdates.assignee = ""; // Unassign if main responsible not found
              }
            } else {
              storageUpdates.assignee = ""; // Unassign if no main responsible set
            }

            toast({
              title: "Task Moved",
              description: `Task moved to ${targetStage?.title || "next stage"}.`,
            });
          }
        }
      }
    }

    // It's a regular drag-and-drop between user stages
    // Update local state with localUpdates (which preserves userStatus="complete")
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, ...localUpdates } : task
      )
    );

    // If task is completed, remove it from view after 10 seconds
    if (updates.userStatus === "complete") {
      setTimeout(() => {
        setTasks(currentTasks => {
          const task = currentTasks.find(t => t.id === taskId);
          // Only remove if it's still complete (user didn't move it back)
          if (task && task.userStatus === "complete") {
            return currentTasks.filter(t => t.id !== taskId);
          }
          return currentTasks;
        });
      }, 10000);
    }

    // Update global state in localStorage for all cases with the final data (storageUpdates)
    const savedTasks = localStorage.getItem("taskflow_tasks");
    let allTasks: Task[] = [];
    if (savedTasks) try { allTasks = JSON.parse(savedTasks); } catch (error) { /* handle error */ }

    const taskToUpdate = allTasks.find(t => t.id === taskId);
    if (taskToUpdate) {
      const updatedTask = { ...taskToUpdate, ...storageUpdates };
      updateTasksInStorage(updatedTask);
    }
  };

  const handleSaveTask = (taskData: Omit<Task, "id" | "createdAt">) => {
    if (editingTask) {
      const updatedTask = { ...editingTask, ...taskData };
      setTasks((prev) =>
        prev.map((task) =>
          task.id === editingTask.id ? updatedTask : task
        )
      );
      updateTasksInStorage(updatedTask);
      toast({
        title: "Task updated",
        description: "The task has been updated successfully.",
      });
    }
    setIsTaskDialogOpen(false);
    setEditingTask(null);
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));

    const savedTasks = localStorage.getItem("taskflow_tasks");
    let allTasks: Task[] = [];
    if (savedTasks) try { allTasks = JSON.parse(savedTasks); } catch (error) { /* handle error */ }
    const updatedAllTasks = allTasks.filter(t => t.id !== taskId);
    localStorage.setItem("taskflow_tasks", JSON.stringify(updatedAllTasks));

    toast({
      title: "Task deleted",
      description: "The task has been deleted successfully.",
    });
  };

  const handleSaveStage = (newStage: Stage) => {
    if (!currentUser || !projectName || !stageId) return;

    const updatedStages = [...userStages];

    if (editingStage) {
      // Update existing stage
      const index = updatedStages.findIndex(s => s.id === editingStage.id);
      if (index !== -1) {
        updatedStages[index] = { ...newStage, order: updatedStages[index].order };
      }

      setUserStages(updatedStages);
      localStorage.setItem(`taskflow_user_stages_${currentUser.id}_${projectName}_${stageId}`, JSON.stringify(updatedStages));

      toast({
        title: "Stage updated",
        description: `"${newStage.title}" has been updated.`,
      });
      setEditingStage(null);
    } else {
      // Insert new stage before "Complete"
      const completeIndex = updatedStages.findIndex(s => s.id === "complete");

      const newOrder = completeIndex > 0 ? completeIndex : updatedStages.length - 1;
      newStage.order = newOrder;

      updatedStages.splice(completeIndex, 0, newStage);

      // Re-order all stages
      const reorderedStages = updatedStages.map((stage, index) => ({
        ...stage,
        order: index,
      }));

      setUserStages(reorderedStages);
      localStorage.setItem(`taskflow_user_stages_${currentUser.id}_${projectName}_${stageId}`, JSON.stringify(reorderedStages));

      toast({
        title: "Stage created",
        description: `"${newStage.title}" has been added to your workflow.`,
      });
    }
  };

  const handleEditStage = (stage: Stage) => {
    setEditingStage(stage);
    setIsStageDialogOpen(true);
  };

  const handleDeleteStage = (stageIdToDelete: string) => {
    if (!currentUser || !projectName || !stageId) return;

    const stageToDelete = userStages.find(s => s.id === stageIdToDelete);
    if (!stageToDelete) return;

    // Check if stage has tasks
    const stageTasks = tasks.filter(task => task.userStatus === stageIdToDelete);
    if (stageTasks.length > 0) {
      toast({
        title: "Cannot delete stage",
        description: `"${stageToDelete.title}" has ${stageTasks.length} task(s). Move them first.`,
        variant: "destructive",
      });
      return;
    }

    const updatedStages = userStages.filter(s => s.id !== stageIdToDelete);

    // Re-order remaining stages
    const reorderedStages = updatedStages.map((stage, index) => ({
      ...stage,
      order: index,
    }));

    setUserStages(reorderedStages);
    localStorage.setItem(`taskflow_user_stages_${currentUser.id}_${projectName}_${stageId}`, JSON.stringify(reorderedStages));

    toast({
      title: "Stage deleted",
      description: `"${stageToDelete.title}" has been removed.`,
    });
  };

  const handleDialogClose = (open: boolean) => {
    setIsStageDialogOpen(open);
    if (!open) {
      setEditingStage(null);
    }
  };

  const tasksForListView = useMemo(() => {
    return tasks.map(task => ({
      ...task,
      projectStage: task.userStatus,
    }));
  }, [tasks]);

  if (!project || !stage) {
    return <div>Loading or project/stage not found...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {project.name} - {stage.title}
          </h1>
          <p className="text-muted-foreground">
            Tasks assigned to {currentUser?.name} in this stage.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button onClick={() => setIsStageManagementOpen(true)} variant="outline">
            Manage Stages
          </Button>
          <Button onClick={() => { setEditingStage(null); setIsStageDialogOpen(true); }} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Stage
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {view === "kanban" ? (
          <KanbanBoard
            tasks={tasks}
            stages={userStages}
            onTaskUpdate={handleTaskUpdate}
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDelete}
            useProjectStages={false}
            canManageStages={false}
            canManageTasks={false}
            canDragTasks={true}
          />
        ) : (
          <TaskListView
            tasks={tasksForListView}
            stages={userStages}
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDelete}
            onTaskUpdate={handleTaskUpdate}
            teamMembers={teamMembers}
            showAssigneeColumn={false}
            canManage={false}
            canUpdateStage={true}
          />
        )}
      </div>

      <StageManagement
        open={isStageManagementOpen}
        onOpenChange={setIsStageManagementOpen}
        stages={userStages.filter(s => s.id !== 'pending' && s.id !== 'complete')}
        onAddStage={() => {
          setIsStageManagementOpen(false);
          setEditingStage(null);
          setIsStageDialogOpen(true);
        }}
        onEditStage={(stage) => {
          setIsStageManagementOpen(false);
          handleEditStage(stage);
        }}
        onDeleteStage={handleDeleteStage}
      />

      <UserStageDialog
        open={isStageDialogOpen}
        onOpenChange={handleDialogClose}
        onSave={handleSaveStage}
        existingStages={userStages}
        editStage={editingStage}
      />

      <TaskDialog
        open={isTaskDialogOpen}
        onOpenChange={(open) => {
          setIsTaskDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        onSave={handleSaveTask}
        editTask={editingTask}
        availableProjects={[project.name]}
        availableStatuses={userStages}
        useProjectStages={false}
        teamMembers={teamMembers}
        departments={departments}
        allTasks={allTasks}
      />
    </div>
  );
}
