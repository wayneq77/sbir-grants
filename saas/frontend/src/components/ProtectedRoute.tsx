import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
    const { user, isLoading } = useAuth();

    // 當 auth 還在加載時，顯示 loading 畫面
    // 避免在驗證完成前就渲染 Outlet 導致路由錯亂
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
        );
    }

    // 如果沒有登入，導向登入頁面，並攜帶原本要訪問的路徑
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 已登入，渲染受保護的內容
    return <Outlet />;
}
