"""
Pydantic request/response models (schemas) package.

Every HTTP request body and response body in this project is typed with a
Pydantic model defined here.  Using `dict` as a passthrough is explicitly
forbidden — it bypasses validation and makes the API surface invisible.

Schemas are separated from models/ (which represent MongoDB document shapes)
because the two concerns evolve independently:  a document might store a
hashed secret that should never appear in a response, or a request might
accept fields that get computed before storage.
"""
