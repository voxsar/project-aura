import { useState, useEffect } from "react";
import { Stage } from "@/types/stage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface UserStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (stage: Stage) => void;
  existingStages: Stage[];
  editStage?: Stage | null; // Optional: stage to edit
}

const colorOptions = [
  { value: "bg-status-todo", label: "Gray", class: "bg-status-todo" },
  { value: "bg-status-progress", label: "Blue", class: "bg-status-progress" },
  { value: "bg-status-done", label: "Green", class: "bg-status-done" },
  { value: "bg-status-overdue", label: "Red", class: "bg-status-overdue" },
  { value: "bg-priority-high", label: "Orange", class: "bg-priority-high" },
  { value: "bg-primary", label: "Purple", class: "bg-primary" },
  { value: "bg-accent", label: "Accent", class: "bg-accent" },
];

export function UserStageDialog({
  open,
  onOpenChange,
  onSave,
  existingStages,
  editStage,
}: UserStageDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: "",
    color: "bg-status-progress",
  });

  useEffect(() => {
    if (open) {
      if (editStage) {
        setFormData({
          title: editStage.title,
          color: editStage.color,
        });
      } else {
        setFormData({
          title: "",
          color: "bg-status-progress",
        });
      }
    }
  }, [open, editStage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.title.trim().length === 0) {
      toast({
        title: "Validation Error",
        description: "Stage title cannot be empty",
        variant: "destructive",
      });
      return;
    }

    const isDuplicate = existingStages.some(
      (stage) =>
        stage.title.toLowerCase() === formData.title.toLowerCase() &&
        stage.id !== editStage?.id
    );

    if (isDuplicate) {
      toast({
        title: "Validation Error",
        description: "A stage with this name already exists",
        variant: "destructive",
      });
      return;
    }

    const stageId = editStage
      ? editStage.id
      : formData.title.toLowerCase().replace(/\s+/g, "-");

    // Calculate order: insert between pending (0) and complete (last)
    const completeStage = existingStages.find(s => s.id === "complete");
    const order = editStage
      ? editStage.order
      : (completeStage ? completeStage.order : existingStages.length);

    onSave({
      id: stageId,
      title: formData.title,
      color: formData.color,
      type: "user",
      order,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editStage ? "Edit Stage" : "Create Custom Stage"}</DialogTitle>
            <DialogDescription>
              {editStage
                ? "Update your custom stage details."
                : "Add a custom stage between \"Pending\" and \"Complete\" to organize your tasks."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Stage Name *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., In Progress, Review, Testing"
                maxLength={30}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="color">Color</Label>
              <Select
                value={formData.color}
                onValueChange={(value) =>
                  setFormData({ ...formData, color: value })
                }
              >
                <SelectTrigger id="color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-3 w-3 rounded-full ${option.class}`}
                        />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editStage ? "Save Changes" : "Create Stage"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
