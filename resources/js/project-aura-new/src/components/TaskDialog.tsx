import { useState, useEffect } from "react";
import { Task, UserStatus, TaskPriority, User, TaskAttachment } from "@/types/task";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Department } from "@/types/department";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Link as LinkIcon, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Omit<Task, "id" | "createdAt">) => void;
  editTask?: Task | null;
  availableProjects?: string[];
  availableStatuses: Stage[];
  useProjectStages?: boolean;
  teamMembers: User[];
  departments: Department[];
  allTasks?: Task[];
}

export function TaskDialog({
  open,
  onOpenChange,
  onSave,
  editTask,
  availableProjects,
  availableStatuses,
  useProjectStages = false,
  teamMembers,
  departments,
  allTasks = [],
}: TaskDialogProps) {
  const { toast } = useToast();
  const projects = availableProjects || [];
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project: "",
    assignee: "",
    dueDate: "",
    dueTime: "",
    userStatus: "pending" as UserStatus,
    projectStage: "",
    priority: "medium" as TaskPriority,
    startDate: "",
    startTime: "",
  });
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  const defaultTags = ["Static", "Reel", "Carousel", "Print", "Video", "Animation"];

  // Calculate task count for each assignee
  const getTaskCountForAssignee = (assigneeName: string) => {
    return allTasks.filter(task => task.assignee === assigneeName).length;
  };

  useEffect(() => {
    if (editTask) {
      setFormData({
        title: editTask.title,
        description: editTask.description,
        project: editTask.project,
        assignee: editTask.assignee,
        dueDate: editTask.dueDate.split("T")[0],
        dueTime: editTask.dueDate.split("T")[1]?.substring(0, 5) || "",
        userStatus: editTask.userStatus,
        projectStage: editTask.projectStage || "",
        priority: editTask.priority,
        startDate: editTask.startDate ? editTask.startDate.split("T")[0] : "",
        startTime: editTask.startDate ? editTask.startDate.split("T")[1]?.substring(0, 5) || "" : "",
      });
      setTags(editTask.tags || []);
      setAttachments(editTask.attachments || []);
    } else {
      // Get first non-Specific Stage as default
      const defaultStage = useProjectStages && availableStatuses.length > 0 
        ? (availableStatuses.find(s => s.title !== "Specific Stage") || availableStatuses[0]).id 
        : "";
      
      setFormData({
        title: "",
        description: "",
        project: projects.length === 1 ? projects[0] : "",
        assignee: "",
        dueDate: "",
        dueTime: "",
        userStatus: "pending",
        projectStage: defaultStage,
        priority: "medium",
        startDate: "",
        startTime: "",
      });
      setTags([]);
      setAttachments([]);
      setNewTag("");
      setNewLinkName("");
      setNewLinkUrl("");
    }
  }, [editTask, open, availableStatuses, useProjectStages, projects]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Combine date and time for due date
    const dueDateTime = formData.dueDate && formData.dueTime 
      ? new Date(`${formData.dueDate}T${formData.dueTime}`).toISOString()
      : new Date(formData.dueDate).toISOString();
    
    // Combine date and time for start
    const startDateTime = formData.startDate && formData.startTime 
      ? new Date(`${formData.startDate}T${formData.startTime}`).toISOString()
      : undefined;

    onSave({
      ...formData,
      dueDate: dueDateTime,
      ...(useProjectStages && { projectStage: formData.projectStage }),
      ...(!useProjectStages && { userStatus: formData.userStatus }),
      tags: tags.length > 0 ? tags : undefined,
      startDate: startDateTime,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    onOpenChange(false);
  };

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addLink = () => {
    if (newLinkName && newLinkUrl) {
      const newAttachment: TaskAttachment = {
        id: Date.now().toString(),
        name: newLinkName,
        url: newLinkUrl,
        type: "link",
        uploadedAt: new Date().toISOString(),
      };
      setAttachments([...attachments, newAttachment]);
      setNewLinkName("");
      setNewLinkUrl("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          const newAttachment: TaskAttachment = {
            id: Date.now().toString() + Math.random(),
            name: file.name,
            url: reader.result as string,
            type: "file",
            uploadedAt: new Date().toISOString(),
          };
          setAttachments(prev => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(att => att.id !== id));
  };

  const getDepartmentName = (departmentId: string) => {
    return departments.find(dep => dep.id === departmentId)?.name || "Uncategorized";
  };

  const groupedTeamMembers = teamMembers.reduce((acc, member) => {
    const departmentName = getDepartmentName(member.department);
    if (!acc[departmentName]) {
      acc[departmentName] = [];
    }
    acc[departmentName].push(member);
    return acc;
  }, {} as Record<string, User[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editTask ? "Edit Task" : "Create New Task"}
            </DialogTitle>
            <DialogDescription>
              {editTask
                ? "Make changes to the task details below."
                : "Add a new task to your project. Fill in the details below."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Enter task title"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter task description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="project">Project *</Label>
                <Select
                  value={formData.project}
                  onValueChange={(value) =>
                    setFormData({ ...formData, project: value })
                  }
                  required
                  disabled={projects.length === 1}
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="assignee">Assign To *</Label>
                <Select
                  value={formData.assignee}
                  onValueChange={(value) =>
                    setFormData({ ...formData, assignee: value })
                  }
                  required
                >
                  <SelectTrigger id="assignee">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(groupedTeamMembers).map(([department, members]) => (
                      <SelectGroup key={department}>
                        <SelectLabel>{department}</SelectLabel>
                        {members.map((member) => {
                          const taskCount = getTaskCountForAssignee(member.name);
                          return (
                            <SelectItem key={member.id} value={member.name}>
                              {member.name} ({taskCount})
                            </SelectItem>
                          );
                        })}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={useProjectStages ? formData.projectStage : formData.userStatus}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      ...(useProjectStages ? { projectStage: value } : { userStatus: value as UserStatus }),
                    }))
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatuses
                      .filter((status) => status.title !== "Specific Stage") // Hide Specific Stage from selection
                      .slice()
                      .sort((a, b) => {
                        return a.order - b.order;
                      })
                      .map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: TaskPriority) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dueDate">End Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueTime">End Time</Label>
                <Input
                  id="dueTime"
                  type="time"
                  value={formData.dueTime}
                  onChange={(e) =>
                    setFormData({ ...formData, dueTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {defaultTags.filter(tag => !tags.includes(tag)).map(tag => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-secondary"
                    onClick={() => addTag(tag)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Custom tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(newTag);
                    }
                  }}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  onClick={() => addTag(newTag)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Attachments</Label>
              
              {attachments.length > 0 && (
                <div className="space-y-2 mb-2">
                  {attachments.map(attachment => (
                    <div 
                      key={attachment.id} 
                      className="flex items-center justify-between p-2 border rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        {attachment.type === "link" ? (
                          <LinkIcon className="h-4 w-4" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        <span className="text-sm truncate max-w-[200px]">
                          {attachment.name}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeAttachment(attachment.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Link name..."
                    value={newLinkName}
                    onChange={(e) => setNewLinkName(e.target.value)}
                  />
                  <Input
                    placeholder="URL..."
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    size="icon"
                    onClick={addLink}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
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
              {editTask ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}