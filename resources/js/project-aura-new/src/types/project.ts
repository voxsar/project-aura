import { Department } from "./department";
import { Stage } from "./stage";

export interface Project {
  name: string;
  description: string;
  createdAt: string;
  stages: Stage[];
  department?: Department;
  emails?: string[];
  phoneNumbers?: string[];
}
