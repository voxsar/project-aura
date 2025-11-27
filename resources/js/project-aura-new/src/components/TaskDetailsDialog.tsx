import { Task } from "@/types/task";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Tag, Paperclip, Clock, X, ExternalLink, Download, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface TaskDetailsDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailsDialog({ task, open, onOpenChange }: TaskDetailsDialogProps) {
  if (!task) return null;

  const priorityColors = {
    low: "bg-priority-low/10 text-priority-low border-priority-low/20",
    medium: "bg-priority-medium/10 text-priority-medium border-priority-medium/20",
    high: "bg-priority-high/10 text-priority-high border-priority-high/20",
  };

  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
    "in-progress": "bg-blue-500/10 text-blue-700 border-blue-500/20",
    complete: "bg-green-500/10 text-green-700 border-green-500/20",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Revision Comment - Show at the top if exists */}
          {task.revisionComment && task.tags?.includes("Redo") && (
            <>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500 dark:border-amber-600 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      Revision Requested
                    </h3>
                    <p className="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">
                      {task.revisionComment}
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Description */}
          {task.description && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Project & Assignee */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Project</h3>
              <Badge variant="outline" className="text-sm">
                {task.project}
              </Badge>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Assigned To
              </h3>
              <p className="text-sm">{task.assignee}</p>
            </div>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Status</h3>
              <Badge
                variant="outline"
                className={cn("text-sm capitalize", statusColors[task.userStatus])}
              >
                {task.userStatus.replace("-", " ")}
              </Badge>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Priority</h3>
              <Badge
                variant="outline"
                className={cn("text-sm capitalize", priorityColors[task.priority])}
              >
                {task.priority}
              </Badge>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Timeline</h3>
            <div className="space-y-2">
              {task.startDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Start:</span>
                  <span>{format(new Date(task.startDate), "MMM dd, yyyy 'at' hh:mm a")}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">End:</span>
                <span>{format(new Date(task.dueDate), "MMM dd, yyyy 'at' hh:mm a")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span>{format(new Date(task.createdAt), "MMM dd, yyyy 'at' hh:mm a")}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary"
                    className={cn(
                      tag === "Redo" && "bg-amber-500/10 text-amber-700 border-amber-500/20"
                    )}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Attachments ({task.attachments.length})
              </h3>
              <div className="space-y-2">
                {task.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {attachment.type === "link" ? (
                        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(attachment.uploadedAt), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        {attachment.type === "link" ? (
                          <>
                            <ExternalLink className="h-4 w-4" />
                            Open
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            Download
                          </>
                        )}
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
