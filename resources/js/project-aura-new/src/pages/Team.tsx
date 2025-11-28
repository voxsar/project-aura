import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ChevronDown } from "lucide-react";
import { TeamDialog } from "@/components/TeamDialog";
import { DepartmentDialog } from "@/components/DepartmentDialog";
import { User, Task } from "@/types/task";
import { Department } from "@/types/department";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { userService } from "@/services/userService";
import { departmentService } from "@/services/departmentService";
import { taskService } from "@/services/taskService";

export default function Team() {
	const [teamMembers, setTeamMembers] = useState<User[]>([]);
	const [departments, setDepartments] = useState<Department[]>([]);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
	const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [userToDelete, setUserToDelete] = useState<User | null>(null);
	const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
	const { toast } = useToast();
	const { currentUser } = useUser();

	// Load data from API on mount
	useEffect(() => {
		const loadData = async () => {
			try {
				const [usersData, departmentsData, tasksData] = await Promise.all([
					userService.getAll(),
					departmentService.getAll(),
					taskService.getAll(),
				]);

				setTeamMembers(usersData);
				setDepartments(departmentsData);
				setTasks(tasksData);
				// Expand all departments by default
				setExpandedDepartments(new Set(departmentsData.map((d: Department) => d.id).concat(['uncategorized'])));
			} catch (error) {
				console.error("Error loading data:", error);
				toast({
					title: "Error",
					description: "Failed to load team data. Please try again.",
					variant: "destructive",
				});
			}
		};

		loadData();
	}, []);

	const handleTeamMemberSave = async (userData: Omit<User, "id">) => {
		try {
			if (editingUser) {
				// Update existing user
				const updatedUser = await userService.update(editingUser.id, userData);
				const updatedTeamMembers = teamMembers.map(member =>
					member.id === editingUser.id ? updatedUser : member
				);
				setTeamMembers(updatedTeamMembers);
				toast({
					title: "Team member updated",
					description: `${userData.name} has been updated successfully.`
				});
				setEditingUser(null);
			} else {
				// Add new user
				const newMember = await userService.create(userData);
				const updatedTeamMembers = [...teamMembers, newMember];
				setTeamMembers(updatedTeamMembers);
				toast({
					title: "Team member added",
					description: `${newMember.name} has been added to the team.`
				});
			}
		} catch (error) {
			console.error("Error saving team member:", error);
			toast({
				title: "Error",
				description: "Failed to save team member. Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleEditUser = (user: User) => {
		setEditingUser(user);
		setIsTeamDialogOpen(true);
	};

	const handleDeleteUser = async () => {
		if (!userToDelete) return;

		try {
			await userService.delete(userToDelete.id);
			const updatedTeamMembers = teamMembers.filter(member => member.id !== userToDelete.id);
			setTeamMembers(updatedTeamMembers);

			toast({
				title: "Team member deleted",
				description: `${userToDelete.name} has been removed from the team.`,
				variant: "destructive",
			});

			setUserToDelete(null);
		} catch (error) {
			console.error("Error deleting team member:", error);
			toast({
				title: "Error",
				description: "Failed to delete team member. Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleDepartmentSave = async (name: string) => {
		try {
			const newDepartment = await departmentService.create({ name });
			const updatedDepartments = [...departments, newDepartment];
			setDepartments(updatedDepartments);
			toast({ title: "Department created", description: `${newDepartment.name} has been created.` });
		} catch (error) {
			console.error("Error creating department:", error);
			toast({
				title: "Error",
				description: "Failed to create department. Please try again.",
				variant: "destructive",
			});
		}
	};

	const getInitials = (name: string) => {
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase();
	};

	const getDepartmentName = (departmentId: string) => {
		return departments.find(dep => dep.id === departmentId)?.name || "N/A";
	}

	const toggleDepartmentExpanded = (departmentId: string) => {
		setExpandedDepartments(prev => {
			const newSet = new Set(prev);
			if (newSet.has(departmentId)) {
				newSet.delete(departmentId);
			} else {
				newSet.add(departmentId);
			}
			return newSet;
		});
	};

	// Get task count for a user
	const getUserTaskCount = (userName: string) => {
		return tasks.filter(task => task.assignee === userName).length;
	};

	// Filter team members based on current user's role
	const filteredTeamMembers = useMemo(() => {
		if (!currentUser) return teamMembers;

		// Admin and Team-lead both see all team members
		// Only admin can edit/delete
		return teamMembers;
	}, [teamMembers, currentUser]);

	// Group team members by department
	const teamMembersByDepartment = useMemo(() => {
		const grouped = filteredTeamMembers.reduce((acc, member) => {
			const deptId = member.department || 'uncategorized';
			const deptName = getDepartmentName(deptId.id);
			console.log('Member:', member.name, 'DeptId:', deptId, 'DeptName:', deptName);
			if (!acc[deptId]) {
				acc[deptId] = {
					id: deptId,
					name: deptName,
					members: []
				};
			}
			acc[deptId].members.push(member);
			return acc;
		}, {} as Record<string, { id: string; name: string; members: User[] }>);

		return Object.values(grouped).sort((a, b) => {
			if (a.id === 'uncategorized') return 1;
			if (b.id === 'uncategorized') return -1;
			return a.name.localeCompare(b.name);
		});
	}, [filteredTeamMembers, getDepartmentName]);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Team</h1>
					<p className="text-muted-foreground mt-1">
						{currentUser?.role === "team-lead"
							? `Manage ${getDepartmentName(currentUser.department)} team members`
							: "View team members and their task progress"
						}
					</p>
				</div>
				{(currentUser?.role === "admin" || currentUser?.role === "team-lead") && (
					<Button onClick={() => setIsTeamDialogOpen(true)} className="gap-2">
						<Plus className="h-4 w-4" />
						Add Team Member
					</Button>
				)}
			</div>

			{teamMembersByDepartment.map((departmentGroup) => (
				<Collapsible
					key={departmentGroup.id}
					open={expandedDepartments.has(departmentGroup.id)}
					onOpenChange={() => toggleDepartmentExpanded(departmentGroup.id)}
				>
					<div className="space-y-4">
						<CollapsibleTrigger asChild>
							<div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity group">
								<div className="flex items-center gap-2">
									<h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
										{departmentGroup.name}
									</h2>
									<Badge variant="secondary">{departmentGroup.members.length} members</Badge>
								</div>
								<div className="h-px bg-border flex-1" />
								<ChevronDown
									className={`h-5 w-5 transition-transform ${expandedDepartments.has(departmentGroup.id) ? "rotate-0" : "-rotate-90"
										}`}
								/>
							</div>
						</CollapsibleTrigger>

						<CollapsibleContent>
							<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
								{departmentGroup.members.map((member) => (
									<Card key={member.id} className="hover:shadow-md transition-shadow group relative">
										<CardHeader>
											<div className="flex items-center gap-4">
												<Avatar className="h-12 w-12">
													<AvatarFallback className="bg-primary text-primary-foreground">
														{getInitials(member.name)}
													</AvatarFallback>
												</Avatar>
												<div className="flex-1">
													<CardTitle className="text-base">{member.name}</CardTitle>
													<p className="text-sm text-muted-foreground">
														{member.email}
													</p>
												</div>
												{(currentUser?.role === "admin" ||
													(currentUser?.role === "team-lead" && member.department === currentUser.department)) && (
														<div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
															<Button
																variant="ghost"
																size="icon"
																className="h-8 w-8"
																onClick={() => handleEditUser(member)}
																title="Edit member"
															>
																<Pencil className="h-4 w-4" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																className="h-8 w-8 text-destructive hover:text-destructive"
																onClick={() => setUserToDelete(member)}
																title="Delete member"
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</div>
													)}
											</div>
										</CardHeader>
										<CardContent>
											<div className="flex items-center justify-between">
												<Badge variant="outline">{member.role}</Badge>
												<div className="text-sm text-muted-foreground">
													{getUserTaskCount(member.name)} tasks
												</div>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</CollapsibleContent>
					</div>
				</Collapsible>
			))}

			<TeamDialog
				open={isTeamDialogOpen}
				onOpenChange={(open) => {
					setIsTeamDialogOpen(open);
					if (!open) setEditingUser(null);
				}}
				onSave={handleTeamMemberSave}
				editUser={editingUser}
				departments={departments}
				onAddDepartment={() => setIsDepartmentDialogOpen(true)}
				currentUser={currentUser}
			/>

			<DepartmentDialog
				open={isDepartmentDialogOpen}
				onOpenChange={setIsDepartmentDialogOpen}
				onSave={handleDepartmentSave}
				existingDepartments={departments.map(d => d.name)}
			/>

			<AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Team Member</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{userToDelete?.name}"? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}