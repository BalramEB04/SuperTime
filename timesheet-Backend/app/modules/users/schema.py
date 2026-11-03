from datetime import date, datetime
import re
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.modules.roles.schema import RoleResponse
from app.modules.departments.schema import DepartmentResponse

NAME_REGEX = re.compile(r"^[a-zA-Z\s'-]+$")
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


class UserCreate(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=2, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    employee_id: Optional[str] = Field(None, max_length=50) # Auto-generated if not provided
    role_id: int = Field(..., ge=1)
    department_id: Optional[int] = None
    joining_date: date = Field(..., description="Mandatory employee joining date")
    ctc: Optional[float] = Field(None, ge=0.0)
    status: Optional[str] = "Pending"

    @field_validator("first_name")
    @classmethod
    def validate_first_name(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 2:
            raise ValueError("First name must be at least 2 characters long.")
        if not NAME_REGEX.match(clean):
            raise ValueError("Numbers and symbols are not allowed in names. Please enter letters only.")
        return clean

    @field_validator("last_name")
    @classmethod
    def validate_last_name(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 1:
            raise ValueError("Last name cannot be empty.")
        if not NAME_REGEX.match(clean):
            raise ValueError("Numbers and symbols are not allowed in names. Please enter letters only.")
        return clean

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        clean = str(v).strip().lower()
        if not EMAIL_REGEX.match(clean):
            raise ValueError("Please provide a valid corporate email address (e.g. user@company.com).")
        return clean


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    employee_id: Optional[str] = Field(None, min_length=1, max_length=50)
    role_id: Optional[int] = Field(None, ge=1)
    department_id: Optional[int] = None
    joining_date: Optional[date] = None
    ctc: Optional[float] = Field(None, ge=0.0)
    status: Optional[str] = None


class UserStatusUpdate(BaseModel):
    status: str = Field(..., description="Target status ('Active' or 'Inactive')")


class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    employee_id: str
    role_id: int
    department_id: Optional[int] = None
    joining_date: Optional[date] = None
    ctc: Optional[float] = None
    status: str
    created_at: datetime
    updated_at: datetime
    role: RoleResponse
    department: Optional[DepartmentResponse] = None

    model_config = ConfigDict(from_attributes=True)

