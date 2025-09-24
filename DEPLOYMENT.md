# Construction Management System - Deployment Guide

## Prerequisites

Before deploying the Construction Management System, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **MySQL** (v8.0 or higher)
- **Git**

## Database Setup

### 1. Create Database

Connect to your MySQL server and create the database:

```sql
CREATE DATABASE cmsdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Create User (Optional)

If you want to create a dedicated user for the application:

```sql
CREATE USER 'cmsdbadmin'@'%' IDENTIFIED BY 'nUUBQ6fnEUuiIoDTLXO2';
GRANT ALL PRIVILEGES ON cmsdb.* TO 'cmsdbadmin'@'%';
FLUSH PRIVILEGES;
```

### 3. Run Database Migrations

```bash
cd backend
npm run migrate
```

### 4. Seed Initial Data

```bash
cd backend
npm run seed
```

## Environment Configuration

### Backend Environment (.env)

Create `backend/.env` with the following configuration:

```env
# Database Configuration
DB_HOST=89.116.34.49
DB_NAME=cmsdb
DB_USER=cmsdbadmin
DB_PASSWORD=nUUBQ6fnEUuiIoDTLXO2
DB_DIALECT=mysql

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=production

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Socket.io Configuration
SOCKET_CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Environment (.env)

Create `frontend/.env` with the following configuration:

```env
# API Configuration
REACT_APP_API_URL=https://your-api-domain.com
REACT_APP_SOCKET_URL=https://your-api-domain.com
```

## Installation & Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd construction-management-system
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Run Setup Script

```bash
# Make setup script executable (Linux/Mac)
chmod +x setup.sh
./setup.sh

# Or run manually (Windows)
npm run install:all
```

## Development

### Start Development Servers

```bash
# Start both backend and frontend
npm run dev

# Or start individually
npm run backend:dev  # Backend only
npm run frontend:dev # Frontend only
```

### Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/health

## Production Deployment

### 1. Build Frontend

```bash
cd frontend
npm run build
```

### 2. Configure Production Environment

Update environment variables for production:

- Set `NODE_ENV=production`
- Update database credentials
- Set proper CORS origins
- Configure SSL certificates

### 3. Start Production Server

```bash
cd backend
npm start
```

### 4. Serve Frontend

You can serve the built frontend using:

- **Nginx** (recommended)
- **Apache**
- **Node.js static server**
- **CDN**

#### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Frontend
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Docker Deployment (Optional)

### 1. Create Dockerfile for Backend

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

### 2. Create Dockerfile for Frontend

```dockerfile
FROM node:16-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Docker Compose

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: cmsdb
      MYSQL_USER: cmsdbadmin
      MYSQL_PASSWORD: nUUBQ6fnEUuiIoDTLXO2
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      DB_HOST: mysql
      DB_NAME: cmsdb
      DB_USER: cmsdbadmin
      DB_PASSWORD: nUUBQ6fnEUuiIoDTLXO2
    depends_on:
      - mysql

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mysql_data:
```

## Testing

### Run Tests

```bash
cd backend
npm test
```

### Test Coverage

```bash
cd backend
npm run test:coverage
```

## Monitoring & Logging

### 1. Application Logs

The application logs to console. For production, consider using:

- **Winston** for structured logging
- **PM2** for process management
- **ELK Stack** for log aggregation

### 2. Health Checks

Monitor application health at:
- `GET /health` - Basic health check
- `GET /api/projects` - API availability

### 3. Database Monitoring

Monitor MySQL performance and connections:
- Use MySQL Workbench or similar tools
- Set up database backups
- Monitor slow queries

## Security Considerations

### 1. Environment Variables

- Never commit `.env` files
- Use strong, unique JWT secrets
- Rotate secrets regularly

### 2. Database Security

- Use strong passwords
- Limit database user permissions
- Enable SSL connections
- Regular security updates

### 3. API Security

- Rate limiting is configured
- CORS is properly set
- Input validation is implemented
- SQL injection protection via Sequelize

### 4. File Upload Security

- File type validation
- File size limits
- Secure file storage
- Virus scanning (recommended)

## Backup & Recovery

### 1. Database Backup

```bash
# Create backup
mysqldump -u cmsdbadmin -p cmsdb > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
mysql -u cmsdbadmin -p cmsdb < backup_file.sql
```

### 2. File Backup

Backup the `uploads` directory regularly:

```bash
tar -czf uploads_backup_$(date +%Y%m%d_%H%M%S).tar.gz backend/uploads/
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check database credentials
   - Verify database server is running
   - Check network connectivity

2. **Port Already in Use**
   - Change PORT in environment variables
   - Kill existing processes using the port

3. **File Upload Issues**
   - Check upload directory permissions
   - Verify file size limits
   - Check disk space

4. **Socket.io Connection Issues**
   - Verify CORS configuration
   - Check firewall settings
   - Ensure WebSocket support

### Logs Location

- Application logs: Console output
- Error logs: Check application console
- Database logs: MySQL error log

## Support

For technical support or questions:

1. Check the troubleshooting section
2. Review application logs
3. Check database connectivity
4. Verify environment configuration

## Default Login Credentials

After seeding the database, you can use these credentials:

- **Owner**: john.doe@constructease.com / password123
- **Project Manager**: jane.smith@constructease.com / password123
- **Site Engineer**: mike.johnson@constructease.com / password123
- **Contractor**: sarah.wilson@constructease.com / password123
- **Viewer**: david.brown@constructease.com / password123

**Important**: Change these default passwords in production!
