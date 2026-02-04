import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Next.js 16 Proxy (formerly Middleware)
export default function proxy(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const role = request.cookies.get('role')?.value; // In real app, verify token to get role
    const path = request.nextUrl.pathname;

    // 1. 公開頁面 (Login) 不需驗證
    if (path.startsWith('/login')) {
        // 若已登入，直接導向 POS
        if (token) {
            return NextResponse.redirect(new URL('/pos', request.url));
        }
        return NextResponse.next();
    }

    // 2. 未登入攔截 -> 導向 Login
    if (!token) {
        if (path.startsWith('/pos') || path.startsWith('/admin')) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        return NextResponse.next();
    }

    // 3. RBAC 權限控管
    // Staff: 僅限 /pos, 禁止 /admin (closing page requires manager PIN in-page)
    if (role === 'staff') {
        if (path.startsWith('/admin')) {
            return NextResponse.redirect(new URL('/pos', request.url));
        }
    }

    // Manager: 禁止 /admin
    if (role === 'manager') {
        if (path.startsWith('/admin')) {
            return NextResponse.redirect(new URL('/pos', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
