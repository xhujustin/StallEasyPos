async def check_overdue_invoices():
    """
    每日掃描 pending/failed 發票
    - 若 failed > 2天 -> 通知 Owner, 生成 PDF/CSV
    """
    pass
