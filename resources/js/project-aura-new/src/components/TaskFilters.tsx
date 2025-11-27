import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Stage } from "@/types/stage";
import { User, Task } from "@/types/task";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedProject: string;
  onProjectChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedAssignee?: string;
  onAssigneeChange?: (value: string) => void;
  selectedTag?: string;
  onTagChange?: (value: string) => void;
  availableProjects: string[];
  availableStatuses: Stage[];
  teamMembers?: User[];
  allTasks?: Task[];
}

export function TaskFilters({
  searchQuery,
  onSearchChange,
  selectedProject,
  onProjectChange,
  selectedStatus,
  onStatusChange,
  selectedAssignee = "all",
  onAssigneeChange,
  selectedTag = "all",
  onTagChange,
  availableProjects,
  availableStatuses,
  teamMembers = [],
  allTasks = [],
}: TaskFiltersProps) {
  // Calculate task count for each assignee
  const getTaskCountForAssignee = (assigneeName: string) => {
    return allTasks.filter(task => task.assignee === assigneeName).length;
  };

  // Get all unique tags from tasks
  const availableTags = Array.from(
    new Set(
      allTasks.flatMap(task => task.tags || [])
    )
  ).sort();

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={selectedProject} onValueChange={onProjectChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {availableProjects.map((project) => (
            <SelectItem key={project} value={project}>
              {project}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {availableStatuses.map((status) => (
            <SelectItem key={status.id} value={status.id}>
              {status.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {onAssigneeChange && (
        <Select value={selectedAssignee} onValueChange={onAssigneeChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Assignees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {teamMembers.map((member) => {
              const taskCount = getTaskCountForAssignee(member.name);
              return (
                <SelectItem key={member.id} value={member.name}>
                  {member.name} ({taskCount})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      {onTagChange && availableTags.length > 0 && (
        <Select value={selectedTag} onValueChange={onTagChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {availableTags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
