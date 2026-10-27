"""
FDR-SMART Authentication Module
Handles login, profile resolution, and password management.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.models import User, InstitutionMembership, Institution
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    password: str

class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str

def format_user_response(user: User, db: Session) -> dict:
    # Resolve primary institution membership if exists
    membership = db.query(InstitutionMembership).filter(
        InstitutionMembership.user_id == user.id,
        InstitutionMembership.status == "active"
    ).first()
    
    inst_id = membership.institution_id if membership else None
    inst_name = None
    if inst_id:
        inst = db.query(Institution).filter(Institution.id == inst_id).first()
        if inst:
            inst_name = inst.name

    return {
        "id": user.id,
        "name": user.display_name,
        "email": user.email,
        "role": user.role,
        "institutionId": inst_id,
        "institutionName": inst_name,
        "department": "Regulation Bureau" if "officer" in user.role or "approv" in user.role else "Administration",
        "designation": user.role.replace("_", " ").title(),
        "status": user.status,
        "createdAt": user.created_at.isoformat() if user.created_at else datetime.now(timezone.utc).isoformat(),
        "updatedAt": user.updated_at.isoformat() if user.updated_at else datetime.now(timezone.utc).isoformat(),
    }

@router.post("/login")
async def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning JWT and profile."""
    normalized_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email.ilike(normalized_email)).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    
    if not verify_password(payload.password, user.password_hash or ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
        
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is currently suspended or inactive.",
        )
        
    # Update last login timestamp
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    
    token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    
    return {
        "success": True,
        "data": {
            "token": token,
            "user": format_user_response(user, db),
        },
        "message": "Login successful.",
    }

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns the authenticated user's profile."""
    return {
        "success": True,
        "data": format_user_response(current_user, db),
    }

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Stateless logout confirmation."""
    return {
        "success": True,
        "data": None,
        "message": "Logout successful.",
    }

@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates user password."""
    if not verify_password(payload.currentPassword, current_user.password_hash or ""):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed.",
        )
        
    current_user.password_hash = get_password_hash(payload.newPassword)
    db.commit()
    return {
        "success": True,
        "data": None,
        "message": "Password changed successfully.",
    }
