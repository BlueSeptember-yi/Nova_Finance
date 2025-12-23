"""FastAPI 主应用 - NovaFinance 修改版"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import get_settings
from app.database import Base, engine
from app.routers import (
    account, auth, bank, company, customer, inventory, journal,
    order, payment, product, report, standard_account,
    super_admin, supplier, user,
)

settings = get_settings()


app = FastAPI(
    title="NovaFinance 财务核心系统", 
    version="1.0.0 Final",            
    description="基于 FastAPI 与 React 构建的企业级财务管理解决方案。开发者：吴明峰 信管T2301 8102230927 - 期末结课作业",
    docs_url="/docs",
    redoc_url="/redoc",
)
# -----------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由注册保持不变
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(company.router, prefix=settings.API_PREFIX)
app.include_router(user.router, prefix=settings.API_PREFIX)
app.include_router(super_admin.router, prefix=settings.API_PREFIX)
app.include_router(account.router, prefix=settings.API_PREFIX)
app.include_router(standard_account.router, prefix=settings.API_PREFIX)
app.include_router(journal.router, prefix=settings.API_PREFIX)
app.include_router(supplier.router, prefix=settings.API_PREFIX)
app.include_router(customer.router, prefix=settings.API_PREFIX)
app.include_router(order.router, prefix=settings.API_PREFIX)
app.include_router(payment.router, prefix=settings.API_PREFIX)
app.include_router(product.router, prefix=settings.API_PREFIX)
app.include_router(inventory.router, prefix=settings.API_PREFIX)
app.include_router(bank.router, prefix=settings.API_PREFIX)
app.include_router(report.router, prefix=settings.API_PREFIX)

@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    if settings.DEBUG:
        Base.metadata.create_all(bind=engine)
        print("✅ NovaFinance 数据库表已初始化") #

@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "欢迎使用 NovaFinance 财务系统", 
        "developer": "吴明峰 信管T2301 8102230927",                  
        "version": "1.0.0 Final",
        "docs": "/docs",
    }

@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "system": "NovaFinance"}

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """全局异常处理器"""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "data": None,
            "message": f"服务器内部错误: {str(exc)}",
            "code": 500,
        },
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)
