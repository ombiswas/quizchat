"""
Base models and custom types for MongoDB document representation.
"""

from typing import Annotated, Any
from bson import ObjectId
from pydantic import (
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    PlainSerializer,
    WithJsonSchema,
)


def validate_object_id(v: Any) -> ObjectId:
    """
    Validate that the given value is an ObjectId or a valid 24-character hex string.
    """
    if isinstance(v, ObjectId):
        return v
    if isinstance(v, str) and ObjectId.is_valid(v):
        return ObjectId(v)
    raise ValueError(f"Invalid ObjectId: {v}")


PyObjectId = Annotated[
    ObjectId,
    BeforeValidator(validate_object_id),
    PlainSerializer(lambda x: str(x), return_type=str, when_used="json"),
    WithJsonSchema(
        {"type": "string", "example": "507f1f77bcf86cd799439011"},
        mode="serialization",
    ),
]


class MongoBaseModel(BaseModel):
    """
    Shared base model for all MongoDB document models.

    Configured to:
      - Map `_id` in MongoDB documents to `id` in Python attributes (and vice versa).
      - Allow arbitrary types such as `bson.ObjectId`.
      - Allow population by either field name or alias.
      - Provide `to_mongo()` helper for clean BSON dictionary serialization.
    """

    id: PyObjectId | None = Field(default=None, alias="_id")

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )

    def to_mongo(self, **kwargs: Any) -> dict[str, Any]:
        """
        Dumps model to a MongoDB-ready dictionary (using `_id` alias).
        Excludes `_id` if it is None so MongoDB generates a new ObjectId on insert.
        """
        exclude_none = kwargs.pop("exclude_none", False)
        dump = self.model_dump(by_alias=True, exclude_none=exclude_none, **kwargs)
        if dump.get("_id") is None:
            dump.pop("_id", None)
        return dump
