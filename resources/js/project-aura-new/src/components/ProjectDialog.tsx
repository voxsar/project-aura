import { useState, useEffect } from "react";
import { z } from "zod";
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
import { useToast } from "@/hooks/use-toast";
import { Stage } from "@/types/stage";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { User } from "@/types/task";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { TagInput } from "./ui/TagInput";
import { MultiSelect } from "./ui/multi-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Department } from "@/types/department";
import { Project } from "@/types/project";

const projectSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, { message: "Project name is required" })
		.max(50, { message: "Project name must be less than 50 characters" })
		.regex(/^[a-zA-Z0-9\s-]+$/, {
			message: "Project name can only contain letters, numbers, spaces, and hyphens",
		}),
	description: z
		.string()
		.trim()
		.max(200, { message: "Description must be less than 200 characters" })
		.optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

const colorOptions = [
	{ value: "bg-status-todo", label: "Gray", class: "bg-status-todo" },
	{ value: "bg-status-progress", label: "Blue", class: "bg-status-progress" },
	{ value: "bg-status-done", label: "Green", class: "bg-status-done" },
	{ value: "bg-status-overdue", label: "Red", class: "bg-status-overdue" },
	{ value: "bg-priority-high", label: "Orange", class: "bg-priority-high" },
	{ value: "bg-primary", label: "Purple", class: "bg-primary" },
	{ value: "bg-accent", label: "Accent", class: "bg-accent" },
	{ value: "bg-yellow-500", label: "Yellow", class: "bg-yellow-500" },
	{ value: "bg-pink-500", label: "Pink", class: "bg-pink-500" },
	{ value: "bg-cyan-500", label: "Cyan", class: "bg-cyan-500" },
];



interface ProjectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (
		name: string,
		description: string,
		stages: Stage[],
		emails: string[],
		phoneNumbers: string[],
		department?: Department
	) => void;
	existingProjects: string[];
	teamMembers: User[];
	editProject?: Project;
	departments: Department[];
	currentUser?: User | null;
}

