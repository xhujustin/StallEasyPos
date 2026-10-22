import os
import uuid
from fastapi import UploadFile
from aiofiles import os as aio_os
import aiofiles

class UploadService:
    @staticmethod
    async def save_upload_file(upload_file: UploadFile, destination: str) -> str:
        """
        儲存上傳的檔案並回傳相對路徑
        """
        # 確保目錄存在
        os.makedirs(os.path.dirname(destination), exist_ok=True)
        
        async with aiofiles.open(destination, "wb") as out_file:
            while content := await upload_file.read(1024 * 1024):  # 1MB chunks
                await out_file.write(content)
        
        return destination

    @staticmethod
    async def save_product_image(store_id: int, upload_file: UploadFile, old_url: str = None) -> str:
        """
        儲存商品圖片並回傳 URL 路徑，若提供 old_url 則嘗試刪除舊檔案
        """
        # 如果有舊圖片且是伺服器內部的，先嘗試刪除
        if old_url:
            await UploadService.delete_file_by_url(old_url)

        # 產生唯一檔名
        file_ext = os.path.splitext(upload_file.filename)[1]
        file_name = f"{uuid.uuid4()}{file_ext}"
        
        # 設定儲存路徑 (實體路徑)
        relative_path = f"uploads/products/{store_id}/{file_name}"
        absolute_path = os.path.join(os.getcwd(), relative_path)
        
        await UploadService.save_upload_file(upload_file, absolute_path)
        
        # 回傳 URL 路徑 (需與 StaticFiles 配置一致)
        return f"/static/products/{store_id}/{file_name}"

    @staticmethod
    async def save_store_logo(store_id: int, upload_file: UploadFile, old_url: str = None) -> str:
        allowed = {".png", ".jpg", ".jpeg", ".webp"}
        file_ext = os.path.splitext(upload_file.filename or "")[1].lower()
        if file_ext not in allowed:
            raise ValueError("Logo 僅支援 PNG、JPG 或 WEBP")
        if old_url:
            await UploadService.delete_file_by_url(old_url)
        file_name = f"{uuid.uuid4()}{file_ext}"
        relative_path = f"uploads/logos/{store_id}/{file_name}"
        await UploadService.save_upload_file(upload_file, os.path.join(os.getcwd(), relative_path))
        return f"/static/logos/{store_id}/{file_name}"

    @staticmethod
    async def delete_file_by_url(url: str):
        """
        根據 URL 刪除對應的實體檔案 (支援包含 Host 的全路徑)
        """
        if not url:
            print("[Debug] delete_file_by_url: url is empty")
            return
            
        try:
            # 處理可能包含 Host 的網址 (例如 http://192.168.1.100:8000/static/...)
            # 我們要提取 /static/ 之後的部分
            if "/static/" not in url:
                print(f"[Debug] delete_file_by_url: /static/ not in url: {url}")
                return

            path_part = url.split("/static/")[1]
            
            # 重要：path_part 會是 "products/1/uuid.jpg" 這種格式
            # 直接拼接 "uploads" 即可得到 "uploads/products/1/uuid.jpg"
            relative_path = os.path.join("uploads", path_part)
            absolute_path = os.path.join(os.getcwd(), relative_path)
            
            # 規範化路徑
            absolute_path = os.path.normcase(os.path.normpath(absolute_path))
            
            print(f"[Debug] delete_file_by_url: 嘗試刪除檔案: {absolute_path}")
            
            if os.path.exists(absolute_path) and os.path.isfile(absolute_path):
                # 使用 aio_os 進行非同步刪除
                if hasattr(aio_os, 'remove'):
                    await aio_os.remove(absolute_path)
                else:
                    os.remove(absolute_path)
                print(f"[Debug] delete_file_by_url: 檔案刪除成功: {absolute_path}")
            else:
                print(f"[Debug] delete_file_by_url: 檔案不存在或不是檔案: {absolute_path}")
        except Exception as e:
            print(f"[Debug] 刪除檔案失敗 {url}: {e}")
