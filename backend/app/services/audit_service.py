from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog, AuditAction

class AuditService:
    """
    稽核服務
    """
    @staticmethod
    async def log_action(
        db: AsyncSession, 
        store_id: int, 
        user_id: int, 
        action: AuditAction,
        entity_type: str,
        entity_id: int,
        snapshot: dict
    ):
        """
        記錄操作日誌
        """
        log = AuditLog(
            store_id=store_id,
            actor_user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            snapshot=snapshot
        )
        db.add(log)
        # Usually we want this to be part of the same transaction or background?
        # If fire-and-forget, use background task. If strict audit, same tx.
        # Here we assume caller handles commit or we force it?
        # For safety, caller commits.
