"""
MongoDB document models package.

These Pydantic models represent the shape of documents as they are stored in
MongoDB.  They are NOT the same as schemas/ (API request/response shapes):
  - models/ = what lives in the database
  - schemas/ = what travels over the HTTP wire

The distinction prevents leaking internal fields (e.g. correct_option) through
the API, and allows the DB shape and API shape to diverge when needed.
"""
