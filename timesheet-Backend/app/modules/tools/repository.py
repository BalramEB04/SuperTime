from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tools.model import Tool
from app.modules.tools.schema import ToolCreate, ToolUpdate


class ToolRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, tool_id: int) -> Optional[Tool]:
        result = await self.db.execute(
            select(Tool)
            .where(Tool.id == tool_id)
        )
        return result.scalars().first()

    async def get_by_name(self, name: str) -> Optional[Tool]:
        result = await self.db.execute(
            select(Tool)
            .where(Tool.name == name)
        )
        return result.scalars().first()

    async def get_all(self, skip: int = 0, limit: int = 100, active_only: bool = False) -> List[Tool]:
        query = select(Tool)
        if active_only:
            query = query.where(Tool.status == "Active")
        result = await self.db.execute(
            query.order_by(Tool.id.asc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, tool_in: ToolCreate) -> Tool:
        tool = Tool(**tool_in.model_dump())
        self.db.add(tool)
        await self.db.commit()
        await self.db.refresh(tool)
        return tool

    async def update(self, tool: Tool, tool_in: ToolUpdate) -> Tool:
        update_data = tool_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(tool, field, value)
        await self.db.commit()
        await self.db.refresh(tool)
        return tool

    async def soft_delete(self, tool: Tool) -> Tool:
        tool.status = "Inactive"
        await self.db.commit()
        await self.db.refresh(tool)
        return tool
