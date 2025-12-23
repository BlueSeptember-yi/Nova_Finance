import { Navigate } from 'react-router-dom';
import { message } from 'antd';
import { getUser, checkPermission } from '@/utils';

interface ProtectedRouteProps {
  children: React.ReactElement;
  permission?: string;
  roles?: string[];
}

/**
 * 权限保护路由组件
 * @param permission 需要的权限，如 "journal:create"
 * @param roles 允许的角色列表，如 ["Owner", "Accountant"]
 */
const ProtectedRoute = ({ children, permission, roles }: ProtectedRouteProps) => {
  const user = getUser();

  if (!user) {
    message.error('请先登录');
    return <Navigate to="/login" replace />;
  }

  // 如果指定了角色，检查角色
  if (roles && roles.length > 0) {
    if (!roles.includes(user.role)) {
      message.error('权限不足：您没有访问此页面的权限');
      // 根据用户角色重定向到合适的页面
      if (user.role === 'SuperAdmin') {
        return <Navigate to="/super-admin" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }

  // 如果指定了权限，检查权限
  if (permission) {
    if (!checkPermission(user.role, permission)) {
      message.error('权限不足：您没有访问此页面的权限');
      // 根据用户角色重定向到合适的页面
      if (user.role === 'SuperAdmin') {
        return <Navigate to="/super-admin" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

