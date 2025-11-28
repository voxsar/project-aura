import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Task, User } from "@/types/task";
import { userStages, Stage } from "@/types/stage";
import { Project } from "@/types/project";
import { Department } from "@/types/department";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List } from "lucide-react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TaskDialog } from "@/components/TaskDialog";
import { TaskFilters } from "@/components/TaskFilters";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { TaskListView } from "@/components/TaskListView";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { projectService } from "@/services/projectService";
import { taskService } from "@/services/taskService";
import { userService } from "@/services/userService";
import { departmentService } from "@/services/departmentService";

// Define the three fixed stages for the /tasks page
const fixedKanbanStages: Stage[] = [
	{ id: "pending", title: "Pending", color: "bg-status-todo", order: 0, type: "user" },
	{ id: "in-progress", title: "In Progress", color: "bg-status-progress", order: 1, type: "user" },
	{ id: "complete", title: "Completed", color: "bg-status-done", order: 2, type: "user" },
];

export default function Tasks() {
	const { projectId } = useParams<{ projectId?: string }>();
	const numericProjectId = projectId ? parseInt(projectId, 10) : null;
	const { currentUser } = useUser();

	const [allTasks, setAllTasks] = useState<Task[]>([]);
	const [allProjects, setAllProjects] = useState<Project[]>([]);
	const [teamMembers, setTeamMembers] = useState<User[]>([]);
	const [departments, setDepartments] = useState<Department[]>([]); // Add departments state
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedProject, setSelectedProject] = useState("all");
	const [selectedStatus, setSelectedStatus] = useState("all");
	const [selectedAssignee, setSelectedAssignee] = useState("all");
	const [selectedTag, setSelectedTag] = useState("all");
	const { toast } = useToast();
	const [view, setView] = useState<"kanban" | "list">("kanban");

	// Load all tasks and projects from API
	useEffect(() => {
		const loadData = async () => {
			try {
				const projectsData = await projectService.getAll();
				setAllProjects(projectsData);
				const tasksData = await taskService.getAll();
				setAllTasks(tasksData);
				const usersData = await userService.getAll();
				setTeamMembers(usersData);
				const departmentsData = await departmentService.getAll();
				setDepartments(departmentsData);
			} catch (error) {
				console.error('Error loading data:', error);
				toast({
					title: 'Error',
					description: 'Failed to load data. Please try again.',
					variant: 'destructive',
				});
			}
		};
		loadData();
	}, []);

	// Save tasks to API whenever they change
	useEffect(() => {
		// No longer needed - tasks are saved via API calls
	}, [allTasks]);

	// Set selected project from URL parameter (by ID)
	useEffect(() => {
		if (numericProjectId && allProjects.length > 0) {
			const proj = allProjects.find(p => p.id === numericProjectId);
			setSelectedProject(proj ? proj.name : "all");
		} else {
			setSelectedProject("all");
		}
	}, [numericProjectId, allProjects]);

	const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
		try {
			const task = allTasks.find(t => t.id === taskId);
			if (!task) return;

			// Handle virtual stage updates from KanbanBoard
			const finalUpdates = { ...updates };

			// If the update comes from the Kanban board columns (which are "pending", "in-progress", "complete")
			// we need to translate that to userStatus updates
			if (updates.projectStage === "pending") {
				finalUpdates.userStatus = "pending";
				delete finalUpdates.projectStage;
			} else if (updates.projectStage === "in-progress") {
				finalUpdates.userStatus = "in-progress";
				delete finalUpdates.projectStage;
			} else if (updates.projectStage === "complete") {
				finalUpdates.userStatus = "complete";
				delete finalUpdates.projectStage;
			}

			const updatedTask = { ...task, ...finalUpdates };

			// Check if user just completed the task
			if (finalUpdates.userStatus === "complete" && task.userStatus !== "complete") {
				// Add "Specific Stage" tag
				const reviewingTag = "Specific Stage";
				const currentTags = updatedTask.tags || [];
				if (!currentTags.includes(reviewingTag)) {
					updatedTask.tags = [...currentTags, reviewingTag];
				}

				// Mark as in review and set completion time
				updatedTask.isInSpecificStage = true;
				updatedTask.completedAt = new Date().toISOString();

				// Move to Specific stage on project side
				const taskProject = allProjects.find((p: Project) => p.id === (task.projectId ?? -1)) || allProjects.find((p: Project) => p.name === task.project);
				if (taskProject) {
					const reviewStage = taskProject.stages.find((s: Stage) => s.title === "Specific Stage");
					if (reviewStage) {
						updatedTask.projectStage = reviewStage.id;
					}
				}
			}

			// Update via API
			await taskService.update(taskId, updatedTask);

			// Update local state
			setAllTasks((prev) =>
				prev.map((t) => (t.id === taskId ? updatedTask : t))
			);

			toast({
				title: "Task updated",
				description: "The task has been updated successfully.",
			});
		} catch (error) {
			console.error("Error updating task:", error);
			toast({
				title: "Error",
				description: "Failed to update task. Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleTaskSave = async (taskData: Omit<Task, "id" | "createdAt">) => {
		try {
			if (editingTask) {
				// Update existing task
				await taskService.update(editingTask.id, taskData);
				setAllTasks((prev) =>
					prev.map((task) =>
						task.id === editingTask.id ? { ...task, ...taskData } : task
					)
				);
				toast({
					title: "Task updated",
					description: "The task has been updated successfully.",
				});
			} else {
				// Create new task
				const newTask = await taskService.create({
					...taskData,
					userStatus: "pending", // New tasks start as pending
				});
				setAllTasks((prev) => [...prev, newTask]);
				toast({
					title: "Task created",
					description: "The task has been created successfully.",
				});
			}
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
		setIsDialogOpen(true);
	};

	const handleTaskDelete = async (taskId: string) => {
		try {
			await taskService.delete(taskId);
			setAllTasks((prev) => prev.filter((task) => task.id !== taskId));
			toast({
				title: "Task deleted",
				description: "The task has been deleted successfully.",
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

	// Categorize all tasks into the three fixed stages
	const allCategorizedTasks = useMemo(() => {
		let tasksToProcess = allTasks;

		// Filter tasks by department for team-lead
		if (currentUser?.role === "team-lead") {
			// Get team members from current user's department
			const departmentMembers = teamMembers
				.filter(member => member.department === currentUser.department)
				.map(member => member.name);

			// Special permission: Digital Department can see Design Department tasks too
			const currentDept = departments.find(d => d.id === currentUser.department);
			const isDigitalDept = currentDept?.name.toLowerCase() === "digital";

			// If Digital dept, also include Design dept members
			let allAllowedMembers = departmentMembers;
			if (isDigitalDept) {
				const designDept = departments.find(d => d.name.toLowerCase() === "design");
				if (designDept) {
					const designMembers = teamMembers
						.filter(member => member.department === designDept.id)
						.map(member => member.name);
					allAllowedMembers = [...departmentMembers, ...designMembers];
				}
			}

			// Filter tasks assigned to department members or projects in their department
			tasksToProcess = allTasks.filter(task => {
				// Include if task is assigned to someone in their department (or Design if Digital)
				const isAssignedToDepartment = allAllowedMembers.includes(task.assignee);

				// Include if task's project belongs to their department
				const taskProject = allProjects.find(p => p.id === (task.projectId ?? -1)) || allProjects.find(p => p.name === task.project);
				const isProjectInDepartment = taskProject?.department?.id === currentUser.department;

				// Special permission: Include Design department projects for Digital dept
				const isDesignProject = isDigitalDept && taskProject?.department?.name.toLowerCase() === "design";

				return isAssignedToDepartment || isProjectInDepartment || isDesignProject;
			});
		}

		return tasksToProcess.map(task => {
			let fixedStageId: string;
			// Rule 1: Tasks in the last stage of their project go to "Completed"
			if (task.project && task.projectStage) {
				const project = allProjects.find(p => p.name === task.project);
				if (project && project.stages.length > 0) {
					const lastStage = project.stages[project.stages.length - 1];
					if (task.projectStage === lastStage.id || task.userStatus === "complete") {
						fixedStageId = "complete";
					} else if (task.userStatus === "pending") { // If not last stage, check user-level pending
						fixedStageId = "pending";
					} else {
						fixedStageId = "in-progress";
					}
				} else if (task.userStatus === "complete") {
					fixedStageId = "complete";
				} else if (task.userStatus === "pending") { // If project not found or no stages, check user-level pending
					fixedStageId = "pending";
				} else {
					fixedStageId = "in-progress";
				}
			}
			// Rule 2: User-level pending tasks (for tasks without project/projectStage) go to "Pending"
			else if (task.userStatus === "complete") {
				fixedStageId = "complete";
			}
			else if (task.userStatus === "pending") {
				fixedStageId = "pending";
			}
			// Rule 3: All other tasks go to "In Progress"
			else {
				fixedStageId = "in-progress";
			}
			return { ...task, fixedStageId };
		});
	}, [allTasks, allProjects, currentUser, teamMembers]);

	const filteredTasks = useMemo(() => {
		let tasksToFilter = allCategorizedTasks;

		// Apply project filter
		if (selectedProject !== "all") {
			tasksToFilter = tasksToFilter.filter(task => task.project === selectedProject);
		}

		// Apply assignee filter
		if (selectedAssignee !== "all") {
			tasksToFilter = tasksToFilter.filter(task => task.assignee === selectedAssignee);
		}

		// Apply tag filter
		if (selectedTag !== "all") {
			tasksToFilter = tasksToFilter.filter(task =>
				task.tags && task.tags.includes(selectedTag)
			);
		}

		// Apply search query filter
		tasksToFilter = tasksToFilter.filter(task =>
			task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			task.description.toLowerCase().includes(searchQuery.toLowerCase())
		);

		// Apply status filter based on the fixed stages
		if (selectedStatus !== "all") {
			tasksToFilter = tasksToFilter.filter(task => task.fixedStageId === selectedStatus);
		}

		return tasksToFilter;
	}, [allCategorizedTasks, selectedProject, selectedAssignee, selectedTag, searchQuery, selectedStatus, currentUser]);

	// Prepare tasks for KanbanBoard based on the fixed stages
	const tasksForKanban = useMemo(() => {
		// filteredTasks already have the fixedStageId, so we just need to ensure
		// the projectStage property is set to fixedStageId for KanbanBoard to group correctly.
		return filteredTasks.map(task => ({
			...task,
			projectStage: task.fixedStageId, // KanbanBoard uses projectStage for grouping
		}));
	}, [filteredTasks]);

	const tasksForList = useMemo(() => {
		return filteredTasks.map(task => ({
			...task,
			projectStage: task.fixedStageId,
		}));
	}, [filteredTasks]);

	// Clean up any stray debug fragments
	// (fix accidental 'consol' text)

	return (
		<div className="space-y-6 h-full flex flex-col">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						{selectedProject !== "all" ? selectedProject : "All Tasks"}
					</h1>
					<p className="text-muted-foreground mt-1">
						{selectedProject !== "all"
							? `Manage tasks for ${selectedProject} project`
							: "Manage and organize your tasks"}
					</p>
				</div>
				<div className="flex items-center gap-2">
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
					<Button
						onClick={() => {
							setEditingTask(null);
							setIsDialogOpen(true);
						}}
						className="gap-2"
					>
						<Plus className="h-4 w-4" />
						New Task
					</Button>
				</div>
			</div>

			<TaskFilters
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				selectedProject={selectedProject}
				onProjectChange={setSelectedProject}
				selectedStatus={selectedStatus}
				onStatusChange={setSelectedStatus}
				selectedAssignee={selectedAssignee}
				onAssigneeChange={setSelectedAssignee}
				selectedTag={selectedTag}
				onTagChange={setSelectedTag}
				availableProjects={allProjects.map(p => p.name)}
				availableStatuses={fixedKanbanStages} // Always use fixed stages for filter
				teamMembers={teamMembers}
				allTasks={allTasks}
			/>

			<div className="flex-1 overflow-auto">
				{view === "kanban" ? (
					<KanbanBoard
						tasks={tasksForKanban}
						stages={fixedKanbanStages}
						useProjectStages={true} // Always use project stages logic for KanbanBoard
						onTaskUpdate={handleTaskUpdate}
						onTaskEdit={handleTaskEdit}
						onTaskDelete={handleTaskDelete}
						canManageTasks={currentUser?.role !== "user"}
					/>
				) : (
					<TaskListView
						tasks={tasksForList}
						stages={fixedKanbanStages}
						onTaskEdit={handleTaskEdit}
						onTaskDelete={handleTaskDelete}
						onTaskUpdate={handleTaskUpdate}
						teamMembers={teamMembers}
						canManage={currentUser?.role !== "user"}
						showProjectColumn={true}
					/>
				)}
			</div>

			<TaskDialog
				open={isDialogOpen}
				onOpenChange={(open) => {
					setIsDialogOpen(open);
					if (!open) setEditingTask(null);
				}}
				onSave={handleTaskSave}
				editTask={editingTask}
				availableProjects={allProjects.map(p => p.name)}
				availableStatuses={userStages} // TaskDialog still uses userStages for task status
				useProjectStages={false} // TaskDialog should not use project stages for task status
				teamMembers={teamMembers}
				departments={departments}
				allTasks={allTasks}
			/>
		</div>
	);
}