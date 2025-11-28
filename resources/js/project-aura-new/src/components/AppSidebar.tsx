import { LayoutDashboard, Users, FolderKanban, Inbox, Plus, Layers, Pencil, Trash2, FileCog } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarHeader,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { ProjectDialog } from "./ProjectDialog";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { Project } from "@/types/project";
import { Stage } from "@/types/stage";
import { User, UserRole, Task } from "@/types/task";
import { useUser } from "@/hooks/use-user";
import { useHistory } from "@/hooks/use-history";
import { Department } from "@/types/department";
import { api } from "@/services/api"; // Use axios instance
import { projectService } from "@/services/projectService";
import { taskService } from "@/services/taskService";
import { departmentService } from "@/services/departmentService";
import { userService } from "@/services/userService";
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

const mainMenuItems = [
	{ title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ["admin", "team-lead", "user"] },
	{ title: "Team", url: "/team", icon: Users, roles: ["admin", "team-lead"] },
	{ title: "Tasks", url: "/tasks", icon: Inbox, roles: ["admin", "team-lead"] },
];

export function AppSidebar() {
	const location = useLocation();
	const navigate = useNavigate();
	const { toast } = useToast();
	const { currentUser } = useUser();
	const { addHistoryEntry } = useHistory();
	const [projectsOpen, setProjectsOpen] = useState(true);
	const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
	const [projects, setProjects] = useState<Project[]>([]);
	const [teamMembers, setTeamMembers] = useState<User[]>([]);
	const [departments, setDepartments] = useState<Department[]>([]);
	const [assignedProjectsOpen, setAssignedProjectsOpen] = useState(true);
	const [departmentProjectsOpen, setDepartmentProjectsOpen] = useState(true);
	const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
	const [userAssignedProjects, setUserAssignedProjects] = useState<Project[]>([]);
	const [userDepartmentProjects, setUserDepartmentProjects] = useState<Project[]>([]);
	const [hoveredProject, setHoveredProject] = useState<string | null>(null);
	const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
	const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
	const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
	const userRole = currentUser?.role;

	// Load data from API on mount with proper mapping
	useEffect(() => {
		const fetchData = async () => {
			try {
				const [projectsData, departmentsData] = await Promise.all([
					projectService.getAll(),
					departmentService.getAll(),
				]);
				setProjects(projectsData);
				setDepartments(departmentsData);

				if (userRole === 'admin' || userRole === 'team-lead') {
					const usersData = await userService.getAll();
					setTeamMembers(usersData);
				}

				if (userRole === 'user' && currentUser) {
					// Fetch tasks for user only (client-side filter)
					const tasksData = await taskService.getAll();
					const userProjectStages = new Map<string, Set<string>>();
					tasksData
						.filter(task => task.assignee === currentUser.name)
						.forEach(task => {
							if (task.project && task.projectStage) {
								if (!userProjectStages.has(task.project)) {
									userProjectStages.set(task.project, new Set());
								}
								userProjectStages.get(task.project)?.add(task.projectStage);
							}
						});

					const assignedProjects = projectsData
						.filter(project => userProjectStages.has(project.name))
						.map(project => ({
							...project,
							stages: project.stages.filter(stage => userProjectStages.get(project.name)?.has(stage.id))
						}))
						.filter(project => project.stages.length > 0);
					setUserAssignedProjects(assignedProjects);

					const currentDept = departmentsData.find(d => d.id === currentUser.department);
					const isDigitalDept = currentDept?.name.toLowerCase() === 'digital';
					const departmentProjects = projectsData.filter(project => {
						const isOwnDepartment = project.department?.id === currentUser.department;
						const isDesignProject = isDigitalDept && project.department?.name.toLowerCase() === 'design';
						return isOwnDepartment || isDesignProject;
					});
					setUserDepartmentProjects(departmentProjects);
				}
			} catch (error) {
				console.error('Failed to fetch data from API:', error);
				toast({
					title: 'Error loading data',
					description: 'Failed to load data from the server. Please refresh the page.',
					variant: 'destructive',
				});
			}
		};
		if (currentUser) fetchData();
	}, [userRole, currentUser]);

	const handleProjectSave = async (
		name: string,
		description: string,
		stages: Stage[],
		emails: string[],
		phoneNumbers: string[],
		department?: Department
	) => {
		if (!currentUser) return;
		try {
			// Create project via service
			const newProject = await projectService.create({
				name,
				description,
				stages: [], // stages created separately
				emails,
				phoneNumbers,
				department,
			});

			// Create stages (only those without numeric id)
			for (const stage of stages) {
				await api.post('/stages', {
					title: stage.title,
					color: stage.color,
					order: stage.order,
					project_id: newProject.id,
					type: stage.type,
					main_responsible_id: stage.mainResponsibleId,
					backup_responsible_id_1: stage.backupResponsibleId1,
					backup_responsible_id_2: stage.backupResponsibleId2,
					is_review_stage: stage.isReviewStage,
					linked_review_stage_id: stage.linkedReviewStageId,
					approved_target_stage_id: stage.approvedTargetStageId,
				});
			}

			const projectsData = await projectService.getAll();
			setProjects(projectsData);

			addHistoryEntry({
				action: 'CREATE_PROJECT',
				entityId: newProject.id?.toString() || name,
				entityType: 'project',
				projectId: newProject.id?.toString() || name,
				userId: currentUser.id,
				details: { name: newProject.name },
			});

			toast({
				title: 'Project created',
				description: `${name} has been created with ${stages.length} workflow stages.`,
			});
		} catch (error) {
			console.error('Failed to create project:', error);
			toast({
				title: 'Error',
				description: 'Failed to create project. Please try again.',
				variant: 'destructive',
			});
		}
	};

	const handleProjectUpdate = async (
		name: string,
		description: string,
		stages: Stage[],
		emails: string[],
		phoneNumbers: string[],
		department?: Department
	) => {
		if (!currentUser || !projectToEdit) return;
		try {
			const updatedProject = await projectService.update(String(projectToEdit.id), {
				name,
				description,
				emails,
				phoneNumbers,
				department,
			});

			// Create any newly added stages (id not numeric)
			const newStages = stages.filter(s => !/^[0-9]+$/.test(s.id));
			for (const stage of newStages) {
				await api.post('/stages', {
					title: stage.title,
					color: stage.color,
					order: stage.order,
					project_id: updatedProject.id,
					type: stage.type,
					main_responsible_id: stage.mainResponsibleId,
					backup_responsible_id_1: stage.backupResponsibleId1,
					backup_responsible_id_2: stage.backupResponsibleId2,
					is_review_stage: stage.isReviewStage,
					linked_review_stage_id: stage.linkedReviewStageId,
					approved_target_stage_id: stage.approvedTargetStageId,
				});
			}

			const projectsData = await projectService.getAll();
			setProjects(projectsData);

			addHistoryEntry({
				action: 'UPDATE_PROJECT',
				entityId: updatedProject.id?.toString() || name,
				entityType: 'project',
				projectId: updatedProject.id?.toString() || name,
				userId: currentUser.id,
				details: { name: updatedProject.name },
			});

			toast({
				title: 'Project updated',
				description: `${name} has been updated successfully.`,
			});
			setProjectToEdit(null);
		} catch (error) {
			console.error('Failed to update project:', error);
			toast({
				title: 'Error',
				description: 'Failed to update project. Please try again.',
				variant: 'destructive',
			});
		}
	};

	const handleProjectDelete = async () => {
		if (!currentUser || !projectToDelete) return;
		try {
			await projectService.delete(String(projectToDelete.id));
			const projectsData = await projectService.getAll();
			setProjects(projectsData);
			addHistoryEntry({
				action: 'DELETE_PROJECT',
				entityId: projectToDelete.id?.toString() || projectToDelete.name,
				entityType: 'project',
				projectId: projectToDelete.id?.toString() || projectToDelete.name,
				userId: currentUser.id,
				details: { name: projectToDelete.name },
			});
			toast({
				title: 'Project deleted',
				description: `${projectToDelete.name} has been deleted.`,
				variant: 'destructive',
			});
			if (location.pathname.startsWith(`/project/${projectToDelete.id}`)) navigate('/');
			setProjectToDelete(null);
		} catch (error) {
			console.error('Failed to delete project:', error);
			toast({
				title: 'Error',
				description: 'Failed to delete project. Please try again.',
				variant: 'destructive',
			});
		}
	};

	const isProjectActive = (projectId: string) => {
		return location.pathname === `/project/${projectId}`;
	};

	const isStageActive = (projectId: string, stageId: string) => {
		return location.pathname === `/user-project/${projectId}/stage/${stageId}`;
	};

	const toggleProjectExpanded = (projectName: string) => {
		setExpandedProjects(prev => {
			const newSet = new Set(prev);
			if (newSet.has(projectName)) {
				newSet.delete(projectName);
			} else {
				newSet.add(projectName);
			}
			return newSet;
		});
	};

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

	// Group projects by department (admin) or filter flat list (team-lead)
	const projectsByDepartment = useMemo(() => {
		let filteredProjects = projects;

		// Filter projects by department for team-lead
		if (userRole === "team-lead" && currentUser) {
			const currentDept = departments.find(d => d.id === currentUser.department);
			const isDigitalDept = currentDept?.name.toLowerCase() === "digital";

			filteredProjects = projects.filter(project => {
				// Include projects that have a department matching the team-lead's department
				// OR projects with no department (for backward compatibility)
				const hasMatchingDepartment = project.department?.id === currentUser.department;
				const hasNoDepartment = !project.department;

				// Special permission: Digital Department can see Design Department projects too
				const isDesignProject = project.department?.name.toLowerCase() === "design";
				const hasSpecialPermission = isDigitalDept && isDesignProject;

				return hasMatchingDepartment || hasNoDepartment || hasSpecialPermission;
			});

			// For Digital dept team-lead, group by department (Digital and Design)
			// For other team-leads, return flat structure
			if (isDigitalDept) {
				const grouped = filteredProjects.reduce((acc, project) => {
					// Use the project's actual department for grouping
					const projectDept = project.department;
					const deptId = projectDept?.id || 'uncategorized';
					const deptName = projectDept?.name || 'Uncategorized';

					if (!acc[deptId]) {
						acc[deptId] = {
							id: deptId,
							name: deptName,
							projects: []
						};
					}
					acc[deptId].projects.push(project);
					return acc;
				}, {} as Record<string, { id: string; name: string; projects: Project[] }>);

				return grouped;
			} else {
				// For other team-leads, don't group by department - return flat structure
				return {
					'flat': {
						id: 'flat',
						name: '',
						projects: filteredProjects
					}
				};
			}
		}

		// For admin, group by department
		return filteredProjects.reduce((acc, project) => {
			const deptId = project.department?.id || 'uncategorized';
			const deptName = project.department?.name || 'Uncategorized';

			if (!acc[deptId]) {
				acc[deptId] = {
					id: deptId,
					name: deptName,
					projects: []
				};
			}
			acc[deptId].projects.push(project);
			return acc;
		}, {} as Record<string, { id: string; name: string; projects: Project[] }>);
	}, [projects, userRole, currentUser, departments]);

	const departmentGroups = Object.values(projectsByDepartment).sort((a, b) => {
		if (a.id === 'uncategorized') return 1;
		if (b.id === 'uncategorized') return -1;
		return a.name.localeCompare(b.name);
	});

	const filteredMainMenuItems = mainMenuItems.filter(item =>
		userRole && item.roles.includes(userRole)
	);

	return (
		<Sidebar>
			<SidebarHeader className="border-b border-sidebar-border p-4">
				<div className="flex items-center gap-2">
					<div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
						<FolderKanban className="h-5 w-5 text-primary-foreground" />
					</div>
					<div>
						<h2 className="font-semibold text-sm">TaskFlow</h2>
						<p className="text-xs text-muted-foreground">Project Manager</p>
					</div>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{filteredMainMenuItems.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild>
										<NavLink
											to={item.url}
											end
											className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent"
											activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
										>
											<item.icon className="h-4 w-4" />
											<span>{item.title}</span>
										</NavLink>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{(userRole === "admin" || userRole === "team-lead") && (
					<SidebarGroup>
						<Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
							<div className="flex items-center justify-between px-2">
								<CollapsibleTrigger className="flex flex-1 items-center justify-between py-1.5 text-sm font-medium hover:bg-sidebar-accent rounded-md transition-colors">
									<SidebarGroupLabel className="hover:bg-transparent">Projects</SidebarGroupLabel>
									<ChevronRight
										className={`h-4 w-4 transition-transform ${projectsOpen ? "rotate-90" : ""
											}`}
									/>
								</CollapsibleTrigger>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 ml-1"
									onClick={() => setIsProjectDialogOpen(true)}
									title="Add new project"
								>
									<Plus className="h-4 w-4" />
								</Button>
							</div>
							<CollapsibleContent>
								<SidebarGroupContent>
									<SidebarMenu>
										{departmentGroups.length === 0 ? (
											<div className="px-3 py-2 text-sm text-muted-foreground">
												No projects found
											</div>
										) : userRole === "team-lead" && departmentGroups[0]?.id === 'flat' ? (
											// Non-Digital Team-lead: Show flat list of projects without department grouping
											departmentGroups[0]?.projects.map((project) => (
												<SidebarMenuItem
													key={project.id}
													onMouseEnter={() => setHoveredProject(project.name)}
													onMouseLeave={() => setHoveredProject(null)}
												>
													<div className="relative group">
														<SidebarMenuButton asChild>
															<NavLink
																to={`/project/${project.id}`}
																className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent ${isProjectActive(project.id)
																	? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
																	: ""
																	}`}
															>
																<FolderKanban className="h-4 w-4" />
																<span className="text-sm flex-1">{project.name}</span>
															</NavLink>
														</SidebarMenuButton>
														{hoveredProject === project.name && (
															<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-sidebar z-10">
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-6 w-6 hover:bg-primary hover:text-white transition-all duration-200"
																	onClick={(e) => {
																		e.preventDefault();
																		e.stopPropagation();
																		setProjectToEdit(project);
																		setIsProjectDialogOpen(true);
																	}}
																	title="Edit project"
																>
																	<Pencil className="h-3 w-3" />
																</Button>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-6 w-6 text-destructive hover:bg-destructive hover:text-white transition-all duration-200"
																	onClick={(e) => {
																		e.preventDefault();
																		e.stopPropagation();
																		setProjectToDelete(project);
																	}}
																	title="Delete project"
																>
																	<Trash2 className="h-3 w-3" />
																</Button>
															</div>
														)}
													</div>
												</SidebarMenuItem>
											))
										) : (
											// Admin or Digital Team-lead: Show grouped by department
											departmentGroups.map((departmentGroup) => (
												<Collapsible
													key={departmentGroup.id}
													open={expandedDepartments.has(departmentGroup.id)}
													onOpenChange={() => toggleDepartmentExpanded(departmentGroup.id)}
												>
													<SidebarMenuItem>
														<CollapsibleTrigger asChild>
															<SidebarMenuButton className="w-full">
																<div className="flex items-center gap-2 flex-1">
																	<FileCog className="h-4 w-4" />
																	<span className="text-sm font-medium">{departmentGroup.name}</span>
																	<span className="text-xs text-muted-foreground">({departmentGroup.projects.length})</span>
																</div>
																<ChevronRight
																	className={`h-4 w-4 transition-transform ${expandedDepartments.has(departmentGroup.id) ? "rotate-90" : ""
																		}`}
																/>
															</SidebarMenuButton>
														</CollapsibleTrigger>
														<CollapsibleContent>
															<SidebarMenuSub>
																{departmentGroup.projects.map((project) => (
																	<SidebarMenuSubItem
																		key={project.id}
																		onMouseEnter={() => setHoveredProject(project.name)}
																		onMouseLeave={() => setHoveredProject(null)}
																	>
																		<div className="relative group">
																			<SidebarMenuSubButton asChild>
																				<NavLink
																					to={`/project/${project.id}`}
																					className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent ${isProjectActive(project.id)
																						? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
																						: ""
																						}`}
																				>
																					<FolderKanban className="h-4 w-4" />
																					<span className="text-sm flex-1">{project.name}</span>
																				</NavLink>
																			</SidebarMenuSubButton>
																			{hoveredProject === project.name && (userRole === "admin" || userRole === "team-lead") && (
																				<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-sidebar z-10">
																					<Button
																						variant="ghost"
																						size="icon"
																						className="h-6 w-6 hover:bg-primary hover:text-white transition-all duration-200"
																						onClick={(e) => {
																							e.preventDefault();
																							e.stopPropagation();
																							setProjectToEdit(project);
																							setIsProjectDialogOpen(true);
																						}}
																						title="Edit project"
																					>
																						<Pencil className="h-3 w-3" />
																					</Button>
																					<Button
																						variant="ghost"
																						size="icon"
																						className="h-6 w-6 text-destructive hover:bg-destructive hover:text-white transition-all duration-200"
																						onClick={(e) => {
																							e.preventDefault();
																							e.stopPropagation();
																							setProjectToDelete(project);
																						}}
																						title="Delete project"
																					>
																						<Trash2 className="h-3 w-3" />
																					</Button>
																				</div>
																			)}
																		</div>
																	</SidebarMenuSubItem>
																))}
															</SidebarMenuSub>
														</CollapsibleContent>
													</SidebarMenuItem>
												</Collapsible>
											))
										)}
									</SidebarMenu>
								</SidebarGroupContent>
							</CollapsibleContent>
						</Collapsible>
					</SidebarGroup>
				)}

				{userRole === "user" && userAssignedProjects.length > 0 && (
					<SidebarGroup>
						<Collapsible open={assignedProjectsOpen} onOpenChange={setAssignedProjectsOpen}>
							<div className="flex items-center justify-between px-2">
								<CollapsibleTrigger className="flex flex-1 items-center justify-between py-1.5 text-sm font-medium hover:bg-sidebar-accent rounded-md transition-colors">
									<SidebarGroupLabel className="hover:bg-transparent">Assigned Projects</SidebarGroupLabel>
									<ChevronRight
										className={`h-4 w-4 transition-transform ${assignedProjectsOpen ? "rotate-90" : ""
											}`}
									/>
								</CollapsibleTrigger>
							</div>
							<CollapsibleContent>
								<SidebarGroupContent>
									<SidebarMenu>
										{userAssignedProjects.map((project) => (
											<Collapsible
												key={project.id}
												open={expandedProjects.has(project.id)}
												onOpenChange={() => toggleProjectExpanded(project.id)}
											>
												<SidebarMenuItem>
													<CollapsibleTrigger asChild>
														<SidebarMenuButton className="w-full">
															<div className="flex items-center gap-2 flex-1">
																<FolderKanban className="h-4 w-4" />
																<span className="text-sm">{project.name}</span>
															</div>
															<ChevronRight
																className={`h-4 w-4 transition-transform ${expandedProjects.has(project.id) ? "rotate-90" : ""
																	}`}
															/>
														</SidebarMenuButton>
													</CollapsibleTrigger>
													<CollapsibleContent>
														<SidebarMenuSub>
															{project.stages
																.map((stage) => (
																	<SidebarMenuSubItem key={stage.id}>
																		<SidebarMenuSubButton asChild>
																			<NavLink
																				to={`/user-project/${project.id}/stage/${stage.id}`}
																				className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent ${isStageActive(project.id, stage.id)
																					? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
																					: ""
																					}`}
																			>
																				<Layers className="h-3 w-3" />
																				<span className="text-sm">{stage.title}</span>
																			</NavLink>
																		</SidebarMenuSubButton>
																	</SidebarMenuSubItem>
																))}
														</SidebarMenuSub>
													</CollapsibleContent>
												</SidebarMenuItem>
											</Collapsible>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</CollapsibleContent>
						</Collapsible>
					</SidebarGroup>
				)}

				{userRole === "user" && userDepartmentProjects.length > 0 && (
					<SidebarGroup>
						<Collapsible open={departmentProjectsOpen} onOpenChange={setDepartmentProjectsOpen}>
							<div className="flex items-center justify-between px-2">
								<CollapsibleTrigger className="flex flex-1 items-center justify-between py-1.5 text-sm font-medium hover:bg-sidebar-accent rounded-md transition-colors">
									<SidebarGroupLabel className="hover:bg-transparent">
										{departments.find(d => d.id === currentUser?.department)?.name || 'Department'} Projects
									</SidebarGroupLabel>
									<ChevronRight
										className={`h-4 w-4 transition-transform ${departmentProjectsOpen ? "rotate-90" : ""
											}`}
									/>
								</CollapsibleTrigger>
							</div>
							<CollapsibleContent>
								<SidebarGroupContent>
									<SidebarMenu>
										{userDepartmentProjects.map((project) => (
											<SidebarMenuItem key={project.id}>
												<SidebarMenuButton asChild>
													<NavLink
														to={`/project/${project.id}`}
														className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent ${isProjectActive(project.id)
															? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
															: ""
															}`}
													>
														<FolderKanban className="h-4 w-4" />
														<span className="text-sm">{project.name}</span>
													</NavLink>
												</SidebarMenuButton>
											</SidebarMenuItem>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</CollapsibleContent>
						</Collapsible>
					</SidebarGroup>
				)}
			</SidebarContent>

			<ProjectDialog
				open={isProjectDialogOpen}
				onOpenChange={(open) => {
					setIsProjectDialogOpen(open);
					if (!open) setProjectToEdit(null);
				}}
				onSave={projectToEdit ? handleProjectUpdate : handleProjectSave}
				existingProjects={projects.map(p => p.name)}
				teamMembers={teamMembers}
				editProject={projectToEdit || undefined}
				departments={departments}
				currentUser={currentUser}
			/>

			<AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Project</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone and will also delete all tasks associated with this project.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleProjectDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Sidebar>
	);
}
