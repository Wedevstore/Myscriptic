<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $order->order_number }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        .muted { color: #666; font-size: 11px; }
        .totals { margin-top: 16px; width: 280px; margin-left: auto; }
        .totals td { border: none; padding: 4px 8px; }
        .totals .label { text-align: right; color: #444; }
    </style>
</head>
<body>
    <h1>MyScriptic</h1>
    <p class="muted">Digital content invoice</p>
    <p><strong>Order:</strong> {{ $order->order_number }}<br>
       <strong>Date:</strong> {{ $order->paid_at?->format('Y-m-d H:i') ?? $order->created_at->format('Y-m-d H:i') }}<br>
       <strong>Customer:</strong> {{ $order->user->name ?? '' }} ({{ $order->user->email ?? '' }})</p>

    <table>
        <thead>
            <tr>
                <th>Item</th>
                <th>Author</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Line</th>
            </tr>
        </thead>
        <tbody>
            @foreach($order->items as $item)
                <tr>
                    <td>{{ $item->title }}</td>
                    <td>{{ $item->author_name }}</td>
                    <td>{{ $item->quantity }}</td>
                    <td>{{ $order->currency }} {{ number_format($item->unit_price, 2) }}</td>
                    <td>{{ $order->currency }} {{ number_format($item->unit_price * $item->quantity, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr><td class="label">Subtotal</td><td>{{ $order->currency }} {{ number_format($order->subtotal, 2) }}</td></tr>
        <tr><td class="label">Discount</td><td>{{ $order->currency }} {{ number_format($order->discount, 2) }}</td></tr>
        <tr><td class="label">Tax</td><td>{{ $order->currency }} {{ number_format($order->tax, 2) }}</td></tr>
        <tr><td class="label"><strong>Total</strong></td><td><strong>{{ $order->currency }} {{ number_format($order->total_amount, 2) }}</strong></td></tr>
    </table>

    <p class="muted" style="margin-top: 24px;">Payment ref: {{ $order->payment_ref ?? '—' }} · Gateway: {{ $order->payment_gateway }}</p>
</body>
</html>
