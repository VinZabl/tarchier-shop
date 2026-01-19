# Message Formats & Outputs

This document describes all message formats and outputs used in the Tarchier Discounted Shop application.

## 1. Order Message Format (for Messenger)

The order message is generated when customers place orders via Messenger. This message is copied to clipboard and can be sent via Facebook Messenger.

### Format Structure

```
[CUSTOM FIELDS SECTION]
[Game names if multiple games with custom fields]

ORDER DETAILS:
• [Item Name] ([Variation Name]) x[Quantity] - ₱[Total Price]
• [Item Name] x[Quantity] - ₱[Total Price]
...

TOTAL: ₱[Total Price]

Payment: [Payment Method Name]

Payment Receipt: [Receipt URL]
```

### Examples

#### Example 1: Single Game with IGN
```
IGN: Player123

ORDER DETAILS:
• Mobile Legends: Bang Bang (Diamond Package 100) x2 - ₱200
• Mobile Legends: Bang Bang (Diamond Package 50) x1 - ₱50

TOTAL: ₱250

Payment: GCash

Payment Receipt: https://supabase.co/storage/v1/object/public/payment-receipts/...
```

#### Example 2: Multiple Games with Custom Fields (Bulk Input)
```
Mobile Legends: Bang Bang
PUBG Mobile
Free Fire
IGN, Server: Player123, Server123

ORDER DETAILS:
• Mobile Legends: Bang Bang (Diamond Package 100) x1 - ₱100
• PUBG Mobile (UC Package 500) x1 - ₱500
• Free Fire (Diamond Package 200) x1 - ₱200

TOTAL: ₱800

Payment: Maya

Payment Receipt: https://supabase.co/storage/v1/object/public/payment-receipts/...
```

#### Example 3: Multiple Games with Different Field Values
```
Mobile Legends: Bang Bang
IGN: Player123
Server: Server123

PUBG Mobile
IGN: Player456
Server: Server456

ORDER DETAILS:
• Mobile Legends: Bang Bang (Diamond Package 100) x1 - ₱100
• PUBG Mobile (UC Package 500) x1 - ₱500

TOTAL: ₱600

Payment: Bank Transfer

Payment Receipt: https://supabase.co/storage/v1/object/public/payment-receipts/...
```

#### Example 4: Items with Add-ons
```
IGN: Player789

ORDER DETAILS:
• Mobile Legends: Bang Bang (Diamond Package 100) x1 - ₱100
• PUBG Mobile (UC Package 500) x1 - ₱500

TOTAL: ₱600

Payment: GCash

Payment Receipt: https://supabase.co/storage/v1/object/public/payment-receipts/...
```

### Custom Fields Logic

1. **If items have custom fields:**
   - Groups games by their field values
   - If multiple games share the same field values, they are grouped together
   - If all field values are the same across multiple fields, combines labels (e.g., "IGN & Server: Player123")
   - If field values differ, shows each field separately

2. **If no custom fields:**
   - Shows default "IGN: [value]" format

3. **Bulk Input:**
   - When bulk input is used, games with the same field values are grouped
   - Field values are applied by position (index) across selected games

## 2. Order Status Messages

### Status Display Text

| Status | Display Text | Icon | Color |
|--------|--------------|------|-------|
| `pending` | "Processing" | Loader2 (spinning) | #145885 (Blue) |
| `processing` | "Processing" | Loader2 (spinning) | #145885 (Blue) |
| `approved` | "Succeeded" | CheckCircle | #145885 (Blue) |
| `rejected` | "Rejected" | XCircle | #145885 (Blue) |

### Order Status Modal Messages

**While Processing:**
```
Please do not exit this website while your order is being processed
```

**Order Status Display:**
```
Order Status
Order #[first 8 characters of order ID]
```

**Status Messages:**
- Processing (with spinning loader)
- Succeeded (with checkmark)
- Rejected (with X icon)

## 3. Admin Dashboard Messages

### Order Status Badges

- **Pending**: Yellow badge with "Pending" text
- **Processing**: Blue badge with "Processing" text
- **Approved**: Custom styled badge with "Approved" text
- **Rejected**: Custom styled badge with "Rejected" text

### Time Indicators

- **"New"**: Green badge (orders less than 60 seconds old)
- **"X mins ago"**: Gray badge (orders less than 1 hour old)
- **"X hours ago"**: Gray badge (orders less than 24 hours old)
- **"X days ago"**: Gray badge (orders older than 24 hours)

### Order Summary Format

```
Order #[first 8 characters]
[Status Badge]
[Timestamp]

Total Price: ₱[amount]
Items: [count] item(s)
MOP: [payment method]
```

## 4. Customer Information Display

### Single Account Mode
```
Customer Information
IGN: Player123
Server: Server123
Payment Method: GCash
```

### Multiple Accounts Mode
```
Customer Information
Mobile Legends: Bang Bang
Package: Diamond Package 100
IGN: Player123
Server: Server123

PUBG Mobile
Package: UC Package 500
IGN: Player456
Server: Server456
```

## 5. Messenger URL Format

When placing order via Messenger, the URL format is:

```
https://m.me/Rnold77?text=[URL_ENCODED_ORDER_MESSAGE]
```

The order message is URL-encoded before being appended to the Messenger URL.

## 6. Notification Messages

### Audio Notifications
- Plays `/notifSound.mp3` when new orders arrive
- Volume controlled by `notification_volume` setting (default: 0.5)
- Only plays for orders with status `pending` or `processing`
- Requires user interaction to unlock audio context (browser security)

### Visual Indicators
- New order count badge in admin dashboard
- "New" badge on orders less than 60 seconds old
- Real-time updates via Supabase subscriptions
- Polling fallback every 5 seconds

## 7. Error Messages

### Checkout Errors
- `"Please select a payment method"`
- `"Please upload your payment receipt before placing the order"`
- `"Please fill in all required fields"`

### Order Status Errors
- `"Order not found"` - When order ID doesn't exist
- `"Failed to fetch order"` - Network/database errors

## 8. Success Messages

### Order Placement
- Order status modal appears automatically
- Shows "Processing" status
- Displays order ID and details

### Order Completion
- **Approved**: Shows "Succeeded" status with checkmark
- **Rejected**: Shows "Rejected" status with X icon

## 9. Footer Messages

### Order Status Modal Footer
```
by Tarchier Discounted Shop
```

## 10. Support Messages

### Support Link (if configured)
```
Having trouble or issues? Tap here to contact us
```
- Links to `footer_support_url` from site settings
- Only shown in order status modal if URL is configured

## Message Generation Code Location

- **Order Message Generation**: `src/components/Checkout.tsx` - `generateOrderMessage()` function (lines 243-322)
- **Order Status Display**: `src/components/OrderStatusModal.tsx`
- **Admin Order Display**: `src/components/OrderManager.tsx`
- **Messenger URL**: `src/components/Checkout.tsx` - `handlePlaceOrderViaMessenger()` function (line 460)

## Notes

1. All prices are formatted with ₱ (Philippine Peso) symbol
2. Order IDs are truncated to first 8 characters for display
3. Timestamps use `toLocaleString()` for localized formatting
4. Custom fields are dynamically generated based on menu item configuration
5. Bulk input allows applying the same field values to multiple games at once
6. Message format adapts based on whether custom fields exist or not
