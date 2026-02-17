import sys
import os
import asyncio
from alembic.config import Config
from alembic.script import ScriptDirectory
from alembic.runtime.migration import MigrationContext
from sqlalchemy.ext.asyncio import create_async_engine

# 將當前目錄加入 sys.path 以便匯入 app 模組
sys.path.append(os.getcwd())

from app.core.config import settings

async def check_db_status():
    """
    檢查資料庫遷移狀態
    比對資料庫目前的版本 (current revision) 與程式碼中的最新版本 (head revision)
    """
    print("正在檢查資料庫狀態...")

    # 建立資料庫連線引擎
    engine = create_async_engine(settings.DATABASE_URL)

    try:
        async with engine.connect() as connection:
            # 建立 Alembic 設定物件
            alembic_cfg = Config("alembic.ini")
            
            # 取得遷移腳本目錄 (versions 資料夾)
            script = ScriptDirectory.from_config(alembic_cfg)
            
            # 取得程式碼中的最新版本號 (Head)
            head_revision = script.get_current_head()

            # 取得資料庫目前的版本號
            def get_current_revision(sync_conn):
                context = MigrationContext.configure(sync_conn)
                return context.get_current_revision()

            current_revision = await connection.run_sync(get_current_revision)

            print(f"程式碼最新版本: {head_revision}")
            print(f"資料庫目前版本: {current_revision}")

            if current_revision != head_revision:
                print("\n" + "="*50)
                print("! 資料庫與程式碼不同步！")
                print("偵測到未執行的資料庫遷移。")
                print("為了避免程式錯誤，請先執行以下指令更新資料庫：")
                print("\n    python -m alembic upgrade head")
                print("\n" + "="*50)
                sys.exit(1)
            
            print("OK 資料庫同步狀態正常。")
            sys.exit(0)

    except Exception as e:
        print(f"Error 檢查資料庫時發生錯誤: {e}")
        # 如果連線失敗，通常也是無法啟動的，回傳錯誤代碼
        sys.exit(1)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    # 執行非同步檢查
    asyncio.run(check_db_status())
