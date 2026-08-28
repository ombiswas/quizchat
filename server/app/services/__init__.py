"""
Business logic services package.

Services orchestrate the application's business rules: quiz session lifecycle,
scoring, access-control checks, etc.  They sit between routers and repositories:
routers call services; services call repositories.  Services must never build
Motor queries or aggregation pipelines directly — that belongs in repositories/.
"""
