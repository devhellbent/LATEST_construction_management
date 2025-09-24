const request = require('supertest');
const app = require('../server');
const { User, Project, Task, Material, Issue } = require('../models');

describe('Authentication API', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Create a test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      role: 'PROJECT_MANAGER',
      password_hash: 'hashedpassword123',
      is_active: true
    });
  });

  afterAll(async () => {
    // Clean up test user
    if (testUser) {
      await testUser.destroy();
    }
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      authToken = response.body.token;
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });
  });
});

describe('Projects API', () => {
  let authToken;
  let testUser;
  let testProject;

  beforeAll(async () => {
    // Create test user and project
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      role: 'PROJECT_MANAGER',
      password_hash: 'hashedpassword123',
      is_active: true
    });

    testProject = await Project.create({
      name: 'Test Project',
      description: 'Test project description',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      budget: 100000,
      status: 'ACTIVE',
      owner_user_id: testUser.user_id
    });
  });

  afterAll(async () => {
    // Clean up
    if (testProject) await testProject.destroy();
    if (testUser) await testUser.destroy();
  });

  beforeEach(async () => {
    // Login to get token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    authToken = response.body.token;
  });

  describe('GET /api/projects', () => {
    it('should return projects list', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('projects');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter projects by status', async () => {
      const response = await request(app)
        .get('/api/projects?status=ACTIVE')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.projects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: 'ACTIVE' })
        ])
      );
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'New Test Project',
        description: 'New test project',
        start_date: '2024-02-01',
        end_date: '2024-11-30',
        budget: 50000,
        status: 'PLANNED'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('project');
      expect(response.body.project.name).toBe(projectData.name);

      // Clean up
      await Project.destroy({ where: { project_id: response.body.project.project_id } });
    });

    it('should reject project with invalid data', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Invalid empty name
          budget: -1000 // Invalid negative budget
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project details', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject.project_id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('project');
      expect(response.body.project.project_id).toBe(testProject.project_id);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project', async () => {
      const updateData = {
        name: 'Updated Test Project',
        status: 'COMPLETED'
      };

      const response = await request(app)
        .put(`/api/projects/${testProject.project_id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.project.name).toBe(updateData.name);
      expect(response.body.project.status).toBe(updateData.status);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project', async () => {
      // Create a project to delete
      const projectToDelete = await Project.create({
        name: 'Project to Delete',
        description: 'This project will be deleted',
        owner_user_id: testUser.user_id
      });

      const response = await request(app)
        .delete(`/api/projects/${projectToDelete.project_id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });
});

describe('Tasks API', () => {
  let authToken;
  let testUser;
  let testProject;
  let testTask;

  beforeAll(async () => {
    // Create test data
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      role: 'PROJECT_MANAGER',
      password_hash: 'hashedpassword123',
      is_active: true
    });

    testProject = await Project.create({
      name: 'Test Project',
      description: 'Test project description',
      owner_user_id: testUser.user_id
    });

    testTask = await Task.create({
      project_id: testProject.project_id,
      title: 'Test Task',
      description: 'Test task description',
      assigned_user_id: testUser.user_id,
      status: 'TODO',
      priority: 'MEDIUM'
    });
  });

  afterAll(async () => {
    // Clean up
    if (testTask) await testTask.destroy();
    if (testProject) await testProject.destroy();
    if (testUser) await testUser.destroy();
  });

  beforeEach(async () => {
    // Login to get token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    authToken = response.body.token;
  });

  describe('GET /api/tasks', () => {
    it('should return tasks list', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tasks');
    });

    it('should filter tasks by project', async () => {
      const response = await request(app)
        .get(`/api/tasks?project_id=${testProject.project_id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tasks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ project_id: testProject.project_id })
        ])
      );
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const taskData = {
        project_id: testProject.project_id,
        title: 'New Test Task',
        description: 'New test task description',
        assigned_user_id: testUser.user_id,
        priority: 'HIGH'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('task');
      expect(response.body.task.title).toBe(taskData.title);

      // Clean up
      await Task.destroy({ where: { task_id: response.body.task.task_id } });
    });
  });

  describe('PATCH /api/tasks/:id/status', () => {
    it('should update task status', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${testTask.task_id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'IN_PROGRESS' });

      expect(response.status).toBe(200);
      expect(response.body.task.status).toBe('IN_PROGRESS');
    });
  });
});

describe('Materials API', () => {
  let authToken;
  let testUser;
  let testMaterial;

  beforeAll(async () => {
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      role: 'PROJECT_MANAGER',
      password_hash: 'hashedpassword123',
      is_active: true
    });

    testMaterial = await Material.create({
      name: 'Test Cement',
      type: 'Construction Material',
      unit: 'bags',
      cost_per_unit: 8.50,
      supplier: 'Test Supplier',
      stock_qty: 100
    });
  });

  afterAll(async () => {
    if (testMaterial) await testMaterial.destroy();
    if (testUser) await testUser.destroy();
  });

  beforeEach(async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    authToken = response.body.token;
  });

  describe('GET /api/materials', () => {
    it('should return materials list', async () => {
      const response = await request(app)
        .get('/api/materials')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('materials');
    });
  });

  describe('POST /api/materials', () => {
    it('should create a new material', async () => {
      const materialData = {
        name: 'Test Steel',
        type: 'Structural Material',
        unit: 'tons',
        cost_per_unit: 650.00,
        supplier: 'Steel Works Ltd.',
        stock_qty: 50
      };

      const response = await request(app)
        .post('/api/materials')
        .set('Authorization', `Bearer ${authToken}`)
        .send(materialData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('material');
      expect(response.body.material.name).toBe(materialData.name);

      // Clean up
      await Material.destroy({ where: { material_id: response.body.material.material_id } });
    });
  });
});

describe('Issues API', () => {
  let authToken;
  let testUser;
  let testProject;
  let testIssue;

  beforeAll(async () => {
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      role: 'PROJECT_MANAGER',
      password_hash: 'hashedpassword123',
      is_active: true
    });

    testProject = await Project.create({
      name: 'Test Project',
      description: 'Test project description',
      owner_user_id: testUser.user_id
    });

    testIssue = await Issue.create({
      project_id: testProject.project_id,
      raised_by_user_id: testUser.user_id,
      description: 'Test issue description',
      priority: 'MEDIUM',
      status: 'OPEN'
    });
  });

  afterAll(async () => {
    if (testIssue) await testIssue.destroy();
    if (testProject) await testProject.destroy();
    if (testUser) await testUser.destroy();
  });

  beforeEach(async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    authToken = response.body.token;
  });

  describe('GET /api/issues', () => {
    it('should return issues list', async () => {
      const response = await request(app)
        .get('/api/issues')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('issues');
    });
  });

  describe('POST /api/issues', () => {
    it('should create a new issue', async () => {
      const issueData = {
        project_id: testProject.project_id,
        description: 'New test issue description',
        priority: 'HIGH'
      };

      const response = await request(app)
        .post('/api/issues')
        .set('Authorization', `Bearer ${authToken}`)
        .send(issueData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('issue');
      expect(response.body.issue.description).toBe(issueData.description);

      // Clean up
      await Issue.destroy({ where: { issue_id: response.body.issue.issue_id } });
    });
  });
});

describe('Error Handling', () => {
  it('should handle 404 errors', async () => {
    const response = await request(app)
      .get('/api/nonexistent-endpoint');

    expect(response.status).toBe(404);
  });

  it('should handle unauthorized access', async () => {
    const response = await request(app)
      .get('/api/projects');

    expect(response.status).toBe(401);
  });
});
