'use client';

import { useCartStore } from '@/lib/store/cart-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';

import { orderApi, OrderCreate, OrderItemCreate, PaymentMethod, OrderSource, OrderType } from '@/lib/api/orders';
import { settingsApi } from '@/lib/api/settings';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hardwareApi } from '@/lib/api/hardware';

interface CheckoutModalProps {
    open: boolean;
    onClose: () => void;
}


export function CheckoutModal({ open, onClose }: CheckoutModalProps) {
    const { totalAmount, clearCart, items, currentOrderNo, currentPrintedOutputs = [] } = useCartStore();
    const { selectedStoreId, user } = useAuthStore();
    const storeId = selectedStoreId || user?.stores?.[0]?.id;

    const total = totalAmount();
    const [cashReceived, setCashReceived] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [change, setChange] = useState(0);
    const [roundingRule, setRoundingRule] = useState('round');
    const [orderType, setOrderType] = useState<OrderType>(OrderType.TAKE_OUT);
    const [serviceFeeRate, setServiceFeeRate] = useState(0);
    const [taxRate, setTaxRate] = useState(5);
    const [taxMode, setTaxMode] = useState<'inclusive' | 'exclusive'>('inclusive');
    const [paymentMethods, setPaymentMethods] = useState<string[]>(['cash']);
    const [deliveryPlatforms, setDeliveryPlatforms] = useState<{ id: string, name: string, color: string, enabled: boolean }[]>([]);
    const [multiPaymentMethods, setMultiPaymentMethods] = useState<{ id: string, name: string, color: string, enabled: boolean }[]>([]);
    const [selectedDeliveryPlatform, setSelectedDeliveryPlatform] = useState('');
    const [selectedPaymentProvider, setSelectedPaymentProvider] = useState('');
    const [discountPresets, setDiscountPresets] = useState<any[]>([]);
    const [selectedDiscount, setSelectedDiscount] = useState<any | null>(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);

    // Rounded Total Calculation
    const applyRounding = (val: number, rule: string) => {
        switch (rule) {
            case 'ceil': return Math.ceil(val);
            case 'floor': return Math.floor(val);
            case 'round': default: return Math.round(val);
        }
    };

    const subtotalValue = total;
    const currentServiceFeeRate = orderType === OrderType.DINE_IN ? serviceFeeRate : 0;
    const serviceFeeValue = (subtotalValue * (currentServiceFeeRate / 100));

    // 折扣計算
    let discountValue = 0;
    if (selectedDiscount) {
        if (selectedDiscount.type === 'percent') {
            discountValue = Math.round(subtotalValue * (selectedDiscount.value / 100));
        } else {
            discountValue = selectedDiscount.value;
        }
    }

    const taxableAmount = Math.max(0, subtotalValue + serviceFeeValue - discountValue);
    const taxValue = taxMode === 'inclusive'
        ? (taxRate > 0 ? taxableAmount - taxableAmount / (1 + taxRate / 100) : 0)
        : taxableAmount * taxRate / 100;
    const finalTotalBeforeRounding = taxableAmount + (taxMode === 'exclusive' ? taxValue : 0);
    const roundedTotal = applyRounding(Math.max(0, finalTotalBeforeRounding), roundingRule);
    const paymentSelectionValid = orderType === OrderType.DELIVERY
        ? Boolean(selectedDeliveryPlatform)
        : selectedPaymentMethod === PaymentMethod.CASH
            ? paymentMethods.includes('cash')
            : selectedPaymentMethod === PaymentMethod.LINEPAY && Boolean(selectedPaymentProvider);

    useEffect(() => {
        if (open && selectedPaymentMethod === PaymentMethod.LINEPAY) {
            setCashReceived(roundedTotal.toString());
        }
    }, [open, selectedPaymentMethod, roundedTotal]);

    useEffect(() => {
        if (open && storeId) {
            settingsApi.getStoreProfile(storeId).then(profile => {
                if (profile.rounding_rule) {
                    setRoundingRule(profile.rounding_rule);
                }
                const enabledMethods = profile.enabled_payment_methods || ['cash'];
                const configuredOrderType = profile.default_order_type as OrderType;
                setOrderType(
                    configuredOrderType === OrderType.DELIVERY && !enabledMethods.includes('platform_collect')
                        ? OrderType.TAKE_OUT
                        : configuredOrderType || OrderType.TAKE_OUT
                );
                if (profile.default_service_fee_rate !== undefined) {
                    setServiceFeeRate(profile.default_service_fee_rate);
                }
                setTaxRate(Number(profile.tax_rate ?? 5));
                setTaxMode(profile.tax_mode === 'exclusive' ? 'exclusive' : 'inclusive');
                setPaymentMethods(enabledMethods);
                setDeliveryPlatforms(profile.delivery_platforms || []);
                setMultiPaymentMethods(profile.multi_payment_methods || []);
                if (profile.discount_presets) {
                    setDiscountPresets(profile.discount_presets);
                }
            }).catch(err => console.error("Failed to load store settings:", err));
        }
    }, [open, storeId]);

    // ... (handlers)

    const handleCheckout = async () => {
        if (!storeId) {
            alert("未選擇店鋪，無法結帳");
            return;
        }
        if (orderType === OrderType.DELIVERY && !selectedDeliveryPlatform) {
            alert('請選擇外送平台');
            return;
        }
        if (!paymentSelectionValid) {
            alert('請選擇支付方式');
            return;
        }

        const received = parseInt(cashReceived) || 0;
        if (received >= roundedTotal) {
            setIsLoading(true);
            try {
                // Prepare payload
                const orderData: OrderCreate = {
                    idempotency_key: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    }),
                    order_no: currentOrderNo || undefined,
                    total_amount: roundedTotal,
                    subtotal: subtotalValue,
                    service_fee: serviceFeeValue,
                    service_fee_rate: currentServiceFeeRate,
                    tax_rate: taxRate,
                    tax_mode: taxMode,
                    tax_amount: taxValue,
                    order_type: orderType,
                    payment_method: selectedPaymentMethod,
                    delivery_platform: orderType === OrderType.DELIVERY ? selectedDeliveryPlatform : undefined,
                    payment_provider: orderType !== OrderType.DELIVERY ? selectedPaymentProvider || undefined : undefined,
                    source: orderType === OrderType.DELIVERY ? OrderSource.DELIVERY : OrderSource.POS,
                    cash_received: received,
                    change_amount: received - roundedTotal,
                    discount_amount: discountValue,
                    discount_note: selectedDiscount?.name,
                    items: items.map(item => ({
                        product_id: item.productId,
                        quantity: item.quantity,
                        note: item.note,
                        options: item.selectedOptions.map(opt => ({
                            attribute_id: opt.attributeId,
                            attribute_name: opt.attributeName,
                            option_id: opt.optionId,
                            option_name: opt.optionName,
                            price_adjustment: opt.priceAdjustment
                        }))
                    }))
                };

                // Remove console log after debugging
                // console.log("Sending Order Payload:", JSON.stringify(orderData, null, 2));

                // Call API
                const result = await orderApi.create(storeId, orderData);
                const order = result.data;

                // Hardware failures must not roll back a completed sale.
                try {
                    const [device, profile] = await Promise.all([
                        settingsApi.getDeviceSettings(storeId),
                        settingsApi.getStoreProfile(storeId),
                    ]);
                    const configuredPrinters = Array.isArray(device.printers) ? device.printers.filter((printer: any) => printer.enabled !== false) : [];
                    const hasOutput = (output: string) => configuredPrinters.some((printer: any) =>
                        Array.isArray(printer.outputs) && printer.outputs.includes(output)
                    );
                    if (selectedPaymentMethod === PaymentMethod.CASH && (configuredPrinters.length ? hasOutput('drawer') : device.open_cash_drawer)) {
                        await hardwareApi.openDrawer(storeId);
                    }
                    // Number ticket comes out first, followed by the customer's receipt.
                    if (!currentPrintedOutputs.includes('number_ticket') && (configuredPrinters.length ? hasOutput('number_ticket') : device.print_number_ticket) && order) {
                        await hardwareApi.printNumberTicket(storeId, order, profile.store_name);
                    }
                    if (!currentPrintedOutputs.includes('receipt') && (configuredPrinters.length ? hasOutput('receipt') : device.auto_print_receipt) && order) {
                        await hardwareApi.printOrder(storeId, order, profile.store_name);
                    }
                    if (!currentPrintedOutputs.includes('kitchen') && configuredPrinters.length && hasOutput('kitchen') && order) {
                        await hardwareApi.printKitchen(storeId, order, profile.store_name);
                    }
                    if (!currentPrintedOutputs.includes('label') && configuredPrinters.length && hasOutput('label') && order) {
                        await hardwareApi.printLabels(storeId, order, profile.store_name);
                    }
                } catch (hardwareError) {
                    console.error('Hardware command failed:', hardwareError);
                }

                // Success UI
                setChange(received - roundedTotal);
                setIsCompleted(true);
                clearCart();
            } catch (error: any) {
                console.error("Checkout failed:", error);
                if (error.response) {
                    console.error("Error Response Data:", error.response.data);
                    console.error("Error Response Status:", error.response.status);
                    alert(`結帳失敗: ${JSON.stringify(error.response.data)}`);
                } else {
                    alert("結帳失敗，請檢查網路或後端狀態");
                }
            } finally {
                setIsLoading(false);
            }
        }
    };
    const handleNumberClick = (num: string) => {
        setCashReceived((prev) => prev + num);
    };

    const handleBackspace = () => {
        setCashReceived((prev) => prev.slice(0, -1));
    };

    const handleClear = () => {
        setCashReceived('');
    };

    const handleExactCash = () => {
        setCashReceived(roundedTotal.toString());
    };



    const handleClose = () => {
        setCashReceived('');
        setIsCompleted(false);
        setIsLoading(false);
        setChange(0);
        setSelectedDeliveryPlatform('');
        setSelectedPaymentProvider('');
        onClose();
    };

    // Keyboard support
    useEffect(() => {
        if (!open || isCompleted || isLoading) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Prevent default for number keys and special keys
            if (/^[0-9]$/.test(e.key) || ['Backspace', 'Delete', 'Enter', 'Escape'].includes(e.key)) {
                e.preventDefault();
            }

            if (/^[0-9]$/.test(e.key)) {
                handleNumberClick(e.key);
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                handleBackspace();
            } else if (e.key === 'c' || e.key === 'C') {
                handleClear();
            } else if (e.key === 'Enter') {
                const received = parseInt(cashReceived) || 0;
                if (received >= roundedTotal) {
                    handleCheckout();
                }
            } else if (e.key === 'Escape') {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, isCompleted, isLoading, cashReceived, roundedTotal]);

    if (isCompleted) {
        return (
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogOverlay className="bg-black/80" />
                <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
                    <DialogTitle className="sr-only">交易完成</DialogTitle>
                    <div className="flex flex-col items-center justify-center p-6 space-y-6 text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                            <CheckCircle className="w-12 h-12" />
                        </div>

                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold text-slate-900">交易完成</h2>
                            <p className="text-slate-500">Order created successfully</p>
                        </div>

                        <div className="w-full bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2">
                            <div className="flex justify-between text-lg">
                                <span className="text-slate-500">找零</span>
                                <span className="font-bold font-mono text-3xl text-slate-900">${change}</span>
                            </div>
                        </div>

                        <Button
                            onClick={handleClose}
                            className="w-full h-14 text-lg bg-[#D4AF37] hover:bg-[#C5A028] text-white"
                        >
                            下一位
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    if (isLoading) {
        return (
            <Dialog open={open} onOpenChange={() => { }}>
                <DialogOverlay className="bg-black/50 backdrop-blur-sm" />
                <DialogContent className="sm:max-w-sm bg-white border-0 shadow-xl flex flex-col items-center justify-center py-12">
                    <DialogTitle className="sr-only">處理中</DialogTitle>
                    <Loader2 className="w-12 h-12 animate-spin text-[#D4AF37] mb-4" />
                    <p className="text-lg font-medium text-slate-700">正在建立訂單...</p>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogOverlay className="bg-black/50 backdrop-blur-sm" />
            <DialogContent className="sm:max-w-[800px] p-0 gap-0 bg-white overflow-hidden flex h-[600px]">
                <DialogTitle className="sr-only">結帳收款</DialogTitle>
                {/* Left: Summary */}
                <div className="w-1/2 bg-slate-50 border-r border-slate-200 flex min-h-0 flex-col">
                    <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-3">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-bold text-slate-900">結帳金額</h2>
                        <div className="text-3xl font-bold text-[#D4AF37] font-mono">${roundedTotal}</div>
                    </div>

                    <div className="space-y-2 mb-3">
                        <div className="text-sm font-medium text-slate-500 mb-1">訂單類型</div>
                        <div className={`grid gap-2 ${paymentMethods.includes('platform_collect') ? 'grid-cols-3' : 'grid-cols-2'}`}>
                            <Button
                                variant={orderType === OrderType.DINE_IN ? 'default' : 'outline'}
                                onClick={() => {
                                    setOrderType(OrderType.DINE_IN);
                                    setSelectedPaymentMethod(PaymentMethod.CASH);
                                    setSelectedPaymentProvider('');
                                    setCashReceived('');
                                }}
                                className="h-10 border-slate-300 transition-all font-bold"
                            >
                                內用
                            </Button>
                            <Button
                                variant={orderType === OrderType.TAKE_OUT ? 'default' : 'outline'}
                                onClick={() => {
                                    setOrderType(OrderType.TAKE_OUT);
                                    setSelectedPaymentMethod(PaymentMethod.CASH);
                                    setSelectedPaymentProvider('');
                                    setCashReceived('');
                                }}
                                className="h-10 border-slate-300 transition-all font-bold"
                            >
                                外帶
                            </Button>
                            {paymentMethods.includes('platform_collect') && (
                                <Button
                                    variant={orderType === OrderType.DELIVERY ? 'default' : 'outline'}
                                    onClick={() => {
                                        setOrderType(OrderType.DELIVERY);
                                        setSelectedPaymentMethod(PaymentMethod.PLATFORM_COLLECT);
                                        setCashReceived(roundedTotal.toString());
                                    }}
                                    className="h-10 border-slate-300 transition-all font-bold"
                                >
                                    外送
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-slate-500">服務費率 (%)</div>
                            <div className="flex items-center gap-1">
                                <span className={`font-bold ${orderType === OrderType.DINE_IN ? 'text-slate-900' : 'text-slate-300'}`}>
                                    {orderType === OrderType.DINE_IN ? serviceFeeRate : 0}%
                                </span>
                                {orderType !== OrderType.DINE_IN && (
                                    <span className="text-[10px] text-slate-400 font-normal ml-2">(僅內用計費)</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 mb-3">
                        <div className="text-sm font-medium text-slate-500 mb-1">
                            {orderType === OrderType.DELIVERY ? '外送平台' : '支付方式'}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {orderType === OrderType.DELIVERY ? (
                                deliveryPlatforms.filter(platform => platform.enabled !== false && platform.name.trim()).map((platform) => (
                                    <Button
                                        key={platform.id}
                                        variant="outline"
                                        className={cn("h-12 font-bold transition-colors", selectedDeliveryPlatform === platform.name ? "text-white shadow-sm" : "bg-transparent")}
                                        style={selectedDeliveryPlatform === platform.name
                                            ? { backgroundColor: platform.color || '#f97316', borderColor: platform.color || '#f97316', color: '#ffffff', outline: `2px solid ${platform.color || '#f97316'}`, outlineOffset: '2px' }
                                            : { borderColor: platform.color || '#f97316', color: platform.color || '#f97316' }}
                                        onClick={() => {
                                            setSelectedDeliveryPlatform(platform.name);
                                            setSelectedPaymentMethod(PaymentMethod.PLATFORM_COLLECT);
                                            setCashReceived(roundedTotal.toString());
                                        }}
                                    >
                                        {platform.name}
                                    </Button>
                                ))
                            ) : <>
                            {paymentMethods.includes('cash') && (
                                <Button
                                    variant={selectedPaymentMethod === PaymentMethod.CASH ? 'default' : 'outline'}
                                    className={cn("h-12 font-bold", selectedPaymentMethod === PaymentMethod.CASH ? "bg-slate-900 text-white" : "border-slate-300")}
                                    onClick={() => {
                                        setSelectedPaymentMethod(PaymentMethod.CASH);
                                        setSelectedPaymentProvider('');
                                        setCashReceived('');
                                    }}
                                >
                                    現金支付
                                </Button>
                            )}
                            {paymentMethods.includes('linepay') && multiPaymentMethods.filter(method => method.enabled !== false && method.name.trim()).map((method) => (
                                <Button
                                    key={method.id}
                                    variant="outline"
                                    className={cn("h-12 font-bold transition-colors", selectedPaymentProvider === method.name ? "text-white shadow-sm" : "bg-transparent")}
                                    style={selectedPaymentProvider === method.name
                                        ? { backgroundColor: method.color || '#16a34a', borderColor: method.color || '#16a34a', color: '#ffffff', outline: `2px solid ${method.color || '#16a34a'}`, outlineOffset: '2px' }
                                        : { borderColor: method.color || '#16a34a', color: method.color || '#16a34a' }}
                                    onClick={() => {
                                        setSelectedPaymentMethod(PaymentMethod.LINEPAY);
                                        setSelectedPaymentProvider(method.name);
                                        setCashReceived(roundedTotal.toString());
                                    }}
                                >
                                    {method.name}
                                </Button>
                            ))}
                            </>}
                        </div>
                        {orderType === OrderType.DELIVERY && deliveryPlatforms.filter(platform => platform.enabled !== false && platform.name.trim()).length === 0 && (
                            <p className="text-xs text-red-500">請先至系統設定新增外送平台</p>
                        )}
                    </div>

                    {/* Discount Selection */}
                    {discountPresets.length > 0 && (
                        <div className="space-y-2 mb-3">
                            <div className="text-sm font-medium text-slate-500 mb-1">優惠折扣</div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant={!selectedDiscount ? 'secondary' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedDiscount(null)}
                                    className="h-8 text-[11px] font-bold"
                                >
                                    無折扣
                                </Button>
                                {discountPresets.map((discount) => (
                                    <Button
                                        key={discount.id}
                                        variant={selectedDiscount?.id === discount.id ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSelectedDiscount(discount)}
                                        className={cn(
                                            "h-8 text-[11px] font-bold",
                                            selectedDiscount?.id === discount.id ? "bg-red-500 hover:bg-red-600 border-red-200" : "border-slate-300"
                                        )}
                                    >
                                        {discount.name} ({discount.type === 'percent' ? `${discount.value}%` : `$${discount.value}`})
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    </div>
                    <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-4">
                        <div className="bg-white p-4 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-center text-sm text-slate-500">
                                <span>商品小計</span>
                                <span className="font-mono">${subtotalValue}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-slate-500">
                                <span>服務費 ({currentServiceFeeRate}%)</span>
                                <span className="font-mono text-red-500">+${serviceFeeValue.toFixed(0)}</span>
                            </div>
                            {discountValue > 0 && (
                                <div className="flex justify-between items-center text-sm text-slate-500">
                                    <span>折扣 ({selectedDiscount?.name})</span>
                                    <span className="font-mono text-green-600">-${discountValue}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-sm text-slate-500">
                                <span>營業稅 ({taxRate}%{taxMode === 'inclusive' ? '・內含' : '・外加'})</span>
                                <span className="font-mono">{taxMode === 'exclusive' ? '+' : ''}${Math.round(taxValue)}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg font-bold text-slate-900 mt-2 pt-2 border-t border-slate-100 italic">
                                <span>應收 (已進位)</span>
                                <span className="font-mono text-2xl text-[#D4AF37]">
                                    ${roundedTotal}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-slate-500 mt-2">
                                <span>實收</span>
                                <span className="font-mono text-blue-600 font-bold">
                                    ${cashReceived || '0'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-slate-500 mt-2 pt-2 border-t border-dashed border-slate-200">
                                <span>找零</span>
                                <span className="font-mono text-lg font-bold">
                                    ${Math.max(0, (parseInt(cashReceived) || 0) - roundedTotal)}
                                </span>
                            </div>
                        </div>
                </div>
                </div>

                {/* Right: Keypad */}
                <div className="w-1/2 p-6 bg-white flex flex-col">
                    <div className="flex-1 flex flex-col justify-center pt-8 pb-4">
                        <div className="grid grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <Button
                                    key={num}
                                    variant="outline"
                                    className="text-3xl font-bold text-slate-700 h-20 hover:bg-slate-50 border-slate-300 transition-all active:scale-95"
                                    onClick={() => handleNumberClick(num.toString())}
                                >
                                    {num}
                                </Button>
                            ))}
                            <Button
                                variant="outline"
                                className="text-2xl font-bold text-red-600 h-20 border-slate-300 hover:bg-red-50 hover:border-red-300 transition-all"
                                onClick={handleClear}
                                title="清除 (C)"
                            >
                                C
                            </Button>
                            <Button
                                variant="outline"
                                className="text-3xl font-bold text-slate-700 h-20 border-slate-300 hover:bg-slate-50 transition-all active:scale-95"
                                onClick={() => handleNumberClick('0')}
                            >
                                0
                            </Button>
                            <Button
                                variant="outline"
                                className="text-2xl font-medium text-slate-600 h-20 border-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all"
                                onClick={handleBackspace}
                                title="刪除 (Backspace)"
                            >
                                ⌫
                            </Button>
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="mt-4">
                            <div className="text-xs font-medium text-slate-500 mb-2">快速金額</div>
                            <div className="grid grid-cols-4 gap-2">
                                {[100, 200, 500, 1000].map((amount) => (
                                    <Button
                                        key={amount}
                                        variant="outline"
                                        size="sm"
                                        className="text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 border-slate-300 transition-all"
                                        onClick={() => setCashReceived(amount.toString())}
                                    >
                                        ${amount}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <Button
                                variant="secondary"
                                className="h-16 text-lg font-bold bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all"
                                onClick={handleExactCash}
                            >
                                剛好
                            </Button>
                            <Button
                                className="h-16 text-xl font-bold bg-[#D4AF37] hover:bg-[#C5A028] text-white shadow-md transition-all active:scale-95"
                                onClick={handleCheckout}
                                disabled={(parseInt(cashReceived) || 0) < roundedTotal || isLoading || !paymentSelectionValid}
                            >
                                {isLoading ? '處理中...' : '結帳 (Enter)'}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    );
}
