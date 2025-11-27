import { useState } from "react";
import { Task, UserStatus } from "@/types/task";
import { Stage } from "@/types/stage";
import { TaskCard } from "./TaskCard";
import { TaskDetailsDialog } from "./TaskDetailsDialog";
import { cn } from "@/lib/utils";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface KanbanBoardProps {
  tasks: Task[];
  stages: Stage[]; // Custom stages to display
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  useProjectStages?: boolean; // Whether to use projectStage field instead of userStatus
  onStageEdit?: (stage: Stage) => void; // Optional: for editing stages
  onStageDelete?: (stageId: string) => void; // Optional: for deleting stages
  canManageStages?: boolean; // Whether user can edit/delete stages
  canManageTasks?: boolean; // Whether user can edit/delete tasks
  canDragTasks?: boolean; // Whether user can drag tasks between stages
  onTaskReview?: (task: Task) => void; // Optional: for reviewing tasks

}

export function KanbanBoard({
  tasks,
  stages,
  onTaskUpdate,
  onTaskEdit,
  onTaskDelete,
  useProjectStages = false,
  onStageEdit,
  onStageDelete,
  canManageStages = false,
  canManageTasks = true,
  canDragTasks = true,
  onTaskReview,

}: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(
    null
  );
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const handleDragStart = (task: Task) => {
    if (!canDragTasks) return; // Prevent drag if not allowed
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    if (!canDragTasks) return; // Prevent drop if not allowed
    e.preventDefault();
    setDraggedOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = (columnId: string) => {
    if (!canDragTasks) return; // Prevent drop if not allowed
    if (!draggedTask) return;

    if (useProjectStages) {
      // Update projectStage field
      if (draggedTask.projectStage !== columnId) {
        onTaskUpdate(draggedTask.id, { projectStage: columnId });
      }
    } else {
      // Update userStatus field
      const newUserStatus = columnId as UserStatus;
      if (draggedTask.userStatus !== newUserStatus) {
        onTaskUpdate(draggedTask.id, { userStatus: newUserStatus });
      }
    }

    setDraggedTask(null);
    setDraggedOverColumn(null);
  };

  const getColumnTasks = (stageId: string) => {
    return tasks.filter((task) => {
      if (useProjectStages) {
        return task.projectStage === stageId;
      } else {
        return task.userStatus === stageId;
      }
    });
  };

  // Filter out Specific Stage if it has no tasks
  // Filter out Specific Stage if it has no tasks
  const visibleStages = stages;

  return (
    <div
      className="grid gap-4 h-full"
      style={{
        gridTemplateColumns: `repeat(${visibleStages.length}, minmax(350px, 1fr))`,
      }}
    >
      {visibleStages.map((column) => {
        const columnTasks = getColumnTasks(column.id);
        const isDraggedOver = draggedOverColumn === column.id;

        return (
          <div
            key={column.id}
            className={cn(
              "flex flex-col flex-shrink-0 max-h-full rounded-lg border bg-muted/50",
              draggedOverColumn === column.id && "ring-2 ring-primary/20 bg-muted",
              column.isReviewStage && "border-indigo-200 bg-indigo-50/30 dark:border-indigo-800 dark:bg-indigo-950/10"
            )}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(column.id);
            }}
          >
            <div className={cn(
              "p-3 font-medium text-sm flex items-center justify-between border-b bg-background/50 backdrop-blur-sm rounded-t-lg",
              column.isReviewStage && "bg-indigo-50/50 dark:bg-indigo-950/20"
            )}>
              <div className="flex items-center gap-2">
                <div className={cn("h-2 w-2 rounded-full", column.color)} />
                <span>{column.title}</span>
                <Badge variant="secondary" className="ml-2 text-xs font-normal">
                  {columnTasks.length}
                </Badge>
                {column.isReviewStage && (
                  <Badge variant="outline" className="ml-1 text-[10px] h-5 border-indigo-200 text-indigo-700 bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:bg-indigo-950/30">
                    Review
                  </Badge>
                )}
              </div>
              {/* No edit/delete options for Specific Stage, pending, or complete stages */}
              {canManageStages &&
                column.id !== "pending" &&
                column.id !== "complete" &&
                column.id !== "complete" &&
                onStageEdit &&
                onStageDelete && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onStageEdit(column)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Stage
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStageDelete(column.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Stage
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </div>

            <div className="flex-1 p-4 space-y-3 overflow-y-auto min-h-[400px]">
              {columnTasks.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  No tasks
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDragStart={() => handleDragStart(task)}
                    onEdit={() => onTaskEdit(task)}
                    onDelete={() => onTaskDelete(task.id)}
                    onView={() => {
                      setViewTask(task);
                      setIsViewDialogOpen(true);
                    }}
                    onReviewTask={onTaskReview ? () => onTaskReview(task) : undefined}

                    canManage={canManageTasks}
                    canDrag={canDragTasks}
                    currentStage={column}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}

      <TaskDetailsDialog
        task={viewTask}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
      />
    </div>
  );
}