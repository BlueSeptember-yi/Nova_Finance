"""应用配置管理"""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置"""

    APP_NAME: str = "NovaFinance财务系统"
    DEBUG: bool = True
    API_PREFIX: str = "/api"
    VERSION: str = "0.1.0"

    # 数据库配置
    DATABASE_URL: str = "mysql+pymysql://root:root123@localhost:3306/ursbook?charset=utf8mb4&collation=utf8mb4_unicode_ci"

    # JWT 配置
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    def get_allowed_origins_list(self) -> list[str]:
        """将逗号分隔的字符串转换为列表"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()
