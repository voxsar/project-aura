import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Task } from "@/types/task";
import { Stage } from "@/types/stage";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Clock, AlertCircle, History } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReviewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  stages: Stage[];
  onApprove: (taskId: string, targetStageId: string, comment?: string) => void;
  onRequestRevision: (taskId: string, targetStageId: string, comment: string) => void;
}

export function ReviewTaskDialog({
  open,
  onOpenChange,
  task,
  stages,
  onApprove,
  onRequestRevision,
}: ReviewTaskDialogProps) {
  const [action, setAction] = useState<"approve" | "revision" | null>(null);
  const [targetStageId, setTargetStageId] = useState<string>("");
  const [comment, setComment] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const currentStage = stages.find(s => s.id === task?.projectStage);

  useEffect(() => {
    if (action === "approve" && currentStage?.approvedTargetStageId) {
      setTargetStageId(currentStage.approvedTargetStageId);
    } else if (action === "revision" && task?.previousStage) {
      setTargetStageId(task.previousStage);
    } else {
      setTargetStageId("");
    }
  }, [action, currentStage, task]);

  const handleSubmit = () => {
    if (!task || !targetStageId) return;

    if (action === "approve") {
      onApprove(task.id, targetStageId, comment || undefined);
      onOpenChange(false);
      resetDialog();
    } else if (action === "revision" && comment.trim()) {
      onRequestRevision(task.id, targetStageId, comment);
      onOpenChange(false);
      resetDialog();
    }
  };

  const resetDialog = () => {
    setAction(null);
    setTargetStageId("");
    setComment("");
    setShowHistory(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetDialog();
    }
    onOpenChange(open);
  };

  if (!task) return null;

  const priorityColors = {
    low: "bg-priority-low/10 text-priority-low border-priority-low/20",
    medium: "bg-priority-medium/10 text-priority-medium border-priority-medium/20",
    high: "bg-priority-high/10 text-priority-high border-priority-high/20",
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Specific Stage Task</DialogTitle>
          <DialogDescription>
            Review the task details and approve or request revision.
          </DialogDescription>
        </DialogHeader>

        {/* Task Details Section */}
        <div className="space-y-4 py-4">
          <div>
            <h3 className="font-semibold text-lg">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {task.description}
              </p>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Assignee:</span>
                <span className="font-medium">{task.assignee || "Unassigned"}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Due Date:</span>
                <span className="font-medium">
                  {format(new Date(task.dueDate), "MMM dd, yyyy")}
                </span>
              </div>

              {task.startDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Start Date:</span>
                  <span className="font-medium">
                    {format(new Date(task.startDate), "MMM dd, yyyy")}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Priority:</span>
                <Badge
                  variant="outline"
                  className={`text-xs capitalize ${priorityColors[task.priority]}`}
                >
                  {task.priority}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Project:</span>
                <Badge variant="outline" className="text-xs">
                  {task.project}
                </Badge>
              </div>
            </div>
          </div>

          {task.tags && task.tags.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Tags:</span>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {task.revisionComment && (
            <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Current Revision Comment:
                </span>
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {task.revisionComment}
              </p>
            </div>
          )}

          {/* Revision History */}
          {task.revisionHistory && task.revisionHistory.length > 0 && (
            <Collapsible open={showHistory} onOpenChange={setShowHistory}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <History className="h-4 w-4" />
                  {showHistory ? "Hide" : "Show"} Revision History ({task.revisionHistory.length})
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2">
                {[...task.revisionHistory].reverse().map((revision, index) => (
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
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          <Separator />

          {action === null && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Choose an action:</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setAction("approve")}
                  className="flex-1"
                  variant="default"
                >
                  Approve
                </Button>
                <Button
                  onClick={() => setAction("revision")}
                  className="flex-1"
                  variant="outline"
                >
                  Request Revision
                </Button>
              </div>
            </div>
          )}

          {action === "approve" && (
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="approve-stage" className="text-sm font-medium">
                  Move to Stage *
                </Label>
                <Select value={targetStageId} onValueChange={setTargetStageId}>
                  <SelectTrigger id="approve-stage">
                    <SelectValue placeholder="Select target stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages
                      .filter(s => s.id !== task.projectStage)
                      .map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="approve-comment" className="text-sm font-medium">
                  Comment (Optional)
                </Label>
                <Textarea
                  id="approve-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add any notes about this approval..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {action === "revision" && (
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="revision-stage" className="text-sm font-medium">
                  Move to Stage *
                </Label>
                <Select value={targetStageId} onValueChange={setTargetStageId}>
                  <SelectTrigger id="revision-stage">
                    <SelectValue placeholder="Select target stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages
                      .filter(s => s.id !== task.projectStage)
                      .map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="revision-comment" className="text-sm font-medium">
                  Revision Comment *
                </Label>
                <Textarea
                  id="revision-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Explain what needs to be revised..."
                  rows={4}
                  required
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  The task will be sent back to {task.assignee || "the assignee"} with your comments.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {action !== null && (
            <>
              <Button
                variant="outline"
                onClick={() => setAction(null)}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!targetStageId || (action === "revision" && !comment.trim())}
              >
                {action === "approve" ? "Confirm Approval" : "Submit Revision"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
