import asyncio
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from dotenv import load_dotenv
load_dotenv()

import app.core.models  # noqa: F401 - ensure all ORM mappers are registered
from sqlalchemy import select, func
from app.core.database import AsyncSessionLocal, engine
from app.modules.departments.model import Department
from app.modules.departments.designation_model import Designation

SEED_DATA = {
    "Backend": {
        "code": "BE",
        "description": "Backend Engineering & AI/ML",
        "designations": [
            "AI/ML Engineer I",
            "AI/ML Engineer II",
            "Software Development Engineer - I",
            "Software Development Engineer - II",
            "Associate Product Architect",
        ],
    },
    "Frontend": {
        "code": "FE",
        "description": "Web & Frontend Engineering",
        "designations": [
            "Web Developer",
            "Senior Web Developer",
            "Software Development Engineer - II",
        ],
    },
    "Mobile": {
        "code": "MOB",
        "description": "Mobile App Development",
        "designations": [
            "Software Development Engineer I - Mobile",
            "Software Development Engineer II - Mobile",
        ],
    },
    "PM": {
        "code": "PM",
        "description": "Project & Product Management",
        "designations": [
            "Product Manager",
            "Project Manager",
            "Business Analyst - Executive",
            "Sr. Business Analyst",
        ],
    },
    "QA": {
        "code": "QA",
        "description": "Quality Assurance & Testing",
        "designations": [
            "QA Engineer",
        ],
    },
    "Sales": {
        "code": "SALES",
        "description": "Business Development & Sales",
        "designations": [
            "Business Development Executive",
        ],
    },
    "SEO": {
        "code": "SEO",
        "description": "Search Engine Optimization & Content",
        "designations": [
            "SEO Executive",
            "SEO Content Writer",
            "Junior SEO Content Writer",
            "Senior SEO Manager",
        ],
    },
    "UI/UX": {
        "code": "UIUX",
        "description": "Product Design & User Experience",
        "designations": [
            "Junior UI/UX Designer",
            "Product Designer",
        ],
    },
    "Marketing": {
        "code": "MKT",
        "description": "Marketing & Creative Media",
        "designations": [
            "Graphic Designer",
            "Junior Graphic Designer",
            "Senior Executive - Social Media",
            "Video Editor",
        ],
    },
    "Product": {
        "code": "PROD",
        "description": "Product Strategy & Leadership",
        "designations": [
            "Founder Office",
        ],
    },
}


async def seed():
    print("=" * 60)
    print("Seeding Departments and Designations...")
    print("=" * 60)

    total_depts_created = 0
    total_depts_existing = 0
    total_designations_created = 0
    total_designations_existing = 0

    async with AsyncSessionLocal() as session:
        for dept_name, info in SEED_DATA.items():
            # 1. Department
            stmt = select(Department).where(func.lower(Department.name) == dept_name.lower())
            result = await session.execute(stmt)
            dept = result.scalars().first()

            if not dept:
                dept = Department(
                    name=dept_name,
                    code=info["code"],
                    description=info["description"],
                    is_active=True,
                )
                session.add(dept)
                await session.flush()
                total_depts_created += 1
                print(f"[+] Created Department: {dept.name} (Code: {dept.code})")
            else:
                total_depts_existing += 1
                # Update code or description if missing
                if not dept.code and info["code"]:
                    dept.code = info["code"]
                if not dept.description and info["description"]:
                    dept.description = info["description"]
                await session.flush()
                print(f"[*] Found Existing Department: {dept.name} (ID: {dept.id})")

            # 2. Designations for this department
            for title in info["designations"]:
                d_stmt = select(Designation).where(
                    Designation.department_id == dept.id,
                    func.lower(Designation.name) == title.lower(),
                )
                d_res = await session.execute(d_stmt)
                designation = d_res.scalars().first()

                if not designation:
                    designation = Designation(
                        department_id=dept.id,
                        name=title,
                        is_active=True,
                    )
                    session.add(designation)
                    total_designations_created += 1
                    print(f"    -> Added Designation: {title}")
                else:
                    total_designations_existing += 1

        await session.commit()

    print("=" * 60)
    print(f"Departments:  {total_depts_created} created, {total_depts_existing} already existed.")
    print(f"Designations: {total_designations_created} created, {total_designations_existing} already existed.")
    print("Done! Seeding completed successfully.")
    print("=" * 60)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
