import { Stage } from "@/types/stage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { useState } from "react";

interface StageManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: Stage[];
  onAddStage: () => void;
  onEditStage: (stage: Stage) => void;
  onDeleteStage: (stageId: string) => void;
}

export function StageManagement({
  open,
  onOpenChange,
  stages,
  onAddStage,
  onEditStage,
  onDeleteStage,
}: StageManagementProps) {
  const [deleteStageId, setDeleteStageId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteStageId) {
      onDeleteStage(deleteStageId);
      setDeleteStageId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Stages</DialogTitle>
            <DialogDescription>
              Add, edit, or remove stages for your kanban board.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {stages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No stages yet. Create your first stage.
              </div>
            ) : (
              stages.map((stage) => (
                <div
                  key={stage.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className={cn("h-4 w-4 rounded-full flex-shrink-0", stage.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{stage.title}</p>

                  </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEditStage(stage)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteStageId(stage.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                </div>
              ))
            )}
          </div>

          <Button onClick={onAddStage} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Add New Stage
          </Button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteStageId} onOpenChange={(open) => !open && setDeleteStageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this stage? Tasks in this stage will need to be moved to another stage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
