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
import { User } from "@/types/task";


interface StageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (stage: Omit<Stage, "order">) => void;
  editStage?: Stage | null;
  existingStages: Stage[];
  teamMembers: User[];
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

export function StageDialog({
  open,
  onOpenChange,
  onSave,
  editStage,
  existingStages,
  teamMembers,
}: StageDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    color: "bg-status-todo",
    mainResponsibleId: undefined as string | undefined,
    backupResponsibleId1: undefined as string | undefined,
    backupResponsibleId2: undefined as string | undefined,
  });

  useEffect(() => {
    if (editStage) {
      setFormData({
        id: editStage.id,
        title: editStage.title,
        color: editStage.color,
        mainResponsibleId: editStage.mainResponsibleId,
        backupResponsibleId1: editStage.backupResponsibleId1,
        backupResponsibleId2: editStage.backupResponsibleId2,
      });
    } else {
      setFormData({
        id: "",
        title: "",
        color: "bg-status-todo",
        mainResponsibleId: undefined,
        backupResponsibleId1: undefined,
        backupResponsibleId2: undefined,
      });
    }
  }, [editStage, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate title
    if (formData.title.trim().length === 0) {
      toast({
        title: "Validation Error",
        description: "Stage title cannot be empty",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate titles
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
      ? formData.id
      : formData.title.toLowerCase().replace(/\s+/g, "-");

    onSave({
      id: stageId,
      title: formData.title,
      color: formData.color,
      type: "project",
      mainResponsibleId: formData.mainResponsibleId,
      backupResponsibleId1: formData.backupResponsibleId1,
      backupResponsibleId2: formData.backupResponsibleId2,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editStage ? "Edit Stage" : "Create New Stage"}
            </DialogTitle>
            <DialogDescription>
              {editStage
                ? "Update the stage details below."
                : "Add a new stage to your kanban board."}
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
                placeholder="e.g., Review, Testing"
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

            <div className="grid gap-2">
              <Label htmlFor="main-responsible">Main Responsible</Label>
              <Select
                value={formData.mainResponsibleId || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, mainResponsibleId: value || undefined })
                }
              >
                <SelectTrigger id="main-responsible">
                  <SelectValue placeholder="Select main responsible" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="backup1-responsible">Backup Responsible 1</Label>
              <Select
                value={formData.backupResponsibleId1 || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, backupResponsibleId1: value || undefined })
                }
              >
                <SelectTrigger id="backup1-responsible">
                  <SelectValue placeholder="Select backup responsible 1" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="backup2-responsible">Backup Responsible 2</Label>
              <Select
                value={formData.backupResponsibleId2 || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, backupResponsibleId2: value || undefined })
                }
              >
                <SelectTrigger id="backup2-responsible">
                  <SelectValue placeholder="Select backup responsible 2" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
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
