from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import RedirectResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.responses import created_response, success_response
from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.dependencies.permissions import require_roles
from app.modules.projects.schema import ProjectCreate, ProjectUpdate, ProjectResponse
from app.modules.projects.service import ProjectService
from app.modules.users.model import User

router = APIRouter()
pm_only = require_roles("Project_Manager")
project_manage_roles = require_roles("Project_Manager", "Account_Manager", "Admin")


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(project_manage_roles)])
async def create_project(
    project_in: ProjectCreate, 
    current_user: User = Depends(get_current_active_user), 
    db: AsyncSession = Depends(get_db)
):
    service = ProjectService(db)
    project = await service.create_project(project_in, current_user=current_user)
    return created_response(data=project.model_dump(mode="json"), message="Project created successfully")


@router.get("", response_model=dict, dependencies=[Depends(get_current_active_user)])
async def get_projects(
    skip: int = 0, 
    limit: int = 100, 
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: User = Depends(get_current_active_user), 
    db: AsyncSession = Depends(get_db)
):
    service = ProjectService(db)
    projects = await service.get_all_projects(skip=skip, limit=limit, is_active=is_active, current_user=current_user)
    return success_response(data=[p.model_dump(mode="json") for p in projects], message="Projects retrieved successfully")


@router.get("/{project_id}", response_model=dict, dependencies=[Depends(get_current_active_user)])
async def get_project(
    project_id: int, 
    current_user: User = Depends(get_current_active_user), 
    db: AsyncSession = Depends(get_db)
):
    service = ProjectService(db)
    project = await service.get_project_by_id(project_id, current_user=current_user)
    return success_response(data=project.model_dump(mode="json"), message="Project retrieved successfully")


@router.put("/{project_id}", response_model=dict, dependencies=[Depends(project_manage_roles)])
async def update_project(
    project_id: int, 
    project_in: ProjectUpdate, 
    current_user: User = Depends(get_current_active_user), 
    db: AsyncSession = Depends(get_db)
):
    service = ProjectService(db)
    project = await service.update_project(project_id, project_in, current_user=current_user)
    return success_response(data=project.model_dump(mode="json"), message="Project updated successfully")


@router.delete("/{project_id}", response_model=dict, dependencies=[Depends(pm_only)])
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    service = ProjectService(db)
    await service.delete_project(project_id, current_user=current_user)
    return success_response(message="Project deleted successfully")


@router.post("/{project_id}/documents", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(project_manage_roles)])
async def upload_project_document(
    project_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    service = ProjectService(db)
    doc = await service.upload_document(project_id, file, current_user=current_user)
    return created_response(data=doc.model_dump(mode="json"), message="Document uploaded successfully")


@router.delete("/{project_id}/documents/{document_id}", response_model=dict, dependencies=[Depends(project_manage_roles)])
async def delete_project_document(
    project_id: int,
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    service = ProjectService(db)
    await service.delete_document(project_id, document_id, current_user=current_user)
    return success_response(message="Document deleted successfully")


@router.get("/{project_id}/documents/{document_id}/download")
async def download_project_document(
    project_id: int,
    document_id: int,
    db: AsyncSession = Depends(get_db)
):
    service = ProjectService(db)
    doc = await service.repository.get_document_by_id(document_id)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # If stored in Object Storage (Neon / AWS S3)
    if not doc.file_path.startswith("/uploads") and not doc.file_path.startswith("http"):
        from app.services.storage_service import storage_service
        if storage_service.is_configured:
            presigned_url = storage_service.generate_presigned_url(doc.file_path, expires_in=3600)
            return RedirectResponse(url=presigned_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    # If local file
    local_path = Path(doc.file_path.lstrip("/"))
    if local_path.exists():
        return FileResponse(path=local_path, filename=doc.file_name)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content not found on server")
