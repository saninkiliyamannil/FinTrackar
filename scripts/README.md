# Personal Finance Tracker - Python Backend

This is a FastAPI-based backend for the Personal Finance Tracker application. It provides a RESTful API with authentication, database management, and all the necessary endpoints for managing personal finances.

## Features

- **User Authentication**: JWT-based authentication with registration and login
- **Transaction Management**: Create, read, update, delete financial transactions
- **Budget Tracking**: Set and monitor budgets by category
- **Goal Setting**: Create and track financial goals
- **Shared Finances**: Create groups, invite members, and track shared expenses
- **Dashboard Summary**: Get overview of financial data
- **Automatic API Documentation**: Interactive docs at `/docs`

## Technology Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: SQL toolkit and ORM
- **SQLite**: Default database (easily changeable to PostgreSQL)
- **JWT**: JSON Web Tokens for authentication
- **Pydantic**: Data validation using Python type annotations
- **Uvicorn**: ASGI server for running the application

## Installation

1. **Install Python 3.8+**
   Make sure you have Python 3.8 or higher installed.

2. **Install Dependencies**
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

3. **Environment Setup**
   \`\`\`bash
   cp .env.example .env
   # Edit .env file with your configuration
   \`\`\`

4. **Run the Server**
   \`\`\`bash
   python run_server.py
   \`\`\`

   Or using uvicorn directly:
   \`\`\`bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   \`\`\`

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user info

### Transactions
- `POST /transactions` - Create a new transaction
- `GET /transactions` - Get user's transactions
- `GET /transactions/{id}` - Get specific transaction
- `DELETE /transactions/{id}` - Delete transaction

### Budgets
- `POST /budgets` - Create a new budget
- `GET /budgets` - Get user's budgets
- `PUT /budgets/{id}` - Update budget
- `DELETE /budgets/{id}` - Delete budget

### Goals
- `POST /goals` - Create a new goal
- `GET /goals` - Get user's goals
- `PUT /goals/{id}` - Update goal
- `DELETE /goals/{id}` - Delete goal

### Shared Groups
- `POST /shared-groups` - Create a shared group
- `GET /shared-groups` - Get user's shared groups
- `POST /shared-groups/join/{code}` - Join group with invitation code

### Shared Expenses
- `POST /shared-expenses` - Create shared expense
- `GET /shared-expenses/{group_id}` - Get group's expenses

### Dashboard
- `GET /dashboard/summary` - Get dashboard summary data

## Database Schema

The application uses the following main tables:

- **users**: User accounts and authentication
- **transactions**: Financial transactions
- **budgets**: Budget categories and limits
- **goals**: Financial goals and targets
- **shared_groups**: Shared finance groups
- **shared_group_members**: Group membership
- **shared_expenses**: Shared group expenses

## Configuration

### Environment Variables

- `DATABASE_URL`: Database connection string
- `SECRET_KEY`: JWT secret key (change in production!)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)

### Database Options

**SQLite (Default)**
\`\`\`
DATABASE_URL=sqlite:///./finance_tracker.db
\`\`\`

**PostgreSQL**
\`\`\`
DATABASE_URL=postgresql://username:password@localhost/finance_tracker
\`\`\`

## Development

### API Documentation
- Interactive docs: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

### Testing the API
You can test the API using:
- The built-in FastAPI docs interface
- curl commands
- Postman
- Your frontend application

### Example API Usage

**Register a user:**
\`\`\`bash
curl -X POST "http://localhost:8000/auth/register" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "user@example.com",
       "username": "testuser",
       "password": "password123",
       "full_name": "Test User"
     }'
\`\`\`

**Login:**
\`\`\`bash
curl -X POST "http://localhost:8000/auth/login" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "user@example.com",
       "password": "password123"
     }'
\`\`\`

**Create a transaction (with auth token):**
\`\`\`bash
curl -X POST "http://localhost:8000/transactions" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -d '{
       "amount": 50.00,
       "description": "Grocery shopping",
       "category": "Food",
       "type": "expense",
       "date": "2024-01-15T10:30:00"
     }'
\`\`\`

## Deployment

### Production Considerations

1. **Change the SECRET_KEY** in production
2. **Use a production database** (PostgreSQL recommended)
3. **Set up proper CORS** for your frontend domain
4. **Use environment variables** for all configuration
5. **Set up proper logging**
6. **Use a production ASGI server** like Gunicorn with Uvicorn workers

### Docker Deployment (Optional)

Create a `Dockerfile`:
\`\`\`dockerfile
FROM python:3.9

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
\`\`\`

## Frontend Integration

To connect your Next.js frontend to this API:

1. Update your API base URL to point to this server
2. Use the JWT token from login for authenticated requests
3. Update your API functions to match the endpoint structure
4. Handle the response format from this API

Example frontend API configuration:
\`\`\`javascript
const API_BASE_URL = 'http://localhost:8000';

// Login function
async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  localStorage.setItem('token', data.access_token);
  return data;
}

// Authenticated request
async function getTransactions() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/transactions`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
}
\`\`\`

## Support

For issues or questions about the API, check:
1. The interactive documentation at `/docs`
2. Server logs for error details
3. Database connection and configuration
4. CORS settings for frontend integration
