# Project Aura - Project Management Tool

## 1. Project Overview

Project Aura is a client-side project management application built with React and TypeScript. It provides a dynamic and interactive interface for managing projects, tasks, and teams. The application is currently designed to persist its state and data entirely within the browser's `localStorage`.

**This document outlines the requirements for a new backend API to replace the `localStorage` persistence, enabling a robust, multi-user, and scalable application.**

A key feature of this application is the "View as" functionality, which allows a user to switch between different user profiles (Admin, Team Lead, User) to see the application from their perspective. This will require proper user authentication and role-based authorization on the backend.

## 2. Backend API Requirements

The backend API should be RESTful, communicate using JSON, and utilize standard HTTP methods (GET, POST, PUT, DELETE).

### 2.1. Authentication & Authorization

- **Authentication**: Implement a secure authentication mechanism (e.g., JWT, OAuth) to manage user sessions.
- **Authorization**: Implement role-based access control (RBAC) for `admin`, `team-lead`, and `user` roles, ensuring users can only perform actions and access data permitted by their role.

### 2.2. Data Models (JSON Schemas for API)

These are the core data structures that the backend API needs to manage.

#### `Project`

Represents a project, which contains a list of stages.

```json
{
  "id": "string", // Unique identifier for the project (e.g., UUID)
  "name": "string",
  "description": "string",
  "createdAt": "string", // ISO 8601 date string
  "stages": [
    // Array of Stage objects (see Stage model below)
  ],
  "emails": ["string"], // Optional: Array of external email addresses
  "phoneNumbers": ["string"] // Optional: Array of phone numbers (e.g., for WhatsApp groups)
}
```

#### `Stage`

