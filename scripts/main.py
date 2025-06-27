from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
import secrets
import string

from database import get_db, create_tables, User, Transaction, Budget, Goal, SharedGroup, SharedGroupMember, SharedExpense
from models import *
from auth import get_password_hash, authenticate_user, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES

# Create FastAPI app
app = FastAPI(
    title="Personal Finance Tracker API", 
    version="1.0.0",
    description="Free Personal Finance Tracker with SQLite Database"
)

# CORS middleware - Allow all origins for free hosting
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables on startup
@app.on_event("startup")
def startup_event():
    create_tables()
    print("✅ Database tables created successfully!")
    print("🚀 Finance Tracker API is running!")
    print("📖 API Documentation: http://localhost:8000/docs")

def generate_invitation_code(length: int = 8) -> str:
    characters = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))

# Root endpoint
@app.get("/")
def read_root():
    return {
        "message": "Personal Finance Tracker API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }

# Health check
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Authentication endpoints
@app.post("/auth/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/auth/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Transaction endpoints
@app.post("/transactions", response_model=TransactionResponse)
def create_transaction(transaction: TransactionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_transaction = Transaction(**transaction.dict(), user_id=current_user.id)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@app.get("/transactions", response_model=List[TransactionResponse])
def get_transactions(skip: int = 0, limit: int = 100, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.date.desc()).offset(skip).limit(limit).all()
    return transactions

@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(transaction)
    db.commit()
    return {"message": "Transaction deleted successfully"}

# Budget endpoints
@app.post("/budgets", response_model=BudgetResponse)
def create_budget(budget: BudgetCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_budget = Budget(**budget.dict(), user_id=current_user.id)
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget

@app.get("/budgets", response_model=List[BudgetResponse])
def get_budgets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    return budgets

@app.put("/budgets/{budget_id}", response_model=BudgetResponse)
def update_budget(budget_id: int, budget_update: BudgetUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    for field, value in budget_update.dict(exclude_unset=True).items():
        setattr(budget, field, value)
    
    db.commit()
    db.refresh(budget)
    return budget

@app.delete("/budgets/{budget_id}")
def delete_budget(budget_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()
    return {"message": "Budget deleted successfully"}

# Goal endpoints
@app.post("/goals", response_model=GoalResponse)
def create_goal(goal: GoalCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_goal = Goal(**goal.dict(), user_id=current_user.id)
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@app.get("/goals", response_model=List[GoalResponse])
def get_goals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    return goals

@app.put("/goals/{goal_id}", response_model=GoalResponse)
def update_goal(goal_id: int, goal_update: GoalUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    for field, value in goal_update.dict(exclude_unset=True).items():
        setattr(goal, field, value)
    
    db.commit()
    db.refresh(goal)
    return goal

@app.delete("/goals/{goal_id}")
def delete_goal(goal_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted successfully"}

# Dashboard summary endpoint
@app.get("/dashboard/summary")
def get_dashboard_summary(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Get recent transactions
    recent_transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.date.desc()).limit(5).all()
    
    # Calculate total income and expenses for current month
    current_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    income_transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "income",
        Transaction.date >= current_month
    ).all()
    total_income = sum(t.amount for t in income_transactions)
    
    expense_transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
        Transaction.date >= current_month
    ).all()
    total_expenses = sum(t.amount for t in expense_transactions)
    
    # Get budgets
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    
    # Get goals
    goals = db.query(Goal).filter(Goal.user_id == current_user.id, Goal.completed == False).all()
    
    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "balance": total_income - total_expenses,
        "recent_transactions": recent_transactions,
        "budgets": budgets,
        "goals": goals,
        "transaction_count": len(recent_transactions),
        "budget_count": len(budgets),
        "goal_count": len(goals)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
