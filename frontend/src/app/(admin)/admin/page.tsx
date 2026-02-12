'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
    const router = useRouter();

    useEffect(() => {
        // 自動重定向至dashboard
        router.replace('/admin/dashboard');
    }, [router]);

    return null;
}
