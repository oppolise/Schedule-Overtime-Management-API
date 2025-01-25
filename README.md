# Schedule Overtime Management API 

Backend REST API for the Schedule Management mobile application built with Node.js, Express, and MongoDB.

## Features

### 🔐 Authentication
- User registration
- JWT-based authentication
- Password encryption

### 👥 Team API
- Create/Read/Update/Delete teams
- Manage team members
- Role management

### 📅 Schedule API
- Create work schedules
- Manage working days
- Staff assignments
- Schedule modifications

## Tech Stack
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- BCrypt for password hashing
- CORS enabled

## Getting Started

### Prerequisites
```bash
node --version  # Ensure Node.js is installed
mongodb --version  # Ensure MongoDB is installed
```

### Installation
```bash
git clone [repository-url]
cd backend_flutter
npm install
```

### Configure MongoDB
```javascript
// Update connection string in config/db.js
mongoose.connect('mongodb://localhost:27017/your_database')
```

### Start the server
```bash
npm start
```

## API Documentation

### Authentication
- `POST /register` - Register new user
- `POST /login` - User login

### Teams
- `GET /teams/:userId` - Get user's teams
- `POST /teams/:userId` - Create new team
- `POST /teams/:teamId/members` - Add team member

### Schedules
- `GET /schedules/:scheduleId/calendar` - Get schedule calendar
- `POST /schedules` - Create new schedule
- `PUT /scheduleDays/:id` - Update schedule day


