import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Project } from "@/types/project";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Task, User } from "@/types/task";
import { StageDialog } from "@/components/StageDialog";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List } from "lucide-react";
import { Stage } from "@/types/stage";
import { TaskDialog } from "@/components/TaskDialog";
import { StageManagement } from "@/components/StageManagement";
import { Department } from "@/types/department";
import { HistoryDialog } from "@/components/HistoryDialog";
import { useHistory } from "@/hooks/use-history";
import { useUser } from "@/hooks/use-user";
import { TaskListView } from "@/components/TaskListView";
import { ReviewTaskDialog } from "@/components/ReviewTaskDialog";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { projectService } from "@/services/projectService";
import { taskService } from "@/services/taskService";
import { userService } from "@/services/userService";
import { departmentService } from "@/services/departmentService";

export default function ProjectKanban() {
	const { projectId } = useParams<{ projectId: string }>();
	const numericProjectId = projectId ? parseInt(projectId, 10) : undefined;
	const [project, setProject] = useState<Project | null>(null);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [allTasks, setAllTasks] = useState<Task[]>([]);
	const [teamMembers, setTeamMembers] = useState<User[]>([]);
	const [departments, setDepartments] = useState<Department[]>([]);
	const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
	const [isStageManagementOpen, setIsStageManagementOpen] = useState(false);
	const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
	const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
	const [isReviewTaskDialogOpen, setIsReviewTaskDialogOpen] = useState(false);
	const [reviewTask, setReviewTask] = useState<Task | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [editingStage, setEditingStage] = useState<Stage | null>(null);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const { history, addHistoryEntry } = useHistory(numericProjectId ? String(numericProjectId) : undefined);
	const { currentUser } = useUser();
	const { toast } = useToast();
	const [view, setView] = useState<"kanban" | "list">("kanban");

	useEffect(() => {
		const loadData = async () => {
			if (!numericProjectId) return;
			setIsLoading(true);
			try {
				const currentProject = await projectService.getById(String(numericProjectId));
				if (!currentProject) {
					setProject(null);
					setIsLoading(false);
					return;
				}
				const departmentsData = await departmentService.getAll();
				if (currentUser?.role === 'team-lead') {
					const hasMatchingDepartment = currentProject.department?.id === currentUser.department;
					const currentDept = departmentsData.find(d => d.id === currentUser.department);
					const isDigitalDept = currentDept?.name.toLowerCase() === 'digital';
					const isDesignProject = currentProject.department?.name.toLowerCase() === 'design';
					const hasSpecialPermission = isDigitalDept && isDesignProject;
					if (!hasMatchingDepartment && !hasSpecialPermission) {
						setProject(null);
						setIsLoading(false);
						return;
					}
				}
				setProject(currentProject);
				const tasksData = await taskService.getAll({ projectId: String(currentProject.id) });
				setTasks(tasksData.filter(t => t.projectId === currentProject.id));
				const allTasksData = await taskService.getAll();
				setAllTasks(allTasksData);
				const usersData = await userService.getAll();
				setTeamMembers(usersData);
				setDepartments(departmentsData);
			} catch (error) {
				console.error('Error loading project data:', error);
				toast({
					title: 'Error',
					description: 'Failed to load project data. Please try again.',
					variant: 'destructive',
				});
			} finally {
				setIsLoading(false);
			}
		};
		loadData();
	}, [numericProjectId, currentUser]);

	const updateProjectInStorage = async (updatedProject: Project) => {
		try {
			if (!updatedProject.id) return;
			await projectService.update(String(updatedProject.id), updatedProject);
			setProject(updatedProject);
			toast({
				title: "Project updated",
				description: "Project has been updated successfully.",
			});
		} catch (error) {
			console.error("Error updating project:", error);
			toast({
				title: "Error",
				description: "Failed to update project. Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
		if (!currentUser || !project) return;
		const taskToUpdate = tasks.find(task => task.id === taskId);
		if (!taskToUpdate) return;
		try {
			if (updates.projectStage && updates.projectStage !== taskToUpdate.projectStage) {
				if (!('assignee' in updates)) {
					const targetStage = project.stages.find(s => s.id === updates.projectStage);
					if (targetStage?.mainResponsibleId) {
						const mainResponsible = teamMembers.find(m => m.id === targetStage.mainResponsibleId);
						updates.assignee = mainResponsible ? mainResponsible.name : "";
					} else {
						updates.assignee = "";
					}
				}
				if (!('userStatus' in updates)) updates.userStatus = "pending";
				const sortedStages = [...project.stages].sort((a, b) => a.order - b.order);
				const lastStage = sortedStages[sortedStages.length - 1];
				if (updates.projectStage === lastStage.id) {
					const currentTags = taskToUpdate.tags || [];
					if (!currentTags.includes("Completed")) updates.tags = [...currentTags, "Completed"];
				} else {
					const currentTags = taskToUpdate.tags || [];
					if (currentTags.includes("Completed")) updates.tags = currentTags.filter(tag => tag !== "Completed");
				}
				addHistoryEntry({
					action: 'UPDATE_TASK_STATUS',
					entityId: taskId,
					entityType: 'task',
					projectId: String(project.id),
					userId: currentUser.id,
					details: { from: taskToUpdate.projectStage, to: updates.projectStage },
				});
			}
			if (updates.assignee && updates.assignee !== taskToUpdate.assignee) {
				addHistoryEntry({
					action: 'UPDATE_TASK_ASSIGNEE',
					entityId: taskId,
					entityType: 'task',
					projectId: String(project.id),
					userId: currentUser.id,
					details: { from: taskToUpdate.assignee, to: updates.assignee },
				});
			}
			await taskService.update(taskId, updates);
			setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
		} catch (error) {
			console.error("Error updating task:", error);
			toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
		}
	};

	const handleSaveTask = async (task: Omit<Task, "id" | "createdAt">) => {
		if (!currentUser || !project) return;
		try {
			if (editingTask) {
				await taskService.update(editingTask.id, task);
				setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...task } : t));
				addHistoryEntry({
					action: 'UPDATE_TASK', entityId: editingTask.id, entityType: 'task', projectId: String(project.id), userId: currentUser.id,
					details: { from: editingTask, to: { ...editingTask, ...task } },
				});
				toast({ title: "Task updated", description: "Task updated successfully." });
			} else {
				const newTask = await taskService.create({ ...task, projectId: project.id });
				setTasks([...tasks, newTask]);
				addHistoryEntry({
					action: 'CREATE_TASK', entityId: newTask.id, entityType: 'task', projectId: String(project.id), userId: currentUser.id,
					details: { title: newTask.title },
				});
				toast({ title: "Task created", description: "Task created successfully." });
			}
			setIsTaskDialogOpen(false);
			setEditingTask(null);
		} catch (error) {
			console.error("Error saving task:", error);
			toast({ title: "Error", description: "Failed to save task.", variant: "destructive" });
		}
	};

	const handleTaskEdit = (task: Task) => {
		setEditingTask(task);
		setIsTaskDialogOpen(true);
	};

	const handleTaskDelete = async (taskId: string) => {
		if (!currentUser || !project) return;
		try {
			const taskToDelete = tasks.find(t => t.id === taskId);
			if (taskToDelete) {
				addHistoryEntry({ action: 'DELETE_TASK', entityId: taskId, entityType: 'task', projectId: String(project.id), userId: currentUser.id, details: { title: taskToDelete.title } });
			}
			await taskService.delete(taskId);
			setTasks(tasks.filter(t => t.id !== taskId));
			toast({ title: "Task deleted", description: "Task deleted successfully." });
		} catch (error) {
			console.error("Error deleting task:", error);
			toast({ title: "Error", description: "Failed to delete task.", variant: "destructive" });
		}
	};

	const handleAddStage = () => { setEditingStage(null); setIsStageDialogOpen(true); };
	const handleEditStage = (stage: Stage) => { setEditingStage(stage); setIsStageDialogOpen(true); };
	const handleDeleteStage = (stageId: string) => {
		if (!project || !currentUser) return;
		const stageToDelete = project.stages.find(s => s.id === stageId);
		if (stageToDelete) {
			addHistoryEntry({ action: 'DELETE_STAGE', entityId: stageId, entityType: 'stage', projectId: String(project.id), userId: currentUser.id, details: { title: stageToDelete.title } });
		}
		const updatedStages = project.stages.filter(s => s.id !== stageId);
		updateProjectInStorage({ ...project, stages: updatedStages });
	};

	const handleSaveStage = (stage: Omit<Stage, "order">) => {
		if (!project || !currentUser) return;
		let updatedStages: Stage[];
		if (editingStage) {
			updatedStages = project.stages.map(s => s.id === editingStage.id ? { ...s, ...stage } : s);
			addHistoryEntry({ action: 'UPDATE_STAGE', entityId: editingStage.id, entityType: 'stage', projectId: String(project.id), userId: currentUser.id, details: { from: editingStage, to: { ...editingStage, ...stage } } });
		} else {
			const newStage: Stage = { ...stage, order: project.stages.length, id: `stage-${Date.now()}` };
			updatedStages = [...project.stages, newStage];
			addHistoryEntry({ action: 'CREATE_STAGE', entityId: newStage.id, entityType: 'stage', projectId: String(project.id), userId: currentUser.id, details: { title: newStage.title } });
		}
		updateProjectInStorage({ ...project, stages: updatedStages });
		setIsStageDialogOpen(false);
		setEditingStage(null);
	};

	const handleApproveTask = (taskId: string, targetStageId: string, comment?: string) => {
		if (!project || !currentUser) return;
		const task = tasks.find(t => t.id === taskId);
		if (!task) return;
		handleTaskUpdate(taskId, { projectStage: targetStageId, isInSpecificStage: false, previousStage: undefined, originalAssignee: undefined, revisionComment: undefined });
		if (comment) {
			addHistoryEntry({ action: 'UPDATE_TASK_STATUS', entityId: taskId, entityType: 'task', projectId: String(project.id), userId: currentUser.id, details: { action: 'approved', comment, targetStage: project.stages.find(s => s.id === targetStageId)?.title || targetStageId } });
		}
		toast({ title: 'Task approved', description: `Task moved to ${project.stages.find(s => s.id === targetStageId)?.title || 'selected stage'}.` });
		setIsReviewTaskDialogOpen(false);
		setReviewTask(null);
	};

	const handleRequestRevision = (taskId: string, targetStageId: string, comment: string) => {
		if (!project || !currentUser) return;
		const task = tasks.find(t => t.id === taskId);
		if (!task) return;
		const originalAssignee = task.originalAssignee || task.assignee;
		if (!originalAssignee) { toast({ title: 'Error', description: 'Could not find the task assignee.', variant: 'destructive' }); return; }
		const newRevision = { id: Date.now().toString(), comment, requestedBy: currentUser.name, requestedAt: new Date().toISOString() };
		const updatedRevisionHistory = [...(task.revisionHistory || []), newRevision];
		const updatedTags = task.tags ? [...task.tags] : [];
		if (!updatedTags.includes('Redo')) updatedTags.push('Redo');
		handleTaskUpdate(taskId, { projectStage: targetStageId, assignee: originalAssignee, userStatus: 'pending', isInSpecificStage: false, revisionComment: comment, revisionHistory: updatedRevisionHistory, tags: updatedTags, previousStage: undefined, originalAssignee: undefined });
		toast({ title: 'Revision requested', description: `Task sent to ${project.stages.find(s => s.id === targetStageId)?.title || 'selected stage'} for ${originalAssignee} with Redo tag.` });
		setIsReviewTaskDialogOpen(false);
		setReviewTask(null);
	};

	if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
	if (!project) return <div className="flex items-center justify-center h-screen">Project not found</div>;

	return (
		<div className="flex flex-col h-screen overflow-hidden">
			<div className="flex-shrink-0 border-b p-4 space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">{project.name}</h1>
						<p className="text-muted-foreground">{project.description}</p>
					</div>
					<div className="flex gap-2">
						{(currentUser?.role === 'admin' || currentUser?.role === 'team-lead') && (
							<>
								<Button variant="outline" onClick={() => setIsHistoryDialogOpen(true)}>View History</Button>
								<Button variant="outline" onClick={() => setIsStageManagementOpen(true)}>Manage Stages</Button>
								<Button onClick={() => { setEditingTask(null); setIsTaskDialogOpen(true); }}>
									<Plus className="mr-2 h-4 w-4" /> Add Task
								</Button>
							</>
						)}
					</div>
				</div>
				<div className="flex items-center justify-between">
					<ToggleGroup type="single" value={view} onValueChange={v => v && setView(v as 'kanban' | 'list')}>
						<ToggleGroupItem value="kanban" aria-label="Kanban view"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
						<ToggleGroupItem value="list" aria-label="List view"><List className="h-4 w-4" /></ToggleGroupItem>
					</ToggleGroup>
				</div>
			</div>
			<div className="flex-1 overflow-auto p-4">
				{view === 'kanban' ? (
					<KanbanBoard
						tasks={tasks}
						stages={[...project.stages].sort((a, b) => a.order - b.order)}
						onTaskUpdate={handleTaskUpdate}
						onTaskEdit={handleTaskEdit}
						onTaskDelete={handleTaskDelete}
						useProjectStages
						canManageTasks={currentUser?.role !== 'user'}
						canDragTasks={currentUser?.role !== 'user'}
						onTaskReview={task => { setReviewTask(task); setIsReviewTaskDialogOpen(true); }}
					/>
				) : (
					<TaskListView
						tasks={tasks}
						stages={[...project.stages].sort((a, b) => a.order - b.order)}
						onTaskEdit={handleTaskEdit}
						onTaskDelete={handleTaskDelete}
						onTaskUpdate={handleTaskUpdate}
						teamMembers={teamMembers}
						canManage={currentUser?.role !== 'user'}
						onTaskReview={task => { setReviewTask(task); setIsReviewTaskDialogOpen(true); }}
						showReviewButton={currentUser?.role === 'admin' || currentUser?.role === 'team-lead'}
					/>
				)}
			</div>
			<HistoryDialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen} history={history} teamMembers={teamMembers} />
			<TaskDialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen} onSave={handleSaveTask} editTask={editingTask} availableStatuses={project.stages} useProjectStages availableProjects={[project.name]} teamMembers={teamMembers} departments={departments} allTasks={allTasks} />
			<StageManagement open={isStageManagementOpen} onOpenChange={setIsStageManagementOpen} stages={project.stages} onAddStage={handleAddStage} onEditStage={handleEditStage} onDeleteStage={handleDeleteStage} />
			<StageDialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen} onSave={handleSaveStage} existingStages={project.stages} editStage={editingStage} teamMembers={teamMembers} />
			<ReviewTaskDialog open={isReviewTaskDialogOpen} onOpenChange={setIsReviewTaskDialogOpen} task={reviewTask} stages={project.stages} onApprove={handleApproveTask} onRequestRevision={handleRequestRevision} />
		</div>
	);
} import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Project } from "@/types/project";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Task, User } from "@/types/task";
import { StageDialog } from "@/components/StageDialog";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List } from "lucide-react";
import { Stage } from "@/types/stage";
import { TaskDialog } from "@/components/TaskDialog";
import { StageManagement } from "@/components/StageManagement";
import { Department } from "@/types/department";
import { HistoryDialog } from "@/components/HistoryDialog";
import { useHistory } from "@/hooks/use-history";
import { useUser } from "@/hooks/use-user";
import { TaskListView } from "@/components/TaskListView";
import { ReviewTaskDialog } from "@/components/ReviewTaskDialog";
import { useToast } from "@/hooks/use-toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { projectService } from "@/services/projectService";
import { taskService } from "@/services/taskService";
import { userService } from "@/services/userService";
import { departmentService } from "@/services/departmentService";

