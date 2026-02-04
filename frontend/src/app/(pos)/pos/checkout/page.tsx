'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CheckoutPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to POS page, the modal will be shown via intercepting route
        router.push('/pos/pos');
    }, [router]);

    return null;
}
