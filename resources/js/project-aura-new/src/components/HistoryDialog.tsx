import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HistoryEntry } from "@/types/history";
import { User } from "@/types/task";
import { format } from "date-fns";

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: HistoryEntry[];
  teamMembers: User[];
}

export const HistoryDialog = ({ open, onOpenChange, history, teamMembers }: HistoryDialogProps) => {
  const getUserInfo = (userId: string) => {
    const user = teamMembers.find(member => member.id === userId);
    return {
      name: user?.name || "Unknown User",
      role: user?.role || "Unknown Role",
    };
  };

  const renderDetails = (entry: HistoryEntry) => {
    const { action, details } = entry;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = details as any;

    switch (action) {
      case 'CREATE_PROJECT':
        return `created project "${d.name}"`;
      case 'CREATE_TASK':
        return `created task "${d.title}"`;
      case 'UPDATE_TASK':
        return `updated task "${d.to?.title || 'Unknown'}"`;
      case 'DELETE_TASK':
        return `deleted task "${d.title}"`;
      case 'UPDATE_TASK_STATUS':
        return `moved task from "${d.from}" to "${d.to}"`;
      case 'UPDATE_TASK_ASSIGNEE':
        return `assigned task to ${getUserInfo(d.to).name}`;
      case 'CREATE_STAGE':
        return `created stage "${d.title}"`;
      case 'UPDATE_STAGE':
        return `updated stage "${d.to?.title || 'Unknown'}"`;
      case 'DELETE_STAGE':
        return `deleted stage "${d.title}"`;
      default:
        return "performed an unknown action";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Project History</DialogTitle>
          <DialogDescription>
            A log of all changes made to this project.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] p-4 border rounded-md">
          <div className="space-y-4">
            {history.slice().reverse().map((entry) => {
              const userInfo = getUserInfo(entry.userId);
              return (
                <div key={entry.id} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-20 text-xs text-muted-foreground">
                    {format(new Date(entry.timestamp), "PPpp")}
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold">{userInfo.name}</span>{' '}
                    <span className="text-xs text-muted-foreground">({userInfo.role})</span>{' '}
                    {renderDetails(entry)}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
