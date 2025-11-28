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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Department } from "@/types/department";
import { User, UserRole } from "@/types/task";
import { Plus } from "lucide-react";

interface TeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (user: Omit<User, "id">) => void;
  editUser?: User | null;
  departments: Department[];
  onAddDepartment: () => void;
  currentUser?: User | null;
}

export function TeamDialog({
  open,
  onOpenChange,
  onSave,
  editUser,
  departments,
  onAddDepartment,
  currentUser,
}: TeamDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    role: "user" as UserRole,
  });

  useEffect(() => {
    if (editUser) {
      setFormData({
        name: editUser.name,
        email: editUser.email,
        department: editUser.department,
        role: editUser.role,
      });
    } else {
      // For new team member, auto-select department for team-lead
      if (currentUser?.role === "team-lead") {
        setFormData({
          name: "",
          email: "",
          department: currentUser.department,
          role: "user",
        });
      } else {
        setFormData({
          name: "",
          email: "",
          department: "",
          role: "user",
        });
      }
    }
  }, [editUser, open, currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
	console.log('Form Data on Submit:', formData);
    onSave({
      ...formData,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editUser ? "Edit Team Member" : "Add New Team Member"}</DialogTitle>
            <DialogDescription>
              {editUser ? "Edit the details of the team member." : "Add a new member to your team."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.doe@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                  required
                  disabled={currentUser?.role === "team-lead"}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dep) => (
                      <SelectItem key={dep.id} value={dep.id}>
                        {dep.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentUser?.role === "admin" && (
                  <Button type="button" variant="outline" size="icon" onClick={onAddDepartment}>
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {currentUser?.role === "team-lead" && (
                <p className="text-xs text-muted-foreground">
                  Team members will be added to your department
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
                required
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  {currentUser?.role === "admin" && (
                    <>
                      <SelectItem value="team-lead">Team Lead</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {currentUser?.role === "team-lead" && (
                <p className="text-xs text-muted-foreground">
                  Only users can be added by team leads
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editUser ? "Save Changes" : "Add Member"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
