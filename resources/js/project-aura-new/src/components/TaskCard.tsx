import { Task } from "@/types/task";
import { Stage } from "@/types/stage";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Edit, Trash2, Eye, AlertCircle, History, ClipboardCheck, Send } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

interface TaskCardProps {
  task: Task;
  onDragStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  onReviewTask?: () => void;
  canManage?: boolean;
  currentStage?: Stage;
  canDrag?: boolean;
}

export function TaskCard({ task, onDragStart, onEdit, onDelete, onView, onReviewTask, canManage = true, currentStage, canDrag = true }: TaskCardProps) {
  const dueDate = new Date(task.dueDate);
  const isOverdue = isPast(dueDate) && !isToday(dueDate) && task.userStatus !== "complete";
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  const priorityColors = {
    low: "bg-priority-low/10 text-priority-low border-priority-low/20",
    medium: "bg-priority-medium/10 text-priority-medium border-priority-medium/20",
    high: "bg-priority-high/10 text-priority-high border-priority-high/20",
  };

  return (
    <Card
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
      className={cn(
        "hover:shadow-md transition-all group",
        canDrag && "cursor-move hover:scale-[1.02]",
        !canDrag && "cursor-default"
      )}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm leading-tight flex-1">
            {task.title}
          </h4>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              title="View details"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            {/* Show Review Task button if in review stage */}
            {currentStage?.isReviewStage && onReviewTask && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReviewTask();
                      }}
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Review Task</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}


            {canManage && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  title="Edit task"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  title="Delete task"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {task.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span
            className={cn(
              isOverdue && "text-status-overdue font-medium",
              isToday(dueDate) && "text-primary font-medium"
            )}
          >
            {format(dueDate, "MMM dd, yyyy")}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{task.assignee}</span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {task.project}
          </Badge>
          <Badge
            variant="outline"
            className={cn("text-xs capitalize", priorityColors[task.priority])}
          >
            {task.priority}
          </Badge>
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className={cn(
                  "text-xs",
                  tag === "Redo" && "bg-amber-500/10 text-amber-700 border-amber-500/20"
                )}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {task.revisionComment && task.tags?.includes("Redo") && (
          <div className="mt-2">
            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                  Revision Requested
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 line-clamp-2 mt-0.5">
                  {task.revisionComment}
                </p>
              </div>
              {task.revisionHistory && task.revisionHistory.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHistoryDialog(true);
                  }}
                  title="View revision history"
                >
                  <History className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* Revision History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revision History</DialogTitle>
            <DialogDescription>
              All revision requests for this task
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {task.revisionHistory && task.revisionHistory.length > 0 ? (
              [...task.revisionHistory].reverse().map((revision, index) => (
                <div
                  key={revision.id}
                  className="p-3 bg-muted rounded-lg border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Revision #{task.revisionHistory!.length - index}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(revision.requestedAt), "MMM dd, yyyy 'at' hh:mm a")}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{revision.comment}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Requested by: {revision.requestedBy}</span>
                    {revision.resolvedAt && (
                      <span className="text-green-600">
                        ✓ Resolved {format(new Date(revision.resolvedAt), "MMM dd")}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No revision history available
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
