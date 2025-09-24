const { User, Project, Task, Material, Labour, Issue, PettyCashExpense, Document } = require('../models');
const bcrypt = require('bcryptjs');

const seedData = async () => {
  try {
    console.log('Starting seed data creation...');

    // Create users
    const users = await User.bulkCreate([
      {
        name: 'John Doe',
        email: 'john.doe@constructease.com',
        role: 'OWNER',
        contact_info: '+1-555-0101',
        password_hash: await bcrypt.hash('password123', 12),
        is_active: true
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@constructease.com',
        role: 'PROJECT_MANAGER',
        contact_info: '+1-555-0102',
        password_hash: await bcrypt.hash('password123', 12),
        is_active: true
      },
      {
        name: 'Mike Johnson',
        email: 'mike.johnson@constructease.com',
        role: 'SITE_ENGINEER',
        contact_info: '+1-555-0103',
        password_hash: await bcrypt.hash('password123', 12),
        is_active: true
      },
      {
        name: 'Sarah Wilson',
        email: 'sarah.wilson@constructease.com',
        role: 'CONTRACTOR',
        contact_info: '+1-555-0104',
        password_hash: await bcrypt.hash('password123', 12),
        is_active: true
      },
      {
        name: 'David Brown',
        email: 'david.brown@constructease.com',
        role: 'VIEWER',
        contact_info: '+1-555-0105',
        password_hash: await bcrypt.hash('password123', 12),
        is_active: true
      }
    ]);

    console.log('Users created:', users.length);

    // Create projects
    const projects = await Project.bulkCreate([
      {
        name: 'City Mall Development',
        description: 'Construction of a modern shopping mall in downtown area',
        start_date: '2024-01-15',
        end_date: '2024-12-31',
        budget: 5000000.00,
        status: 'ACTIVE',
        owner_user_id: users[0].user_id
      },
      {
        name: 'Horizon Towers Construction',
        description: 'Residential apartment complex with 20 floors',
        start_date: '2024-02-01',
        end_date: '2025-06-30',
        budget: 8000000.00,
        status: 'ACTIVE',
        owner_user_id: users[0].user_id
      },
      {
        name: 'Metro Station Renovation',
        description: 'Renovation and modernization of existing metro station',
        start_date: '2024-03-01',
        end_date: '2024-11-30',
        budget: 2000000.00,
        status: 'ACTIVE',
        owner_user_id: users[1].user_id
      },
      {
        name: 'Business Park Expansion',
        description: 'Expansion of existing business park with new office buildings',
        start_date: '2024-04-01',
        end_date: '2025-03-31',
        budget: 6000000.00,
        status: 'PLANNED',
        owner_user_id: users[1].user_id
      },
      {
        name: 'Green Heights Residential Complex',
        description: 'Eco-friendly residential complex with sustainable features',
        start_date: '2024-05-01',
        end_date: '2025-08-31',
        budget: 4000000.00,
        status: 'PLANNED',
        owner_user_id: users[0].user_id
      }
    ]);

    console.log('Projects created:', projects.length);

    // Create tasks
    const tasks = await Task.bulkCreate([
      {
        project_id: projects[0].project_id,
        title: 'Foundation Work',
        description: 'Excavation and foundation laying for the mall',
        assigned_user_id: users[2].user_id,
        start_date: '2024-01-15',
        end_date: '2024-03-15',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        milestone: true
      },
      {
        project_id: projects[0].project_id,
        title: 'Structural Framework',
        description: 'Steel framework construction for the mall',
        assigned_user_id: users[3].user_id,
        start_date: '2024-03-16',
        end_date: '2024-07-31',
        status: 'TODO',
        priority: 'HIGH',
        milestone: true
      },
      {
        project_id: projects[1].project_id,
        title: 'Site Preparation',
        description: 'Clearing and preparation of construction site',
        assigned_user_id: users[2].user_id,
        start_date: '2024-02-01',
        end_date: '2024-03-01',
        status: 'DONE',
        priority: 'MEDIUM',
        milestone: false
      },
      {
        project_id: projects[1].project_id,
        title: 'Foundation and Basement',
        description: 'Foundation work and basement construction',
        assigned_user_id: users[3].user_id,
        start_date: '2024-03-02',
        end_date: '2024-06-30',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        milestone: true
      },
      {
        project_id: projects[2].project_id,
        title: 'Design Review',
        description: 'Review and approval of renovation designs',
        assigned_user_id: users[2].user_id,
        start_date: '2024-03-01',
        end_date: '2024-04-15',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        milestone: false
      }
    ]);

    console.log('Tasks created:', tasks.length);

    // Create materials
    const materials = await Material.bulkCreate([
      {
        name: 'Cement',
        type: 'Construction Material',
        unit: 'bags',
        cost_per_unit: 8.50,
        supplier: 'ABC Cement Co.',
        stock_qty: 1000
      },
      {
        name: 'Steel Rods',
        type: 'Structural Material',
        unit: 'tons',
        cost_per_unit: 650.00,
        supplier: 'Steel Works Ltd.',
        stock_qty: 50
      },
      {
        name: 'Sand',
        type: 'Construction Material',
        unit: 'cubic meters',
        cost_per_unit: 25.00,
        supplier: 'River Sand Co.',
        stock_qty: 200
      },
      {
        name: 'Bricks',
        type: 'Construction Material',
        unit: 'pieces',
        cost_per_unit: 0.35,
        supplier: 'Brick Manufacturing Co.',
        stock_qty: 10000
      },
      {
        name: 'Paint',
        type: 'Finishing Material',
        unit: 'gallons',
        cost_per_unit: 45.00,
        supplier: 'Paint Solutions Inc.',
        stock_qty: 100
      }
    ]);

    console.log('Materials created:', materials.length);

    // Create labours
    const labours = await Labour.bulkCreate([
      {
        name: 'Ahmed Hassan',
        skill: 'Mason',
        wage_rate: 25.00,
        contact: '+1-555-0201'
      },
      {
        name: 'Carlos Rodriguez',
        skill: 'Carpenter',
        wage_rate: 30.00,
        contact: '+1-555-0202'
      },
      {
        name: 'James Wilson',
        skill: 'Electrician',
        wage_rate: 35.00,
        contact: '+1-555-0203'
      },
      {
        name: 'Maria Garcia',
        skill: 'Plumber',
        wage_rate: 32.00,
        contact: '+1-555-0204'
      },
      {
        name: 'Robert Taylor',
        skill: 'Heavy Equipment Operator',
        wage_rate: 40.00,
        contact: '+1-555-0205'
      }
    ]);

    console.log('Labours created:', labours.length);

    // Create issues
    const issues = await Issue.bulkCreate([
      {
        project_id: projects[0].project_id,
        raised_by_user_id: users[2].user_id,
        assigned_to_user_id: users[1].user_id,
        description: 'Heavy rainfall causing delays in foundation work. Need to implement proper drainage system.',
        priority: 'HIGH',
        status: 'OPEN'
      },
      {
        project_id: projects[1].project_id,
        raised_by_user_id: users[3].user_id,
        assigned_to_user_id: users[2].user_id,
        description: 'Steel delivery delayed by 2 weeks. Need to adjust construction schedule.',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS'
      },
      {
        project_id: projects[2].project_id,
        raised_by_user_id: users[2].user_id,
        description: 'Permit approval taking longer than expected. May need to expedite the process.',
        priority: 'MEDIUM',
        status: 'OPEN'
      }
    ]);

    console.log('Issues created:', issues.length);

    // Create petty cash expenses
    const expenses = await PettyCashExpense.bulkCreate([
      {
        project_id: projects[0].project_id,
        category: 'Tools',
        amount: 150.00,
        date: '2024-01-20',
        description: 'Purchase of safety equipment',
        approved_by_user_id: users[1].user_id
      },
      {
        project_id: projects[0].project_id,
        category: 'Transportation',
        amount: 75.00,
        date: '2024-01-22',
        description: 'Fuel for construction vehicles',
        approved_by_user_id: users[1].user_id
      },
      {
        project_id: projects[1].project_id,
        category: 'Supplies',
        amount: 200.00,
        date: '2024-02-05',
        description: 'Office supplies for site office',
        approved_by_user_id: users[0].user_id
      }
    ]);

    console.log('Expenses created:', expenses.length);

    console.log('Seed data creation completed successfully!');
    console.log('\nTest User Credentials:');
    console.log('Owner: john.doe@constructease.com / password123');
    console.log('Project Manager: jane.smith@constructease.com / password123');
    console.log('Site Engineer: mike.johnson@constructease.com / password123');
    console.log('Contractor: sarah.wilson@constructease.com / password123');
    console.log('Viewer: david.brown@constructease.com / password123');

  } catch (error) {
    console.error('Error creating seed data:', error);
    throw error;
  }
};

module.exports = { seedData };
