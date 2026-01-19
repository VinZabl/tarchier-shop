# Bulk Input Output Examples

## How Bulk Input Works

Bulk input allows customers to fill custom fields (IGN, Server, etc.) once for multiple games. The system groups games with the same field values together in the output message.

---

## Example 1: Bulk Input - Same Values for All Games

### Scenario:
- **Games in Cart:**
  - Mobile Legends: Bang Bang
  - PUBG Mobile
  - Free Fire

- **Custom Fields:** IGN, Server (both games have same fields)
- **Bulk Input:**
  - Customer selects all 3 games with checkboxes
  - Fills: IGN = `Player123`, Server = `Server123`

### Output Message:

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

Payment: GCash

Payment Receipt: https://supabase.co/storage/v1/object/public/payment-receipts/...
```

**Explanation:**
- All three games are listed together (grouped)
- Fields are combined: "IGN, Server: Player123, Server123"
- This shows that all games share the same IGN and Server values
- The system automatically groups games with identical field values

---

## Example 2: Bulk Input - Multiple Fields, Same Values

### Scenario:
- **Games in Cart:**
  - Mobile Legends: Bang Bang
  - PUBG Mobile

- **Custom Fields:** IGN, Server, UID
- **Bulk Input Values:**
  - IGN: `Player123`
  - Server: `Server123`
  - UID: `123456789`

### Output Message:

```
Mobile Legends: Bang Bang
PUBG Mobile
IGN, Server & UID: Player123, Server123, 123456789

ORDER DETAILS:
• Mobile Legends: Bang Bang (Diamond Package 100) x1 - ₱100
• PUBG Mobile (UC Package 500) x1 - ₱500

TOTAL: ₱600

Payment: Maya

Payment Receipt: https://supabase.co/storage/v1/object/public/payment-receipts/...
```

**Explanation:**
- When there are 3+ fields with the same values, they're combined with "&" before the last field
- Format: "Field1, Field2 & Field3: value1, value2, value3"

---

## Example 3: Mixed - Some Games Use Bulk, Some Don't

### Scenario:
- **Games in Cart:**
  - Mobile Legends: Bang Bang (uses bulk input)
  - PUBG Mobile (uses bulk input)
  - Free Fire (individual input with different values)

- **Bulk Input (for ML & PUBG):**
  - IGN: `Player123`
  - Server: `Server123`

- **Individual Input (for Free Fire):**
  - IGN: `Player456`
  - Server: `Server456`

### Output Message:

```
Mobile Legends: Bang Bang
PUBG Mobile
IGN, Server: Player123, Server123

Free Fire
IGN: Player456
Server: Server456

ORDER DETAILS:
• Mobile Legends: Bang Bang (Diamond Package 100) x1 - ₱100
• PUBG Mobile (UC Package 500) x1 - ₱500
• Free Fire (Diamond Package 200) x1 - ₱200

TOTAL: ₱800

Payment: GCash

Payment Receipt: https://supabase.co/storage/v1/object/public/payment-receipts/...
```

**Explanation:**
- Games with same values are grouped together
- Games with different values are shown separately

---

## Example 4: Bulk Input - Different Field Counts

### Scenario:
- **Games in Cart:**
  - Mobile Legends: Bang Bang (has IGN, Server)
  - PUBG Mobile (has UID, Server)
  - Free Fire (has IGN only)

- **Bulk Input (applied to all 3):**
  - Field 0 (IGN/UID): `Player123`
  - Field 1 (Server): `Server123`

### Output Message:

```
Mobile Legends: Bang Bang
IGN: Player123
Server: Server123

PUBG Mobile
UID: Player123
Server: Server123

Free Fire
IGN: Player123

ORDER DETAILS:
• Mobile Legends: Bang Bang (Diamond Package 100) x1 - ₱100
• PUBG Mobile (UC Package 500) x1 - ₱500
• Free Fire (Diamond Package 200) x1 - ₱200

TOTAL: ₱800

Payment: GCash

Payment Receipt: https://supabase.co/storage/v1/object/public/payment-receipts/...
```

**Explanation:**
- Bulk input applies values by position (index)
- Each game shows only its configured fields
- Values are applied at the same position across games

---

## Example 5: Complex - Multiple Groups

### Scenario:
- **Games in Cart:**
  - Mobile Legends: Bang Bang
  - PUBG Mobile
  - Free Fire
  - Call of Duty Mobile

- **Bulk Input Group 1 (ML, PUBG, FF):**
  - IGN: `Player123`
  - Server: `Server123`

- **Individual Input (COD):**
  - IGN: `Player999`
  - Server: `Server999`

### Output Message:

```
Mobile Legends: Bang Bang
PUBG Mobile
Free Fire
IGN, Server: Player123, Server123

Call of Duty Mobile
IGN: Player999
Server: Server999

ORDER DETAILS:
• Mobile Legends: Bang Bang (Diamond Package 100) x1 - ₱100
• PUBG Mobile (UC Package 500) x1 - ₱500
• Free Fire (Diamond Package 200) x1 - ₱200
• Call of Duty Mobile (CP Package 300) x1 - ₱300

TOTAL: ₱1100

Payment: Bank Transfer

Payment Receipt: https://supabase.co/storage/v1/object/public/payment-receipts/...
```

---

## Key Features of Bulk Input Output

1. **Grouping by Values:**
   - Games with identical field values are grouped together
   - Reduces repetition in the message

2. **Field Combination:**
   - If all field values are the same: `"Field1, Field2 & Field3: value1, value2, value3"`
   - If values differ: Each field shown separately

3. **Position-Based Application:**
   - Bulk input applies values by field position (index)
   - Field at position 0 goes to all games' field at position 0
   - Field at position 1 goes to all games' field at position 1
   - etc.

4. **Smart Formatting:**
   - Games listed first (one per line)
   - Then field labels and values
   - Clean, readable format

---

## Visual Flow

### Step 1: Customer Selects Games for Bulk Input
```
☑ Mobile Legends: Bang Bang
☑ PUBG Mobile
☑ Free Fire
```

### Step 2: Customer Fills Bulk Fields
```
IGN (Bulk) *: [Player123]
Server (Bulk) *: [Server123]
```

### Step 3: System Applies to Selected Games
- Mobile Legends gets: IGN=Player123, Server=Server123
- PUBG Mobile gets: IGN=Player123, Server=Server123
- Free Fire gets: IGN=Player123, Server=Server123

### Step 4: Output Groups Them Together
```
Mobile Legends: Bang Bang
PUBG Mobile
Free Fire
IGN, Server: Player123, Server123
```

---

## Database Storage

The `customer_info` in the database stores individual values per game:

```json
{
  "Payment Method": "GCash",
  "mobile_legends_0_ign": "Player123",
  "mobile_legends_1_server": "Server123",
  "pubg_mobile_0_ign": "Player123",
  "pubg_mobile_1_server": "Server123",
  "free_fire_0_ign": "Player123",
  "free_fire_1_server": "Server123"
}
```

But the message output groups them intelligently for readability.
