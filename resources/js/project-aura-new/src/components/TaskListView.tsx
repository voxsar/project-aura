import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Task, TaskPriority, User } from "@/types/task";
import { Stage } from "@/types/stage";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Edit, Trash2, Eye, Send, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TaskDetailsDialog } from "@/components/TaskDetailsDialog";
import { useState, useMemo } from "react";

interface TaskListViewProps {
  tasks: Task[];
  stages: Stage[];
  teamMembers: User[];
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  showAssigneeColumn?: boolean;
  showProjectColumn?: boolean;
  canManage?: boolean;
  canUpdateStage?: boolean; // Allow stage updates independently
  onTaskReview?: (task: Task) => void;
  showReviewButton?: boolean;
}

const priorities: TaskPriority[] = ["low", "medium", "high"];

type SortDirection = "asc" | "desc" | null;
type SortKey = "title" | "project" | "priority" | "stage" | "dueDate" | "assignee";

interface SortConfig {
  key: SortKey | null;
  direction: SortDirection;
}

export function TaskListView({
  tasks,
  stages,
  teamMembers,
  onTaskEdit,
  onTaskDelete,
  onTaskUpdate,
  showAssigneeColumn = true,
  showProjectColumn = false,
  canManage = true,
  canUpdateStage, // If not provided, defaults to canManage value
  onTaskReview,
  showReviewButton = false,
}: TaskListViewProps) {
  // If canUpdateStage is not explicitly set, use canManage value
  const allowStageUpdate = canUpdateStage !== undefined ? canUpdateStage : canManage;
  const { currentUser } = useUser();
  const canEditDate = currentUser?.role === "admin" || currentUser?.role === "team-lead";
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => {
      if (current.key === key) {
        if (current.direction === "asc") return { key, direction: "desc" };
        if (current.direction === "desc") return { key: null, direction: null };
        return { key, direction: "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortedTasks = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return tasks;

    return [...tasks].sort((a, b) => {
      const direction = sortConfig.direction === "asc" ? 1 : -1;

      switch (sortConfig.key) {
        case "title":
          return direction * a.title.localeCompare(b.title);
        case "project":
          return direction * (a.project || "").localeCompare(b.project || "");
        case "assignee":
          return direction * (a.assignee || "").localeCompare(b.assignee || "");
        case "dueDate":
          return direction * (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        case "priority": {
          const priorityMap = { high: 3, medium: 2, low: 1 };
          const pA = priorityMap[a.priority] || 0;
          const pB = priorityMap[b.priority] || 0;
          return direction * (pA - pB);
        }
        case "stage": {
          const stageA = stages.find(s => s.id === a.projectStage)?.title || "";
          const stageB = stages.find(s => s.id === b.projectStage)?.title || "";
          return direction * stageA.localeCompare(stageB);
        }
        default:
          return 0;
      }
    });
  }, [tasks, sortConfig, stages]);

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    if (sortConfig.direction === "asc") return <ArrowUp className="ml-2 h-4 w-4" />;
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleSort("title")}
            >
              <div className="flex items-center">
                Title
                <SortIcon columnKey="title" />
              </div>
            </TableHead>
            {showProjectColumn && (
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("project")}
              >
                <div className="flex items-center">
                  Project
                  <SortIcon columnKey="project" />
                </div>
              </TableHead>
            )}
            <TableHead
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleSort("priority")}
            >
              <div className="flex items-center">
                Priority
                <SortIcon columnKey="priority" />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleSort("stage")}
            >
              <div className="flex items-center">
                Stage
                <SortIcon columnKey="stage" />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleSort("dueDate")}
            >
              <div className="flex items-center">
                Due Date
                <SortIcon columnKey="dueDate" />
              </div>
            </TableHead>
            {showAssigneeColumn && (
              <TableHead
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort("assignee")}
              >
                <div className="flex items-center">
                  Assignee
                  <SortIcon columnKey="assignee" />
                </div>
              </TableHead>
            )}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map((task) => {
            const dueDate = new Date(task.dueDate);
            const isOverdue =
              isPast(dueDate) && !isToday(dueDate) && task.userStatus !== "complete";
            return (
              <TableRow key={task.id} className="h-12">
                <TableCell className="font-medium py-2">
                  <div className="space-y-1">
                    <div>{task.title}</div>
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map((tag) => (
                          <span
                            key={tag}
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded bg-secondary",
                              tag === "Redo" && "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                            )}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {task.revisionComment && task.tags?.includes("Redo") && (
                      <div className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-1.5 rounded">
                        <span className="font-medium">Revision: </span>
                        {task.revisionComment}
                      </div>
                    )}
                  </div>
                </TableCell>
                {showProjectColumn && (
                  <TableCell className="py-2">
                    <span className="text-sm text-muted-foreground">
                      {task.project}
                    </span>
                  </TableCell>
                )}
                <TableCell className="py-2">
                  <Select
                    value={task.priority}
                    onValueChange={(value) =>
                      onTaskUpdate(task.id, { priority: value as TaskPriority })
                    }
                    disabled={!canManage}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                <TableCell className="py-2">
                  <Select
                    value={task.projectStage || ""}
                    onValueChange={(value) =>
                      onTaskUpdate(task.id, { projectStage: value })
                    }
                    disabled={!allowStageUpdate}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="py-2">
                  {canEditDate ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[180px] h-8 justify-start text-left font-normal",
                            !task.dueDate && "text-muted-foreground",
                            isOverdue && "text-status-overdue",
                            isToday(dueDate) && "text-primary"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {task.dueDate ? (
                            format(dueDate, "MMM dd, yyyy")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={(date) =>
                            onTaskUpdate(task.id, {
                              dueDate: date?.toISOString(),
                            })
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <span
                      className={cn(
                        isOverdue && "text-status-overdue font-medium",
                        isToday(dueDate) && "text-primary font-medium"
                      )}
                    >
                      {format(dueDate, "MMM dd, yyyy")}
                    </span>
                  )}
                </TableCell>
                {showAssigneeColumn && (

                  <TableCell className="py-2">
                    <Select
                      value={task.assignee || "--UNASSIGNED--"}
                      onValueChange={(value) => {
                        const newAssignee =
                          value === "--UNASSIGNED--" ? "" : value;
                        onTaskUpdate(task.id, { assignee: newAssignee });
                      }}
                      disabled={!canManage}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="--UNASSIGNED--">
                          Unassigned
                        </SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.name}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                )}

                <TableCell className="py-2">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setViewTask(task);
                        setIsViewDialogOpen(true);
                      }}
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {showReviewButton && task.isInSpecificStage && onTaskReview && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => onTaskReview(task)}
                        title="Review task"
                      >
                        Review Task
                      </Button>
                    )}



                    {canManage && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onTaskEdit(task)}
                          title="Edit task"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onTaskDelete(task.id)}
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <TaskDetailsDialog
        task={viewTask}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
      />
    </div>
  );
}