Represents a single column/stage in a Kanban board. The `type` can be `"project"` (for the main project board) or `"user"` (for a user's custom workflow).

```json
{
  "id": "string", // Unique identifier for the stage (e.g., UUID)
  "title": "string",
  "color": "string", // Tailwind CSS background color class (e.g., "bg-status-progress")
  "order": "number", // Order in which stages appear
  "type": "string", // "user" or "project"
  "mainResponsibleId": "string | null", // ID of the main responsible user (nullable)
  "backupResponsibleId1": "string | null", // ID of the first backup responsible user (nullable)
  "backupResponsibleId2": "string | null" // ID of the second backup responsible user (nullable)
}
```

#### `Task`

Represents a single task card.

```json
{
  "id": "string", // Unique identifier for the task (e.g., UUID)
  "title": "string",
  "description": "string",
  "project": "string", // The `id` of the project it belongs to
  "assignee": "string", // The `id` of the assigned user
  "dueDate": "string", // ISO 8601 date string
  "userStatus": "string", // "pending" | "in-progress" | "complete" - User's personal status for the task
  "projectStage": "string", // The `id` of the project stage it's in
  "priority": "string", // "low" | "medium" | "high"
  "createdAt": "string" // ISO 8601 date string
}
```

#### `User`

Represents a team member who can be assigned to tasks.

```json
{
  "id": "string", // Unique identifier for the user (e.g., UUID)
  "name": "string",
  "email": "string",
  "role": "string", // "user" | "team-lead" | "admin"
  "department": "string" // ID of the department
}
```

#### `Department`

Represents a department within the organization.

```json
{
  "id": "string", // Unique identifier for the department (e.g., UUID)
  "name": "string"
}
```

#### `HistoryEntry`

Represents an entry in the project history log.

```json
{
  "id": "string", // Unique identifier for the history entry
  "action": "string", // e.g., "CREATE_PROJECT", "UPDATE_TASK_STATUS", "DELETE_STAGE"
  "entityId": "string", // ID of the entity affected (e.g., project ID, task ID, stage ID)
  "entityType": "string", // "project", "task", "stage"
  "projectId": "string", // ID of the project this history entry belongs to
  "userId": "string", // ID of the user who performed the action
  "timestamp": "string", // ISO 8601 date string
  "details": "object" // JSON object containing specific details about the action (e.g., { from: "oldValue", to: "newValue" })
}
```

### 2.3. API Endpoints

#### Projects (`/api/projects`)

- `GET /api/projects`: Retrieve a list of all projects.
  - **Response**: `Array<Project>`
- `GET /api/projects/:id`: Retrieve a single project by its ID.
  - **Response**: `Project`
- `POST /api/projects`: Create a new project.
  - **Request Body**: `Project` (without `id`, `createdAt`)
  - **Response**: `Project` (with generated `id`, `createdAt`)
- `PUT /api/projects/:id`: Update an existing project.
  - **Request Body**: `Partial<Project>`
  - **Response**: `Project` (updated)
- `DELETE /api/projects/:id`: Delete a project.
  - **Response**: `204 No Content`

#### Stages (`/api/projects/:projectId/stages`)

- `GET /api/projects/:projectId/stages`: Retrieve all stages for a specific project.
  - **Response**: `Array<Stage>`
- `GET /api/projects/:projectId/stages/:stageId`: Retrieve a single stage by its ID within a project.
  - **Response**: `Stage`
- `POST /api/projects/:projectId/stages`: Create a new stage for a project.
  - **Request Body**: `Stage` (without `id`, `order`)
  - **Response**: `Stage` (with generated `id`, `order`)
- `PUT /api/projects/:projectId/stages/:stageId`: Update an existing stage within a project.
  - **Request Body**: `Partial<Stage>`
  - **Response**: `Stage` (updated)
- `DELETE /api/projects/:projectId/stages/:stageId`: Delete a stage from a project.
  - **Response**: `204 No Content`

#### Tasks (`/api/tasks`)

- `GET /api/tasks`: Retrieve a list of all tasks.
  - **Query Parameters**:
    - `projectId`: Filter tasks by project ID.
    - `assigneeId`: Filter tasks by assignee user ID.
    - `status`: Filter tasks by `userStatus` or `projectStage` (depending on context).
    - `search`: Full-text search on `title` and `description`.
  - **Response**: `Array<Task>`
- `GET /api/tasks/:id`: Retrieve a single task by its ID.
  - **Response**: `Task`
- `POST /api/tasks`: Create a new task.
  - **Request Body**: `Task` (without `id`, `createdAt`)
  - **Response**: `Task` (with generated `id`, `createdAt`)
- `PUT /api/tasks/:id`: Update an existing task.
  - **Request Body**: `Partial<Task>`
  - **Response**: `Task` (updated)
- `DELETE /api/tasks/:id`: Delete a task.
  - **Response**: `204 No Content`
- `PUT /api/tasks/:id/move`: Move a task between project stages (e.g., on Kanban board).
  - **Request Body**: `{ "newProjectStageId": "string" }`
  - **Logic**: Backend should update `projectStage`, clear `assignee`, and reset `userStatus` to `"pending"`.
  - **Response**: `Task` (updated)
- `PUT /api/tasks/:id/user-move`: Update a task's user-specific status or move to next project stage.
  - **Request Body**: `{ "newUserStatus": "string", "currentProjectStageId": "string", "projectId": "string" }`
  - **Logic**: If `newUserStatus` is "complete" and `currentProjectStageId` is not the last stage of the project, backend should update `projectStage` to the _next_ stage, clear `assignee`, and reset `userStatus` to `"pending"`. Otherwise, just update `userStatus`.
  - **Response**: `Task` (updated)

#### Users (`/api/users`)

- `GET /api/users`: Retrieve a list of all users (team members).
  - **Response**: `Array<User>`
- `GET /api/users/:id`: Retrieve a single user by ID.
  - **Response**: `User`
- `GET /api/users/me`: Retrieve details of the currently authenticated user.
  - **Response**: `User`
- `POST /api/users`: Create a new user. (Admin only)
  - **Request Body**: `User` (without `id`)
  - **Response**: `User` (with generated `id`)
- `PUT /api/users/:id`: Update an existing user. (Admin/Self-update)
  - **Request Body**: `Partial<User>`
  - **Response**: `User` (updated)
- `DELETE /api/users/:id`: Delete a user. (Admin only)
  - **Response**: `204 No Content`

#### Departments (`/api/departments`)

- `GET /api/departments`: Retrieve a list of all departments.
  - **Response**: `Array<Department>`
- `GET /api/departments/:id`: Retrieve a single department by ID.
  - **Response**: `Department`
- `POST /api/departments`: Create a new department. (Admin only)
  - **Request Body**: `Department` (without `id`)
  - **Response**: `Department` (with generated `id`)
- `PUT /api/departments/:id`: Update an existing department. (Admin only)
  - **Request Body**: `Partial<Department>`
  - **Response**: `Department` (updated)
- `DELETE /api/departments/:id`: Delete a department. (Admin only)
  - **Response**: `204 No Content`

#### History (`/api/history`)

- `GET /api/history/:projectId`: Retrieve history entries for a specific project.
  - **Response**: `Array<HistoryEntry>`
- `POST /api/history`: Log a new history entry.
  - **Request Body**: `HistoryEntry` (without `id`, `timestamp`)
  - **Response**: `HistoryEntry` (with generated `id`, `timestamp`)

### 2.4. Key Workflows & Business Logic (Backend Implications)

The backend needs to implement the following logic, currently handled by the frontend:

#### Task Stage Progression

- **Manual (Project Board - `/api/tasks/:id/move`):** When a task is moved between project stages, the backend must:
  1.  Update the task's `projectStage` to the new stage ID.
  2.  Clear the task's `assignee` field.
  3.  Reset the task's `userStatus` to `"pending"`.
  4.  Log a `HistoryEntry` for the stage change.
- **Automatic (User Workflow - `/api/tasks/:id/user-move`):** When a user completes a task in their personal workflow (moves it to their "Complete" column):
  1.  The backend should check if the `currentProjectStageId` is the _last_ stage of the associated project.
  2.  If it's _not_ the last stage:
      - Update the task's `projectStage` to the _next_ stage in the project's sequence.
      - Clear the task's `assignee` field.
      - Reset the task's `userStatus` to `"pending"`.
      - Log a `HistoryEntry` for the stage change.
  3.  If it _is_ the last stage, the task is considered fully complete within the project. The backend should update `userStatus` to `"complete"` and potentially mark the task as archived or fully done.
  4.  Log a `HistoryEntry` for the user's task completion.

#### User-Specific Custom Stages (`/api/users/:userId/project/:projectId/stage/:stageId/user-stages`)

- The frontend currently stores user-specific custom stages for a task within a project stage under `localStorage` key `taskflow_user_stages_{userId}_{projectName}_{stageId}`.
- The backend needs to provide endpoints to manage these user-specific stages. This could be a nested resource or a separate collection.
- `GET /api/users/:userId/project/:projectId/stage/:stageId/user-stages`: Retrieve user's custom stages for a specific project stage.
- `PUT /api/users/:userId/project/:projectId/stage/:stageId/user-stages`: Update user's custom stages.

#### Task Categorization for `/tasks` page

- The `/tasks` page implements a specific categorization logic to display tasks in three fixed Kanban stages: "Pending", "In Progress", and "Completed". The backend should ideally provide an endpoint that returns tasks already categorized according to these rules to simplify frontend logic and improve performance.
- **Endpoint**: `GET /api/tasks/categorized`
- **Logic**:
  1.  **"Pending"**: Tasks where `userStatus` is `"pending"`.
  2.  **"Completed"**: Tasks that are in the _last stage_ of their respective project.
  3.  **"In Progress"**: All other tasks.
- **Response**: An object with keys "pending", "in-progress", "complete", each containing an `Array<Task>`.

### 2.5. Error Handling

- The API should return appropriate HTTP status codes (e.g., 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error).
- Error responses should be in JSON format and provide clear, concise error messages.

### 2.6. Security Considerations

- Implement input validation and sanitization for all incoming API requests.
- Protect against common web vulnerabilities (e.g., XSS, CSRF, SQL Injection if using SQL database).
- Ensure proper authentication and authorization checks are performed on all endpoints.

## 3. Getting Started Locally

To run the project on your local machine, follow these steps.

**Prerequisites:**

- [Node.js & npm](https://github.com/nvm-sh/nvm#installing-and-updating)

**Setup:**

```sh
# Step 1: Clone the repository.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server.
npm run dev
```

The application will be available at `http://localhost:8080` (or another port if 8080 is in use).

## 4. Backend Integration Guide

This section provides comprehensive instructions for backend developers to connect their API to this frontend application.

### 4.1. Current State

The application currently uses **browser localStorage** for all data persistence. All CRUD operations are performed client-side using the following localStorage keys:

- `taskflow_projects` - All projects
- `taskflow_tasks` - All tasks
- `taskflow_team_members` - All users/team members
- `taskflow_departments` - All departments
- `taskflow_user_stages_{userId}_{projectName}_{stageId}` - User-specific custom stages
- `taskflow_current_user` - Currently logged-in user

### 4.2. Integration Strategy

#### Phase 1: API Setup

1. **Create a backend API** following the specifications in Section 2 above
2. **Set up CORS** to allow requests from `http://localhost:8080` (development) and your production domain
3. **Implement authentication** (JWT recommended) with the following endpoints:
   - `POST /api/auth/login` - User login
   - `POST /api/auth/logout` - User logout
   - `GET /api/auth/me` - Get current user
   - `POST /api/auth/refresh` - Refresh token

#### Phase 2: Frontend Configuration

1. **Create environment variables** in the frontend:

   ```bash
   # Create a .env file in the project root
   VITE_API_BASE_URL=http://localhost:3000/api
   VITE_ENABLE_API=true
   ```

2. **API Service Layer** - Create `src/services/api.ts`:

   ```typescript
   const API_BASE_URL =
     import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
   const USE_API = import.meta.env.VITE_ENABLE_API === "true";

   // Axios instance with interceptors
   import axios from "axios";

   export const api = axios.create({
     baseURL: API_BASE_URL,
     headers: {
       "Content-Type": "application/json",
     },
   });

   // Request interceptor to add auth token
   api.interceptors.request.use(
     (config) => {
       const token = localStorage.getItem("auth_token");
       if (token) {
         config.headers.Authorization = `Bearer ${token}`;
       }
       return config;
     },
     (error) => Promise.reject(error)
   );

   // Response interceptor for error handling
   api.interceptors.response.use(
     (response) => response,
     async (error) => {
       if (error.response?.status === 401) {
         // Handle token refresh or redirect to login
         localStorage.removeItem("auth_token");
         window.location.href = "/login";
       }
       return Promise.reject(error);
     }
   );
   ```

#### Phase 3: Data Migration

1. **Export existing localStorage data**:

   ```javascript
   // Run this in browser console to export current data
   const exportData = {
     projects: JSON.parse(localStorage.getItem("taskflow_projects") || "[]"),
     tasks: JSON.parse(localStorage.getItem("taskflow_tasks") || "[]"),
     users: JSON.parse(localStorage.getItem("taskflow_team_members") || "[]"),
     departments: JSON.parse(
       localStorage.getItem("taskflow_departments") || "[]"
     ),
   };
   console.log(JSON.stringify(exportData, null, 2));
   ```

2. **Import to backend database** using your backend's seeding/migration scripts

#### Phase 4: Replace localStorage with API Calls

Create service files for each entity:

**`src/services/projectService.ts`:**

```typescript
import { api } from "./api";
import { Project } from "@/types/project";

export const projectService = {
  getAll: async (): Promise<Project[]> => {
    const { data } = await api.get("/projects");
    return data;
  },

  getById: async (id: string): Promise<Project> => {
    const { data } = await api.get(`/projects/${id}`);
    return data;
  },

  create: async (
    project: Omit<Project, "id" | "createdAt">
  ): Promise<Project> => {
    const { data } = await api.post("/projects", project);
    return data;
  },

  update: async (id: string, updates: Partial<Project>): Promise<Project> => {
    const { data } = await api.put(`/projects/${id}`, updates);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },
};
```

**`src/services/taskService.ts`:**

```typescript
import { api } from "./api";
import { Task } from "@/types/task";

export const taskService = {
  getAll: async (filters?: {
    projectId?: string;
    assigneeId?: string;
    status?: string;
    search?: string;
  }): Promise<Task[]> => {
    const { data } = await api.get("/tasks", { params: filters });
    return data;
  },

  getById: async (id: string): Promise<Task> => {
    const { data } = await api.get(`/tasks/${id}`);
    return data;
  },

  create: async (task: Omit<Task, "id" | "createdAt">): Promise<Task> => {
    const { data } = await api.post("/tasks", task);
    return data;
  },

  update: async (id: string, updates: Partial<Task>): Promise<Task> => {
    const { data } = await api.put(`/tasks/${id}`, updates);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
  },

  moveToStage: async (id: string, newProjectStageId: string): Promise<Task> => {
    const { data } = await api.put(`/tasks/${id}/move`, { newProjectStageId });
    return data;
  },

  userMove: async (
    id: string,
    newUserStatus: string,
    currentProjectStageId: string,
    projectId: string
  ): Promise<Task> => {
    const { data } = await api.put(`/tasks/${id}/user-move`, {
      newUserStatus,
      currentProjectStageId,
      projectId,
    });
    return data;
  },
};
```

**`src/services/userService.ts`:**

```typescript
import { api } from "./api";
import { User } from "@/types/task";

export const userService = {
  getAll: async (): Promise<User[]> => {
    const { data } = await api.get("/users");
    return data;
  },

  getById: async (id: string): Promise<User> => {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },

  getCurrentUser: async (): Promise<User> => {
    const { data } = await api.get("/users/me");
    return data;
  },

  create: async (user: Omit<User, "id">): Promise<User> => {
    const { data } = await api.post("/users", user);
    return data;
  },

  update: async (id: string, updates: Partial<User>): Promise<User> => {
    const { data } = await api.put(`/users/${id}`, updates);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
```

### 4.3. Key Integration Points

#### Authentication Flow

1. **Login Page**: Create `src/pages/Login.tsx` with form to call `POST /api/auth/login`
2. **Store JWT**: Save token to localStorage as `auth_token`
3. **Protected Routes**: Wrap routes with authentication check
4. **Current User**: Load from `GET /api/auth/me` instead of localStorage

#### Real-time Updates (Optional)

For real-time collaboration, consider implementing:

- **WebSocket connection** for live task updates
- **Server-Sent Events (SSE)** for notifications
- **Polling** as a simpler alternative (refresh data every 30-60 seconds)

#### File Uploads (Future Enhancement)

If adding file attachments to tasks:

- `POST /api/tasks/:id/attachments` - Upload file
- `GET /api/tasks/:id/attachments` - List files
- `DELETE /api/tasks/:id/attachments/:fileId` - Delete file

### 4.4. Testing the Integration

1. **Start your backend server** (e.g., `http://localhost:3000`)
2. **Configure frontend** with `.env` file pointing to your API
3. **Test each endpoint** using the browser's Network tab
4. **Verify authentication** flow works correctly
5. **Check CORS headers** are properly set
6. **Test error handling** (network failures, 401s, 500s)

### 4.5. Backend Implementation Checklist

- [ ] Set up database (PostgreSQL, MongoDB, etc.)
- [ ] Implement authentication (JWT/OAuth)
- [ ] Create all data models/schemas
- [ ] Implement CRUD endpoints for:
  - [ ] Projects
  - [ ] Stages
  - [ ] Tasks
  - [ ] Users
  - [ ] Departments
  - [ ] History
- [ ] Implement business logic:
  - [ ] Task stage progression
  - [ ] Auto-assignment on stage change
  - [ ] User-specific custom stages
  - [ ] Task categorization
- [ ] Set up CORS for frontend domain
- [ ] Implement rate limiting
- [ ] Add request validation
- [ ] Set up logging and monitoring
- [ ] Write API documentation (Swagger/OpenAPI)
- [ ] Create database migrations
- [ ] Set up automated tests
- [ ] Deploy to staging environment

### 4.6. API Response Format

All API responses should follow this format:

**Success Response:**

```json
{
  "success": true,
  "data": {
    /* actual data */
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

### 4.7. Environment Variables

Backend should support these environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/project_aura
DATABASE_POOL_SIZE=10

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# Server
PORT=3000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:8080,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100
```

### 4.8. Database Schema Recommendations

**PostgreSQL Example:**

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'team-lead', 'admin')),
  department_id UUID REFERENCES departments(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Departments table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  department_id UUID REFERENCES departments(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Stages table
CREATE TABLE stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  color VARCHAR(50),
  "order" INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('user', 'project')),
  main_responsible_id UUID REFERENCES users(id),
  backup_responsible_id1 UUID REFERENCES users(id),
  backup_responsible_id2 UUID REFERENCES users(id),
  is_review_stage BOOLEAN DEFAULT FALSE,
  linked_review_stage_id UUID REFERENCES stages(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES users(id),
  due_date TIMESTAMP,
  user_status VARCHAR(50) CHECK (user_status IN ('pending', 'in-progress', 'complete')),
  project_stage_id UUID REFERENCES stages(id),
  priority VARCHAR(50) CHECK (priority IN ('low', 'medium', 'high')),
  tags TEXT[],
  is_in_specific_stage BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  revision_comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- History table
CREATE TABLE history_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- User custom stages (for personal workflows)
CREATE TABLE user_custom_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  custom_stages JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, project_id, stage_id)
);

-- Indexes for performance
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_stage ON tasks(project_stage_id);
CREATE INDEX idx_stages_project ON stages(project_id);
CREATE INDEX idx_history_project ON history_entries(project_id);
```

### 4.9. Support & Questions

For questions or issues during backend integration:

- Review the TypeScript types in `src/types/` for exact data structures
- Check the existing localStorage logic in components for business rules
- Refer to Section 2.4 for key workflows and business logic
- Test endpoints using the provided Postman collection (if available)

**Happy coding! 🚀**