export default function ProjectKanban() {
	const { projectId } = useParams<{ projectId: string }>();
	const numericProjectId = projectId ? parseInt(projectId, 10) : undefined;
	const [project, setProject] = useState<Project | null>(null);
	const [tasks, setTasks] = useState<Task[]>([]);
	const [allTasks, setAllTasks] = useState<Task[]>([]);
	const [teamMembers, setTeamMembers] = useState<User[]>([]);
	const [departments, setDepartments] = useState<Department[]>([]);
	const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
	const [isStageManagementOpen, setIsStageManagementOpen] = useState(false);
	const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
	const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
	const [isReviewTaskDialogOpen, setIsReviewTaskDialogOpen] = useState(false);
	const [reviewTask, setReviewTask] = useState<Task | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const [editingStage, setEditingStage] = useState<Stage | null>(null);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const { history, addHistoryEntry } = useHistory(numericProjectId ? String(numericProjectId) : undefined);
	const { currentUser } = useUser();
	const { toast } = useToast();
	const [view, setView] = useState<"kanban" | "list">("kanban");

	// Load data from API using project ID
	useEffect(() => {
		const loadData = async () => {
			if (!numericProjectId) return;
			setIsLoading(true);
			try {
				const currentProject = await projectService.getById(String(numericProjectId));
				if (!currentProject) {
					setProject(null);
					setIsLoading(false);
					return;
				}
				const departmentsData = await departmentService.getAll();
				if (currentUser?.role === 'team-lead') {
					const hasMatchingDepartment = currentProject.department?.id === currentUser.department;
					const currentDept = departmentsData.find(d => d.id === currentUser.department);
					const isDigitalDept = currentDept?.name.toLowerCase() === 'digital';
					const isDesignProject = currentProject.department?.name.toLowerCase() === 'design';
					const hasSpecialPermission = isDigitalDept && isDesignProject;
					if (!hasMatchingDepartment && !hasSpecialPermission) {
						setProject(null);
						setIsLoading(false);
						return;
					}
				}
				setProject(currentProject);
				const tasksData = await taskService.getAll({ projectId: String(currentProject.id) });
				setTasks(tasksData.filter(t => t.projectId === currentProject.id));
				const allTasksData = await taskService.getAll();
				setAllTasks(allTasksData);
				const usersData = await userService.getAll();
				setTeamMembers(usersData);
				setDepartments(departmentsData);
			} catch (error) {
				console.error('Error loading project data:', error);
				toast({
					title: 'Error',
					description: 'Failed to load project data. Please try again.',
					variant: 'destructive',
				});
			} finally {
				setIsLoading(false);
			}
		};
		loadData();
	}, [numericProjectId, currentUser]);

	const updateProjectInStorage = async (updatedProject: Project) => {
		try {
			if (!updatedProject.id) return;
			await projectService.update(String(updatedProject.id), updatedProject);
			setProject(updatedProject);
			toast({
				title: "Project updated",
				description: "Project has been updated successfully.",
			});
		} catch (error) {
			console.error("Error updating project:", error);
			toast({
				title: "Error",
				description: "Failed to update project. Please try again.",
				variant: "destructive",
			});
		}
	};

	const updateTasksInStorage = async (updatedTasks: Task[]) => {
		setTasks(updatedTasks);
	};

	const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
		if (!currentUser || !project) return;

		const taskToUpdate = tasks.find(task => task.id === taskId);
		if (!taskToUpdate) return;

		try {
			if (updates.projectStage && updates.projectStage !== taskToUpdate.projectStage) {
				if (!('assignee' in updates) && project) {
					const targetStage = project.stages.find(s => s.id === updates.projectStage);
					if (targetStage?.mainResponsibleId) {
						const mainResponsible = teamMembers.find(m => m.id === targetStage.mainResponsibleId);
						if (mainResponsible) {
							updates.assignee = mainResponsible.name;
						} else {
							updates.assignee = "";
						}
					} else {
						updates.assignee = "";
					}
				}
				if (!('userStatus' in updates)) {
					updates.userStatus = "pending";
				}

				if (project) {
					const sortedStages = [...project.stages].sort((a, b) => a.order - b.order);
					const lastStage = sortedStages[sortedStages.length - 1];

					if (updates.projectStage === lastStage.id) {
						const currentTags = taskToUpdate.tags || [];
						if (!currentTags.includes("Completed")) {
							updates.tags = [...currentTags, "Completed"];
						}
					} else {
						const currentTags = taskToUpdate.tags || [];
						if (currentTags.includes("Completed")) {
							updates.tags = currentTags.filter(tag => tag !== "Completed");
						}
					}
				}

				addHistoryEntry({
					action: 'UPDATE_TASK_STATUS',
					entityId: taskId,
					entityType: 'task',
					projectId: String(project.id),
					userId: currentUser.id,
					details: {
						from: taskToUpdate.projectStage,
						to: updates.projectStage,
					},
				});
			}

			if (updates.assignee && updates.assignee !== taskToUpdate.assignee) {
				addHistoryEntry({
					action: 'UPDATE_TASK_ASSIGNEE',
					entityId: taskId,
					entityType: 'task',
					projectId: String(project.id),
					userId: currentUser.id,
					details: {
						from: taskToUpdate.assignee,
						to: updates.assignee,
					},
				});
			}

			await taskService.update(taskId, updates);

			const updatedTasks = tasks.map(task =>
				task.id === taskId ? { ...task, ...updates } : task
			);
			setTasks(updatedTasks);
		} catch (error) {
			console.error("Error updating task:", error);
			toast({
				title: "Error",
				description: "Failed to update task. Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleSaveTask = async (task: Omit<Task, "id" | "createdAt">) => {
		if (!currentUser || !project) return;

		try {
			if (editingTask) {
				await taskService.update(editingTask.id, task);
				const updatedTasks = tasks.map(t =>
					t.id === editingTask.id ? { ...t, ...task } : t
				);
				setTasks(updatedTasks);

				addHistoryEntry({
					action: 'UPDATE_TASK',
					entityId: editingTask.id,
					entityType: 'task',
					projectId: String(project.id),
					userId: currentUser.id,
					details: {
						from: editingTask,
						to: { ...editingTask, ...task },
					},
				});

				toast({
					title: "Task updated",
					description: "Task has been updated successfully.",
				});
			} else {
				const newTask = await taskService.create({
					...task,
					projectId: project.id,
				});
				setTasks([...tasks, newTask]);

				addHistoryEntry({
					action: 'CREATE_TASK',
					entityId: newTask.id,
					entityType: 'task',
					projectId: String(project.id),
					userId: currentUser.id,
					details: {
						title: newTask.title,
					},
				});

				toast({
					title: "Task created",
					description: "Task has been created successfully.",
				});
			}

			setIsTaskDialogOpen(false);
			setEditingTask(null);
		} catch (error) {
			console.error("Error saving task:", error);
			toast({
				title: "Error",
				description: "Failed to save task. Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleTaskEdit = (task: Task) => {
		setEditingTask(task);
		setIsTaskDialogOpen(true);
	};

	const handleTaskDelete = async (taskId: string) => {
		if (!currentUser || !project) return;

		try {
			const taskToDelete = tasks.find(t => t.id === taskId);
			if (taskToDelete) {
				addHistoryEntry({
					action: 'DELETE_TASK',
					entityId: taskId,
					entityType: 'task',
					projectId: String(project.id),
					userId: currentUser.id,
					details: { title: taskToDelete.title },
				});
			}

			await taskService.delete(taskId);
			const updatedTasks = tasks.filter(task => task.id !== taskId);
			setTasks(updatedTasks);

			toast({
				title: "Task deleted",
				description: "Task has been deleted successfully.",
			});
		} catch (error) {
			console.error("Error deleting task:", error);
			toast({
				title: "Error",
				description: "Failed to delete task. Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleAddStage = () => {
		setEditingStage(null);
		setIsStageDialogOpen(true);
	};

	const handleEditStage = (stage: Stage) => {
		setEditingStage(stage);
		setIsStageDialogOpen(true);
	};

	const handleDeleteStage = (stageId: string) => {
		if (!project || !currentUser) return;
		const stageToDelete = project.stages.find(s => s.id === stageId);

		if (stageToDelete) {
			addHistoryEntry({
				action: 'DELETE_STAGE',
				entityId: stageId,
				entityType: 'stage',
				projectId: String(project.id),
				userId: currentUser.id,
				details: { title: stageToDelete.title },
			});
		}
		const updatedStages = project.stages.filter(s => s.id !== stageId);
		const updatedProject = { ...project, stages: updatedStages };
		updateProjectInStorage(updatedProject);
	};

	const handleSaveStage = (stage: Omit<Stage, "order">) => {
		if (!project || !currentUser) return;

		let updatedStages: Stage[];
		if (editingStage) {
			updatedStages = project.stages.map(s =>
				s.id === editingStage.id ? { ...s, ...stage } : s
			);
			addHistoryEntry({
				action: 'UPDATE_STAGE',
				entityId: editingStage.id,
				entityType: 'stage',
				projectId: String(project.id),
				userId: currentUser.id,
				details: { from: editingStage, to: { ...editingStage, ...stage } },
			});
		} else {
			const newStage = { ...stage, order: project.stages.length, id: `stage-${Date.now()}` };
			updatedStages = [...project.stages, newStage];
			addHistoryEntry({
				action: 'CREATE_STAGE',
				entityId: newStage.id,
				entityType: 'stage',
				projectId: String(project.id),
				userId: currentUser.id,
				details: { title: newStage.title },
			});
		}

		const updatedProject = { ...project, stages: updatedStages };
		updateProjectInStorage(updatedProject);
		setIsStageDialogOpen(false);
		setEditingStage(null);
	};

	const handleApproveTask = (taskId: string, targetStageId: string, comment?: string) => {
		if (!project || !currentUser) return;

		const task = tasks.find((t) => t.id === taskId);
		if (!task) return;

		handleTaskUpdate(taskId, {
			projectStage: targetStageId,
			isInSpecificStage: false,
			previousStage: undefined,
			originalAssignee: undefined,
			revisionComment: undefined,
		});

		if (comment) {
			addHistoryEntry({
				action: "UPDATE_TASK_STATUS",
				entityId: taskId,
				entityType: "task",
				details: {
					action: "approved",
					comment: comment,
					targetStage: project?.stages.find(s => s.id === targetStageId)?.title || targetStageId,
				},
				projectId: String(project.id),
				userId: currentUser?.id || "unknown",
			});
		}

		toast({
			title: "Task approved",
			description: `Task moved to ${project?.stages.find(s => s.id === targetStageId)?.title || "selected stage"}.`,
		});

		setIsReviewTaskDialogOpen(false);
		setReviewTask(null);
	};

	const handleRequestRevision = (taskId: string, targetStageId: string, comment: string) => {
		if (!currentUser || !project) return;

		const task = tasks.find((t) => t.id === taskId);
		if (!task) return;

		const originalAssignee = task.originalAssignee || task.assignee;

		if (!originalAssignee) {
			toast({
				title: "Error",
				description: "Could not find the task assignee.",
				variant: "destructive",
			});
			return;
		}

		const newRevision = {
			id: Date.now().toString(),
			comment: comment,
			requestedBy: currentUser.name,
			requestedAt: new Date().toISOString(),
		};

		const updatedRevisionHistory = [
			...(task.revisionHistory || []),
			newRevision,
		];

		const updatedTags = (task.tags || []);
		if (!updatedTags.includes("Redo")) {
			updatedTags.push("Redo");
		}

		handleTaskUpdate(taskId, {
			projectStage: targetStageId,
			assignee: originalAssignee,
			userStatus: "pending",
			isInSpecificStage: false,
			revisionComment: comment,
			revisionHistory: updatedRevisionHistory,
			tags: updatedTags,
			previousStage: undefined,
			originalAssignee: undefined,
		});

		toast({
			title: "Revision requested",
			description: `Task sent to ${project?.stages.find(s => s.id === targetStageId)?.title || "selected stage"} for ${originalAssignee} with Redo tag.`,
		});

		setIsReviewTaskDialogOpen(false);
		setReviewTask(null);
	};

	if (isLoading) {
		return <div className="flex items-center justify-center h-screen">Loading...</div>;
	}

	if (!project) {
		return <div className="flex items-center justify-center h-screen">Project not found</div>;
	}

	return (
		<div className="flex flex-col h-screen overflow-hidden">
			<div className="flex-shrink-0 border-b p-4 space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">{project.name}</h1>
						<p className="text-muted-foreground">{project.description}</p>
					</div>
					<div className="flex gap-2">
						{(currentUser?.role === "admin" || currentUser?.role === "team-lead") && (
							<>
								<Button variant="outline" onClick={() => setIsHistoryDialogOpen(true)}>
									View History
								</Button>
								<Button variant="outline" onClick={() => setIsStageManagementOpen(true)}>
									Manage Stages
								</Button>
								<Button
									onClick={() => {
										setEditingTask(null);
										setIsTaskDialogOpen(true);
									}}
								>
									<Plus className="mr-2 h-4 w-4" />
									Add Task
								</Button>
							</>
						)}
					</div>
				</div>
				<div className="flex items-center justify-between">
					<ToggleGroup
						type="single"
						value={view}
						onValueChange={(value) => {
							if (value) setView(value as "kanban" | "list");
						}}
					>
						<ToggleGroupItem value="kanban" aria-label="Kanban view">
							<LayoutGrid className="h-4 w-4" />
						</ToggleGroupItem>
						<ToggleGroupItem value="list" aria-label="List view">
							<List className="h-4 w-4" />
						</ToggleGroupItem>
					</ToggleGroup>
				</div>
			</div>

			<div className="flex-1 overflow-auto p-4">
				{view === "kanban" ? (
					<div className="h-full w-full">
						<KanbanBoard
							tasks={tasks}
							stages={[...project.stages].sort((a, b) => a.order - b.order)}
							onTaskUpdate={handleTaskUpdate}
							onTaskEdit={handleTaskEdit}
							onTaskDelete={handleTaskDelete}
							useProjectStages={true}
							canManageTasks={currentUser?.role !== "user"}
							canDragTasks={currentUser?.role !== "user"}
							onTaskReview={(task) => {
								setReviewTask(task);
								setIsReviewTaskDialogOpen(true);
							}}
						/>
					</div>
				) : (
					<TaskListView
						tasks={tasks}
						stages={[...project.stages].sort((a, b) => a.order - b.order)}
						onTaskEdit={handleTaskEdit}
						onTaskDelete={handleTaskDelete}
						onTaskUpdate={handleTaskUpdate}
						teamMembers={teamMembers}
						canManage={currentUser?.role !== "user"}
						onTaskReview={(task) => {
							setReviewTask(task);
							setIsReviewTaskDialogOpen(true);
						}}
						showReviewButton={currentUser?.role === "admin" || currentUser?.role === "team-lead"}
					/>
				)}
			</div>

			<HistoryDialog
				open={isHistoryDialogOpen}
				onOpenChange={setIsHistoryDialogOpen}
				history={history}
				teamMembers={teamMembers}
			/>
			<TaskDialog
				open={isTaskDialogOpen}
				onOpenChange={setIsTaskDialogOpen}
				onSave={handleSaveTask}
				editTask={editingTask}
				availableStatuses={project.stages}
				useProjectStages={true}
				availableProjects={[project.name]}
				teamMembers={teamMembers}
				departments={departments}
				allTasks={allTasks}
			/>

			<StageManagement
				open={isStageManagementOpen}
				onOpenChange={setIsStageManagementOpen}
				stages={project.stages}
				onAddStage={handleAddStage}
				onEditStage={handleEditStage}
				onDeleteStage={handleDeleteStage}
			/>

			<StageDialog
				open={isStageDialogOpen}
				onOpenChange={setIsStageDialogOpen}
				onSave={handleSaveStage}
				existingStages={project.stages}
				editStage={editingStage}
				teamMembers={teamMembers}
			/>

			<ReviewTaskDialog
				open={isReviewTaskDialogOpen}
				onOpenChange={setIsReviewTaskDialogOpen}
				task={reviewTask}
				stages={project.stages}
				onApprove={handleApproveTask}
				onRequestRevision={handleRequestRevision}
			/>
		</div>
	);
}

// Load data from API (sequential where needed to derive project ID)
useEffect(() => {
	const loadData = async () => {
		if (!projectName) return;
		setIsLoading(true);
		try {
			const projectsData = await projectService.getAll();
			const currentProject = projectsData.find(p => p.name === projectName) || null;
			if (!currentProject) {
				setProject(null);
				setIsLoading(false);
				return;
			}
			// Access control for team-lead
			const departmentsData = await departmentService.getAll();
			if (currentUser?.role === 'team-lead') {
				const hasMatchingDepartment = currentProject.department?.id === currentUser.department;
				const currentDept = departmentsData.find(d => d.id === currentUser.department);
				const isDigitalDept = currentDept?.name.toLowerCase() === 'digital';
				const isDesignProject = currentProject.department?.name.toLowerCase() === 'design';
				const hasSpecialPermission = isDigitalDept && isDesignProject;
				if (!hasMatchingDepartment && !hasSpecialPermission) {
					setProject(null);
					setIsLoading(false);
					return;
				}
			}
			setProject(currentProject);
			// Fetch tasks filtered by project id (backend expects numeric)
			const projectId = currentProject.id ? String(currentProject.id) : undefined;
			const tasksData = projectId ? await taskService.getAll({ projectId }) : await taskService.getAll();
			// Filter tasks by project name for safety
			const filteredTasks = tasksData.filter(t => t.project === projectName);
			setTasks(filteredTasks);
			// All tasks (for dialogs that need cross-project info)
			const allTasksData = await taskService.getAll();
			setAllTasks(allTasksData);
			const usersData = await userService.getAll();
			setTeamMembers(usersData);
			setDepartments(departmentsData);
		} catch (error) {
			console.error('Error loading project data:', error);
			toast({
				title: 'Error',
				description: 'Failed to load project data. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};
	loadData();
}, [projectName, currentUser]);

const updateProjectInStorage = async (updatedProject: Project) => {
	try {
		if (!updatedProject.id) return;
		await projectService.update(updatedProject.id, updatedProject);
		setProject(updatedProject);
		toast({
			title: "Project updated",
			description: "Project has been updated successfully.",
		});
	} catch (error) {
		console.error("Error updating project:", error);
		toast({
			title: "Error",
			description: "Failed to update project. Please try again.",
			variant: "destructive",
		});
	}
};

const updateTasksInStorage = async (updatedTasks: Task[]) => {
	// This function now just updates local state
	// Individual task updates are handled by API calls
	setTasks(updatedTasks);
};

const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
	if (!currentUser || !projectName) return;

	const taskToUpdate = tasks.find(task => task.id === taskId);
	if (!taskToUpdate) return;

	try {
		// If stage changes, auto-assign to main responsible and reset user status
		// UNLESS we're explicitly setting the assignee (like in revision workflow)
		if (updates.projectStage && updates.projectStage !== taskToUpdate.projectStage) {
			// Only auto-assign if we're NOT explicitly setting it in the updates
			if (!('assignee' in updates) && project) {
				const targetStage = project.stages.find(s => s.id === updates.projectStage);
				if (targetStage?.mainResponsibleId) {
					const mainResponsible = teamMembers.find(m => m.id === targetStage.mainResponsibleId);
					if (mainResponsible) {
						updates.assignee = mainResponsible.name;
					} else {
						updates.assignee = ""; // Unassign if main responsible not found
					}
				} else {
					updates.assignee = ""; // Unassign if no main responsible set
				}
			}
			if (!('userStatus' in updates)) {
				updates.userStatus = "pending"; // Reset user-level status
			}

			// Check if moving to the last stage (rightmost stage)
			if (project) {
				const sortedStages = [...project.stages].sort((a, b) => a.order - b.order);
				const lastStage = sortedStages[sortedStages.length - 1];

				if (updates.projectStage === lastStage.id) {
					// Add "Completed" tag if not already present
					const currentTags = taskToUpdate.tags || [];
					if (!currentTags.includes("Completed")) {
						updates.tags = [...currentTags, "Completed"];
					}
				} else {
					// Remove "Completed" tag if moving away from last stage
					const currentTags = taskToUpdate.tags || [];
					if (currentTags.includes("Completed")) {
						updates.tags = currentTags.filter(tag => tag !== "Completed");
					}
				}
			}

			addHistoryEntry({
				action: 'UPDATE_TASK_STATUS',
				entityId: taskId,
				entityType: 'task',
				projectId: projectName,
				userId: currentUser.id,
				details: {
					from: taskToUpdate.projectStage,
					to: updates.projectStage,
				},
			});
		}

		if (updates.assignee && updates.assignee !== taskToUpdate.assignee) {
			addHistoryEntry({
				action: 'UPDATE_TASK_ASSIGNEE',
				entityId: taskId,
				entityType: 'task',
				projectId: projectName,
				userId: currentUser.id,
				details: {
					from: taskToUpdate.assignee,
					to: updates.assignee,
				},
			});
		}

		// Update via API
		await taskService.update(taskId, updates);

		// Update local state
		const updatedTasks = tasks.map(task =>
			task.id === taskId ? { ...task, ...updates } : task
		);
		setTasks(updatedTasks);
	} catch (error) {
		console.error("Error updating task:", error);
		toast({
			title: "Error",
			description: "Failed to update task. Please try again.",
			variant: "destructive",
		});
	}
};

const handleSaveTask = async (task: Omit<Task, "id" | "createdAt">) => {
	if (!currentUser || !projectName) return;

	try {
		if (editingTask) {
			// Update existing task
			await taskService.update(editingTask.id, task);
			const updatedTasks = tasks.map(t =>
				t.id === editingTask.id ? { ...t, ...task } : t
			);
			setTasks(updatedTasks);

			addHistoryEntry({
				action: 'UPDATE_TASK',
				entityId: editingTask.id,
				entityType: 'task',
				projectId: projectName,
				userId: currentUser.id,
				details: {
					from: editingTask,
					to: { ...editingTask, ...task },
				},
			});

			toast({
				title: "Task updated",
				description: "Task has been updated successfully.",
			});
		} else {
			// Create new task
			const newTask = await taskService.create({
				...task,
				project: projectName,
			});
			setTasks([...tasks, newTask]);

			addHistoryEntry({
				action: 'CREATE_TASK',
				entityId: newTask.id,
				entityType: 'task',
				projectId: projectName,
				userId: currentUser.id,
				details: {
					title: newTask.title,
				},
			});

			toast({
				title: "Task created",
				description: "Task has been created successfully.",
			});
		}

		setIsTaskDialogOpen(false);
		setEditingTask(null);
	} catch (error) {
		console.error("Error saving task:", error);
		toast({
			title: "Error",
			description: "Failed to save task. Please try again.",
			variant: "destructive",
		});
	}
};

const handleTaskEdit = (task: Task) => {
	setEditingTask(task);
	setIsTaskDialogOpen(true);
};

const handleTaskDelete = async (taskId: string) => {
	if (!currentUser || !projectName) return;

	try {
		const taskToDelete = tasks.find(t => t.id === taskId);
		if (taskToDelete) {
			addHistoryEntry({
				action: 'DELETE_TASK',
				entityId: taskId,
				entityType: 'task',
				projectId: projectName,
				userId: currentUser.id,
				details: { title: taskToDelete.title },
			});
		}

		await taskService.delete(taskId);
		const updatedTasks = tasks.filter(task => task.id !== taskId);
		setTasks(updatedTasks);

		toast({
			title: "Task deleted",
			description: "Task has been deleted successfully.",
		});
	} catch (error) {
		console.error("Error deleting task:", error);
		toast({
			title: "Error",
			description: "Failed to delete task. Please try again.",
			variant: "destructive",
		});
	}
};

const handleAddStage = () => {
	setEditingStage(null);
	setIsStageDialogOpen(true);
};

const handleEditStage = (stage: Stage) => {
	setEditingStage(stage);
	setIsStageDialogOpen(true);
};

const handleDeleteStage = (stageId: string) => {
	if (!project || !currentUser) return;
	const stageToDelete = project.stages.find(s => s.id === stageId);



	if (stageToDelete) {
		addHistoryEntry({
			action: 'DELETE_STAGE',
			entityId: stageId,
			entityType: 'stage',
			projectId: project.name,
			userId: currentUser.id,
			details: { title: stageToDelete.title },
		});
	}
	const updatedStages = project.stages.filter(s => s.id !== stageId);
	const updatedProject = { ...project, stages: updatedStages };
	updateProjectInStorage(updatedProject);
};

const handleSaveStage = (stage: Omit<Stage, "order">) => {
	if (!project || !currentUser) return;

	let updatedStages: Stage[];
	if (editingStage) {


		updatedStages = project.stages.map(s =>
			s.id === editingStage.id ? { ...s, ...stage } : s
		);
		addHistoryEntry({
			action: 'UPDATE_STAGE',
			entityId: editingStage.id,
			entityType: 'stage',
			projectId: project.name,
			userId: currentUser.id,
			details: { from: editingStage, to: { ...editingStage, ...stage } },
		});
	} else {
		const newStage = { ...stage, order: project.stages.length, id: `stage-${Date.now()}` };
		updatedStages = [...project.stages, newStage];
		addHistoryEntry({
			action: 'CREATE_STAGE',
			entityId: newStage.id,
			entityType: 'stage',
			projectId: project.name,
			userId: currentUser.id,
			details: { title: newStage.title },
		});
	}

	const updatedProject = { ...project, stages: updatedStages };
	updateProjectInStorage(updatedProject);
	setIsStageDialogOpen(false);
	setEditingStage(null);
};

const handleApproveTask = (taskId: string, targetStageId: string, comment?: string) => {
	if (!project || !currentUser) return;

	const task = tasks.find((t) => t.id === taskId);
	if (!task) return;

	// Move task to selected stage
	handleTaskUpdate(taskId, {
		projectStage: targetStageId,
		isInSpecificStage: false,
		previousStage: undefined,
		originalAssignee: undefined,
		revisionComment: undefined,
	});

	// Add history entry if comment provided
	if (comment) {
		addHistoryEntry({
			action: "UPDATE_TASK_STATUS",
			entityId: taskId,
			entityType: "task",
			details: {
				action: "approved",
				comment: comment,
				targetStage: project?.stages.find(s => s.id === targetStageId)?.title || targetStageId,
			},
			projectId: project?.name || "",
			userId: currentUser?.id || "unknown",
		});
	}

	toast({
		title: "Task approved",
		description: `Task moved to ${project?.stages.find(s => s.id === targetStageId)?.title || "selected stage"}.`,
	});

	setIsReviewTaskDialogOpen(false);
	setReviewTask(null);
};

const handleRequestRevision = (taskId: string, targetStageId: string, comment: string) => {
	if (!currentUser || !project) return;

	const task = tasks.find((t) => t.id === taskId);
	if (!task) return;

	const originalAssignee = task.originalAssignee || task.assignee;

	if (!originalAssignee) {
		toast({
			title: "Error",
			description: "Could not find the task assignee.",
			variant: "destructive",
		});
		return;
	}

	// Add to revision history
	const newRevision = {
		id: Date.now().toString(),
		comment: comment,
		requestedBy: currentUser.name,
		requestedAt: new Date().toISOString(),
	};

	const updatedRevisionHistory = [
		...(task.revisionHistory || []),
		newRevision,
	];

	// Add "Redo" tag
	const updatedTags = (task.tags || []);
	if (!updatedTags.includes("Redo")) {
		updatedTags.push("Redo");
	}

	// Move task to selected stage with original assignee
	handleTaskUpdate(taskId, {
		projectStage: targetStageId,
		assignee: originalAssignee,
		userStatus: "pending",
		isInSpecificStage: false,
		revisionComment: comment,
		revisionHistory: updatedRevisionHistory,
		tags: updatedTags,
		previousStage: undefined,
		originalAssignee: undefined,
	});

	toast({
		title: "Revision requested",
		description: `Task sent to ${project?.stages.find(s => s.id === targetStageId)?.title || "selected stage"} for ${originalAssignee} with Redo tag.`,
	});

	setIsReviewTaskDialogOpen(false);
	setReviewTask(null);
};



if (isLoading) {
	return <div className="flex items-center justify-center h-screen">Loading...</div>;
}

if (!project) {
	return <div className="flex items-center justify-center h-screen">Project not found</div>;
}

return (
	<div className="flex flex-col h-screen overflow-hidden">
		{/* Fixed header */}
		<div className="flex-shrink-0 border-b p-4 space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">{project.name}</h1>
					<p className="text-muted-foreground">{project.description}</p>
				</div>
				<div className="flex gap-2">
					{(currentUser?.role === "admin" || currentUser?.role === "team-lead") && (
						<>
							<Button variant="outline" onClick={() => setIsHistoryDialogOpen(true)}>
								View History
							</Button>
							<Button variant="outline" onClick={() => setIsStageManagementOpen(true)}>
								Manage Stages
							</Button>
							<Button
								onClick={() => {
									setEditingTask(null);
									setIsTaskDialogOpen(true);
								}}
							>
								<Plus className="mr-2 h-4 w-4" />
								Add Task
							</Button>
						</>
					)}
				</div>
			</div>
			<div className="flex items-center justify-between">
				<ToggleGroup
					type="single"
					value={view}
					onValueChange={(value) => {
						if (value) setView(value as "kanban" | "list");
					}}
				>
					<ToggleGroupItem value="kanban" aria-label="Kanban view">
						<LayoutGrid className="h-4 w-4" />
					</ToggleGroupItem>
					<ToggleGroupItem value="list" aria-label="List view">
						<List className="h-4 w-4" />
					</ToggleGroupItem>
				</ToggleGroup>
			</div>
		</div>

		{/* Scrollable content section */}
		<div className="flex-1 overflow-auto p-4">
			{view === "kanban" ? (
				<div className="h-full w-full">
					<KanbanBoard
						tasks={tasks}
						stages={[...project.stages]
							.sort((a, b) => a.order - b.order)}
						onTaskUpdate={handleTaskUpdate}
						onTaskEdit={handleTaskEdit}
						onTaskDelete={handleTaskDelete}
						useProjectStages={true}
						canManageTasks={currentUser?.role !== "user"}
						canDragTasks={currentUser?.role !== "user"}
						onTaskReview={(task) => {
							setReviewTask(task);
							setIsReviewTaskDialogOpen(true);
						}}

					/>
				</div>
			) : (
				<TaskListView
					tasks={tasks}
					stages={[...project.stages]
						.sort((a, b) => a.order - b.order)}
					onTaskEdit={handleTaskEdit}
					onTaskDelete={handleTaskDelete}
					onTaskUpdate={handleTaskUpdate}
					teamMembers={teamMembers}
					canManage={currentUser?.role !== "user"}
					onTaskReview={(task) => {
						setReviewTask(task);
						setIsReviewTaskDialogOpen(true);
					}}
					showReviewButton={currentUser?.role === "admin" || currentUser?.role === "team-lead"}

				/>
			)}
		</div>

		{/* Dialogs */}
		<HistoryDialog
			open={isHistoryDialogOpen}
			onOpenChange={setIsHistoryDialogOpen}
			history={history}
			teamMembers={teamMembers}
		/>
		<TaskDialog
			open={isTaskDialogOpen}
			onOpenChange={setIsTaskDialogOpen}
			onSave={handleSaveTask}
			editTask={editingTask}
			availableStatuses={project.stages}
			useProjectStages={true}
			availableProjects={[project.name]}
			teamMembers={teamMembers}
			departments={departments}
			allTasks={allTasks}
		/>

		<StageManagement
			open={isStageManagementOpen}
			onOpenChange={setIsStageManagementOpen}
			stages={project.stages}
			onAddStage={handleAddStage}
			onEditStage={handleEditStage}
			onDeleteStage={handleDeleteStage}
		/>

		<StageDialog
			open={isStageDialogOpen}
			onOpenChange={setIsStageDialogOpen}
			onSave={handleSaveStage}
			existingStages={project.stages}
			editStage={editingStage}
			teamMembers={teamMembers}
		/>

		<ReviewTaskDialog
			open={isReviewTaskDialogOpen}
			onOpenChange={setIsReviewTaskDialogOpen}
			task={reviewTask}
			stages={project.stages}
			onApprove={handleApproveTask}
			onRequestRevision={handleRequestRevision}
		/>


	</div>
);
}