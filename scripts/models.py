from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# User models
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# Transaction models
class TransactionBase(BaseModel):
    amount: float
    description: str
    category: str
    type: str  # 'income' or 'expense'
    date: datetime

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Budget models
class BudgetBase(BaseModel):
    category: str
    amount: float
    period: str = "monthly"

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    category: Optional[str] = None
    amount: Optional[float] = None
    spent: Optional[float] = None
    period: Optional[str] = None

class BudgetResponse(BudgetBase):
    id: int
    user_id: int
    spent: float
    created_at: datetime
    
    class Config:
        from_attributes = True

# Goal models
class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    target_amount: float
    target_date: Optional[datetime] = None

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[datetime] = None
    completed: Optional[bool] = None

class GoalResponse(GoalBase):
    id: int
    user_id: int
    current_amount: float
    created_at: datetime
    completed: bool
    
    class Config:
        from_attributes = True

# Shared Group models
class SharedGroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class SharedGroupCreate(SharedGroupBase):
    pass

class SharedGroupResponse(SharedGroupBase):
    id: int
    created_by: int
    invitation_code: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Shared Expense models
class SharedExpenseBase(BaseModel):
    amount: float
    description: str
    category: str
    date: datetime

class SharedExpenseCreate(SharedExpenseBase):
    group_id: int

class SharedExpenseResponse(SharedExpenseBase):
    id: int
    group_id: int
    paid_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True