export function ProjectDialog({
	open,
	onOpenChange,
	onSave,
	existingProjects,
	teamMembers,
	editProject,
	departments,
	currentUser,
}: ProjectDialogProps) {
	const { toast } = useToast();
	const [formData, setFormData] = useState<ProjectFormData>({
		name: "",
		description: "",
	});
	const [stages, setStages] = useState<Stage[]>([]);
	const [emails, setEmails] = useState<string[]>([]);
	const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
	const [department, setDepartment] = useState<Department | undefined>();
	const [phoneNumbersOptions, setPhoneNumbersOptions] = useState<{ value: string, label: string }[]>([]);
	const [errors, setErrors] = useState<
		Partial<Record<keyof ProjectFormData, string>>
	>({});

	useEffect(() => {
		if (open) {
			fetch('https://automation.artslabcreatives.com/webhook/af66e522-e04f-478d-aa0b-6c7b408c8fc6')
				.then(async response => {
					const text = await response.text();
					if (!text) return [];
					try {
						const data = JSON.parse(text);
						return Array.isArray(data) ? data : [];
					} catch (e) {
						console.error('Error parsing phone numbers JSON:', e);
						return [];
					}
				})
				.then(data => {
					const options = (data || []).map((item: { id: string, name: string }) => ({
						value: item.id,
						label: item.name,
					}));
					setPhoneNumbersOptions(options);
				})
				.catch(error => {
					console.error('Error fetching phone numbers:', error);
				});

			// Populate form if editing
			if (editProject) {
				setFormData({
					name: editProject.name,
					description: editProject.description || "",
				});
				setStages(editProject.stages || []);
				setEmails(editProject.emails || []);
				setPhoneNumbers(editProject.phoneNumbers || []);
				setDepartment(editProject.department);
			} else {
				// For new project, auto-select department for team-lead
				if (currentUser?.role === "team-lead") {
					const userDepartment = departments.find(
						dept => dept.id === currentUser.department
					);
					setDepartment(userDepartment);
				}
			}
		} else {
			setFormData({ name: "", description: "" });
			setStages([]);
			setErrors({});
			setEmails([]);
			setPhoneNumbers([]);
			setDepartment(undefined);
		}
	}, [open, editProject, currentUser, departments]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setErrors({});

		const result = projectSchema.safeParse(formData);

		if (!result.success) {
			const fieldErrors: Partial<Record<keyof ProjectFormData, string>> = {};
			result.error.errors.forEach((err) => {
				if (err.path[0]) {
					fieldErrors[err.path[0] as keyof ProjectFormData] = err.message;
				}
			});
			setErrors(fieldErrors);
			return;
		}

		if (existingProjects.some(p => p.toLowerCase() === result.data.name.toLowerCase() && (!editProject || p !== editProject.name))) {
			setErrors({ name: "A project with this name already exists" });
			return;
		}

		if (stages.length === 0) {
			toast({
				title: "Validation Error",
				description: "Please add at least one stage to the project",
				variant: "destructive",
			});
			return;
		}

		const stageTitles = stages.map(s => s.title.toLowerCase());
		const hasDuplicates = stageTitles.some((title, index) => stageTitles.indexOf(title) !== index);
		if (hasDuplicates) {
			toast({
				title: "Validation Error",
				description: "Stage names must be unique",
				variant: "destructive",
			});
			return;
		}

		onSave(result.data.name, result.data.description || "", stages, emails, phoneNumbers, department);
		onOpenChange(false);
	};

	const addStage = () => {
		const newStage: Stage = {
			id: `stage-${Date.now()}`,
			title: "",
			color: "bg-status-todo",
			order: stages.length,
			type: "project",
			mainResponsibleId: undefined,
			backupResponsibleId1: undefined,

			backupResponsibleId2: undefined,
			isReviewStage: false,
		};
		setStages([...stages, newStage]);
	};

	const updateStage = <K extends keyof Stage>(index: number, field: K, value: Stage[K]) => {
		const updatedStages = [...stages];
		updatedStages[index] = { ...updatedStages[index], [field]: value };
		setStages(updatedStages);
	};

	const removeStage = (index: number) => {
		setStages(stages.filter((_, i) => i !== index));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{editProject ? "Edit Project" : "Create New Project"}</DialogTitle>
						<DialogDescription>
							{editProject ? "Update project details and workflow stages." : "Add a new project with custom workflow stages."}
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">
								Project Name <span className="text-destructive">*</span>
							</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								placeholder="Enter project name"
								maxLength={50}
								className={errors.name ? "border-destructive" : ""}
								disabled={!!editProject}
							/>
							{errors.name && (
								<p className="text-sm text-destructive">{errors.name}</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="description">Description (Optional)</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
								placeholder="Enter project description"
								rows={3}
								maxLength={200}
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="emails">External Emails</Label>
							<TagInput
								value={emails}
								onChange={setEmails}
								placeholder="Add emails and press Enter..."
								validate={(email) => /^\S+@\S+\.\S+$/.test(email)}
								validationMessage="Please enter a valid email address."
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="phoneNumbers">WhatsApp Group's</Label>
							<MultiSelect
								options={phoneNumbersOptions}
								value={phoneNumbers}
								onValueChange={setPhoneNumbers}
								placeholder="Select numbers..."
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="department">Department</Label>
							<Select
								value={department?.id}
								onValueChange={(value) => {
									const selectedDept = departments.find(
										(dept) => dept.id === value
									);
									setDepartment(selectedDept);
								}}
								disabled={currentUser?.role === "team-lead" && departments.find(d => d.id === currentUser.department)?.name.toLowerCase() !== "digital"}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select a department" />
								</SelectTrigger>
								<SelectContent>
									{currentUser?.role === "team-lead" && departments.find(d => d.id === currentUser.department)?.name.toLowerCase() === "digital" ? (
										// Digital team-leads can choose between Digital and Design
										departments
											.filter(dept => dept.name.toLowerCase() === "digital" || dept.name.toLowerCase() === "design")
											.map((dept) => (
												<SelectItem key={dept.id} value={dept.id}>
													{dept.name}
												</SelectItem>
											))
									) : (
										// Other users see all departments
										departments.map((dept) => (
											<SelectItem key={dept.id} value={dept.id}>
												{dept.name}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
							{currentUser?.role === "team-lead" && departments.find(d => d.id === currentUser.department)?.name.toLowerCase() !== "digital" && (
								<p className="text-xs text-muted-foreground">
									Projects will be created in your department
								</p>
							)}
							{currentUser?.role === "team-lead" && departments.find(d => d.id === currentUser.department)?.name.toLowerCase() === "digital" && (
								<p className="text-xs text-muted-foreground">
									You can create projects in Digital or Design department
								</p>
							)}
						</div>

						<div className="grid gap-3">
							<div className="flex items-center justify-between">
								<Label>
									Workflow Stages <span className="text-destructive">*</span>
								</Label>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addStage}
									className="gap-2"
								>
									<Plus className="h-4 w-4" />
									Add Stage
								</Button>
							</div>

							{stages.length === 0 ? (
								<div className="text-center py-6 border-2 border-dashed rounded-lg">
									<p className="text-sm text-muted-foreground">
										No stages yet. Click "Add Stage" to create your workflow.
									</p>
								</div>
							) : (
								<div className="space-y-2">
									{stages.map((stage, index) => (
										<div
											key={stage.id}
											className="flex flex-col gap-2 p-3 border rounded-lg bg-card"
										>
											<div className="flex items-center gap-2">
												<GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
												<Input
													value={stage.title}
													onChange={(e) => updateStage(index, "title", e.target.value)}
													placeholder="Stage name"
													className="flex-1"
													maxLength={30}
													disabled={false}
												/>
												<Select
													value={stage.color}
													onValueChange={(value) => updateStage(index, "color", value)}
													disabled={false}
												>
													<SelectTrigger className="w-[140px]">
														<SelectValue>
															<div className="flex items-center gap-2">
																<div className={cn("h-3 w-3 rounded-full", stage.color)} />
																<span className="text-sm">
																	{colorOptions.find(c => c.value === stage.color)?.label}
																</span>
															</div>
														</SelectValue>
													</SelectTrigger>
													<SelectContent>
														{colorOptions.map((option) => (
															<SelectItem key={option.value} value={option.value}>
																<div className="flex items-center gap-2">
																	<div className={cn("h-3 w-3 rounded-full", option.class)} />
																	<span>{option.label}</span>
																</div>
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => removeStage(index)}
													className="text-destructive hover:text-destructive flex-shrink-0"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>

											<div className="flex items-center gap-2 ml-6">
												<Checkbox
													id={`review-stage-${stage.id}`}
													checked={stage.isReviewStage}
													onCheckedChange={(checked) => updateStage(index, "isReviewStage", checked === true)}
													disabled={false}
												/>
												<Label
													htmlFor={`review-stage-${stage.id}`}
													className="text-xs font-normal cursor-pointer"
												>
													Mark as Review Stage
												</Label>
											</div>

											{/* Stage Transition Configuration */}
											<div className="mt-3 ml-6">
												{stage.isReviewStage ? (
													<div className="grid gap-1.5">
														<Label className="text-xs">After approval, move task to:</Label>
														<Select
															value={stage.approvedTargetStageId || ""}
															onValueChange={(value) => updateStage(index, "approvedTargetStageId", value)}
															disabled={false}
														>
															<SelectTrigger className="h-8">
																<SelectValue placeholder="Select target stage" />
															</SelectTrigger>
															<SelectContent>
																{stages
																	.filter((s) => s.id !== stage.id)
																	.map((s) => (
																		<SelectItem key={s.id} value={s.id}>
																			{s.title || "Untitled Stage"}
																		</SelectItem>
																	))}
															</SelectContent>
														</Select>
													</div>
												) : (
													<div className="grid gap-1.5">
														<Label className="text-xs">Linked Review Stage (Optional):</Label>
														<Select
															value={stage.linkedReviewStageId || "none"}
															onValueChange={(value) => updateStage(index, "linkedReviewStageId", value === "none" ? undefined : value)}
															disabled={false}
														>
															<SelectTrigger className="h-8">
																<SelectValue placeholder="Select review stage" />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="none">None (Go to next stage)</SelectItem>
																{stages
																	.filter((s) => s.isReviewStage && s.id !== stage.id)
																	.map((s) => (
																		<SelectItem key={s.id} value={s.id}>
																			{s.title || "Untitled Stage"}
																		</SelectItem>
																	))}
															</SelectContent>
														</Select>
													</div>
												)}
											</div>


											<div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
												<div>
													<Label htmlFor={`main-responsible-${stage.id}`} className="text-xs">Main Responsible</Label>
													<Select
														value={stage.mainResponsibleId || ""}
														onValueChange={(value) => updateStage(index, "mainResponsibleId", value)}
													>
														<SelectTrigger id={`main-responsible-${stage.id}`}>
															<SelectValue placeholder="Select main" />
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
												<div>
													<Label htmlFor={`backup1-responsible-${stage.id}`} className="text-xs">Backup Responsible 1</Label>
													<Select
														value={stage.backupResponsibleId1 || ""}
														onValueChange={(value) => updateStage(index, "backupResponsibleId1", value)}
													>
														<SelectTrigger id={`backup1-responsible-${stage.id}`}>
															<SelectValue placeholder="Select backup 1" />
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
												<div>
													<Label htmlFor={`backup2-responsible-${stage.id}`} className="text-xs">Backup Responsible 2</Label>
													<Select
														value={stage.backupResponsibleId2 || ""}
														onValueChange={(value) => updateStage(index, "backupResponsibleId2", value)}
													>
														<SelectTrigger id={`backup2-responsible-${stage.id}`}>
															<SelectValue placeholder="Select backup 2" />
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
										</div>
									))}
								</div>
							)}
							<p className="text-xs text-muted-foreground">
								Create workflow stages in the order you want them to appear
							</p>
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
						<Button type="submit">{editProject ? "Update Project" : "Create Project"}</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
