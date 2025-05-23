from app.repositories import user_repo
from app.utils.logging import logger

class UserService:
    @classmethod
    def register_user(cls, form_data):
        try:
            user = user_repo.create_user(form_data)
            logger.info(
                "New user registered", 
                extra={"user_id": user.id, "email": user.email}
            )
            return user
        except Exception as e:
            logger.error("Registration failed", exc_info=True)
            raise