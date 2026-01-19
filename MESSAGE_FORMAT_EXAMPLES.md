# Updated Message Format Examples

## Order Message Format (for Messenger)

The order message now includes customer contact information at the top.

### Format Structure

```
Customer Name: [Customer Name]
Contact Number: [Contact Number]

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

---

## Example 1: Single Game with IGN

**Input:**
- Customer Name: "Juan Dela Cruz"
- Contact Number: "09123456789"
- IGN: "Player123"
- Items: Mobile Legends Diamond Package 100 (x2), Diamond Package 50 (x1)

**Output:**
```
Customer Name: Juan Dela Cruz
Contact Number: 09123456789

IGN: Player123

ORDER DETAILS:
• Mobile Legends: Bang Bang (Diamond Package 100) x2 - ₱200
• Mobile Legends: Bang Bang (Diamond Package 50) x1 - ₱50

TOTAL: ₱250

Payment: GCash

Payment Receipt: https://supabase.co/storage/v1/object/public/payment-receipts/abc123.jpg
```

---

## Example 2: Multiple Games with Custom Fields (Bulk Input)

**Input:**
- Customer Name: "Maria Santos"
- Contact Number: "09987654321"
- Games: Mobile Legends, PUBG Mobile, Free Fire
- Bulk IGN: "Player123"
- Bulk Server: "Server123"

**Output:**
```
Customer Name: Maria Santos
Contact Number: 09987654321

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

Payment Receipt: https://supabase.co/storage/v1/object/public/payment-receipts/xyz789.jpg
```

---

## Example 3: Multiple Games with Different Field Values

**Input:**
- Customer Name: "John Smith"
- Contact Number: "09111111111"
- Mobile Legends: IGN "Player123", Server "Server123"
- PUBG Mobile: IGN "Player456", Server "Server456"

**Output:**
```
Customer Name: John Smith
Contact Number: 09111111111

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

Payment Receipt: https://supabase.co/storage/v1/object/public/payment-receipts/def456.jpg
```

---

## Example 4: Items with Add-ons

**Input:**
- Customer Name: "Anna Garcia"
- Contact Number: "09222222222"
- IGN: "Player789"
- Items with add-ons

**Output:**
```
Customer Name: Anna Garcia
Contact Number: 09222222222

IGN: Player789

ORDER DETAILS:
• Mobile Legends: Bang Bang (Diamond Package 100) x1 - ₱100
• PUBG Mobile (UC Package 500) x1 - ₱500

TOTAL: ₱600

Payment: GCash

Payment Receipt: https://supabase.co/storage/v1/object/public/payment-receipts/ghi789.jpg
```

---

## Customer Information in Database

The `customer_info` object stored in the database now includes:

```json
{
  "Customer Name": "Juan Dela Cruz",
  "Contact Number": "09123456789",
  "IGN": "Player123",
  "Payment Method": "GCash"
}
```

Or with multiple custom fields:

```json
{
  "Customer Name": "Maria Santos",
  "Contact Number": "09987654321",
  "IGN": "Player123",
  "Server": "Server123",
  "Payment Method": "Maya"
}
```

---

## Display in Order Status Modal (Customer View)

The customer information is displayed as:

```
Customer Information
Customer Name: Juan Dela Cruz
Contact Number: 09123456789
IGN: Player123
Payment Method: GCash
```

---

## Display in Admin Order Manager

The admin sees the same customer information:

```
Customer Information
Customer Name: Juan Dela Cruz
Contact Number: 09123456789
IGN: Player123
Payment Method: GCash
```

---

## Checkout Form Flow

### Step 1: Customer Information (NEW)
- ✅ Customer Name (required)
- ✅ Contact Number (required)

### Step 2: Game-Specific Fields
- IGN (if no custom fields)
- OR Custom fields per game (if configured)

### Step 3: Payment
- Payment method selection
- QR code display
- Receipt upload

### Step 4: Order Placement
- Order message generation (includes all info)
- Order creation in database
- Status tracking

---

## Validation Rules

1. **Customer Name**: Required, must not be empty
2. **Contact Number**: Required, must not be empty
3. **Custom Fields**: 
   - If no custom fields configured: IGN is required
   - If custom fields configured: All required custom fields must be filled

---

## Changes Summary

✅ **Added** Customer Name field to checkout form
✅ **Added** Contact Number field to checkout form
✅ **Updated** customer_info object to include Customer Name and Contact Number
✅ **Updated** order message format to include customer contact info at the top
✅ **Updated** validation to require customer information
✅ **Automatic display** in order status modal and admin panel (no code changes needed)
