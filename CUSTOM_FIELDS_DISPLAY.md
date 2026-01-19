# Custom Fields Display Guide

## Where Custom Fields Appear

### 1. Checkout Form - "Order Details" Step

The custom fields (IGN, Server, etc.) appear in the checkout form when you click "Checkout" from the cart.

**Location:** `src/components/Checkout.tsx` - Step 1: "details"

#### Display Logic:

1. **If menu items have custom fields configured:**
   - Shows fields grouped by game/item
   - Each game shows its own set of custom fields
   - Fields are labeled with their configured labels (e.g., "IGN", "Server", "UID", etc.)

2. **If NO custom fields are configured:**
   - Shows a default "IGN" field
   - Single input field for In-Game Name

3. **Bulk Input (if 2+ games with custom fields):**
   - Shows checkboxes to select multiple games
   - Allows filling fields once for all selected games
   - Applies values by position/index

---

## Visual Layout

### Scenario 1: Items WITH Custom Fields

```
┌─────────────────────────────────────┐
│ Customer Information                │
├─────────────────────────────────────┤
│                                     │
│ 2 games require additional          │
│ information                         │
│                                     │
│ ┌─ Bulk Input ───────────────────┐ │
│ │ Select games:                   │ │
│ │ ☑ Mobile Legends: Bang Bang    │ │
│ │ ☑ PUBG Mobile                  │ │
│ │                                 │ │
│ │ IGN (Bulk) *                    │ │
│ │ [________________]              │ │
│ │                                 │ │
│ │ Server (Bulk) *                 │ │
│ │ [________________]              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ Mobile Legends: Bang Bang ────┐ │
│ │ Please provide the following    │ │
│ │ information for this game       │ │
│ │                                 │ │
│ │ IGN *                           │ │
│ │ [________________]              │ │
│ │                                 │ │
│ │ Server *                        │ │
│ │ [________________]              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─ PUBG Mobile ─────────────────┐ │
│ │ Please provide the following    │ │
│ │ information for this game       │ │
│ │                                 │ │
│ │ UID *                           │ │
│ │ [________________]              │ │
│ │                                 │ │
│ │ Server *                        │ │
│ │ [________________]              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Proceed to Payment]                │
└─────────────────────────────────────┘
```

### Scenario 2: Items WITHOUT Custom Fields (Default)

```
┌─────────────────────────────────────┐
│ Customer Information                │
├─────────────────────────────────────┤
│                                     │
│ IGN *                               │
│ [________________]                  │
│                                     │
│ [Proceed to Payment]                │
└─────────────────────────────────────┘
```

---

## Code Location

### Custom Fields Detection
**File:** `src/components/Checkout.tsx`
**Lines:** 56-69

```typescript
const itemsWithCustomFields = useMemo(() => {
  const itemsWithFields = cartItems.filter(item => 
    item.customFields && item.customFields.length > 0
  );
  // Deduplicate by original menu item ID
  const uniqueItems = new Map<string, typeof cartItems[0]>();
  itemsWithFields.forEach(item => {
    const originalId = getOriginalMenuItemId(item.id);
    if (!uniqueItems.has(originalId)) {
      uniqueItems.set(originalId, item);
    }
  });
  return Array.from(uniqueItems.values());
}, [cartItems]);

const hasAnyCustomFields = itemsWithCustomFields.length > 0;
```

### Custom Fields Display
**File:** `src/components/Checkout.tsx`
**Lines:** 716-751

```typescript
{hasAnyCustomFields ? (
  itemsWithCustomFields.map((item, itemIndex) => (
    <div key={item.id} className="space-y-4 pb-6 border-b border-cafe-primary/20 last:border-b-0 last:pb-0">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-cafe-text">{item.name}</h3>
        <p className="text-sm text-cafe-textMuted">
          Please provide the following information for this game
        </p>
      </div>
      {item.customFields?.map((field, fieldIndex) => (
        // Render input field for each custom field
      ))}
    </div>
  ))
) : (
  // Default IGN field
  <div>
    <label>IGN <span className="text-red-500">*</span></label>
    <input
      value={customFieldValues['default_ign'] || ''}
      placeholder="In game name"
      required
    />
  </div>
)}
```

---

## How Custom Fields Are Configured

Custom fields are configured in the **Admin Dashboard** when adding/editing menu items.

**Location:** `src/components/AdminDashboard.tsx`
**Section:** Menu Item Form → Custom Fields

### Adding Custom Fields:
1. Go to Admin Dashboard → Menu Items → Add/Edit Item
2. Scroll to "Custom Fields" section
3. Click "Add Field"
4. Configure:
   - **Field Label** (e.g., "IGN", "Server", "UID")
   - **Field Key** (internal identifier)
   - **Required** (checkbox)
   - **Placeholder** (optional)

---

## Output in Order Message

Custom fields appear in the order message like this:

```
IGN: Player123
Server: Server123

ORDER DETAILS:
• Mobile Legends: Bang Bang (Diamond Package 100) x1 - ₱100
...
```

Or with multiple games:

```
Mobile Legends: Bang Bang
IGN: Player123
Server: Server123

PUBG Mobile
UID: 123456789
Server: Server456

ORDER DETAILS:
...
```

---

## Troubleshooting

### Custom Fields Not Showing?

1. **Check if menu items have custom fields:**
   - Go to Admin Dashboard
   - Edit the menu item
   - Check if "Custom Fields" section has fields configured

2. **Check database:**
   - Custom fields are stored in `menu_items.custom_fields` (JSONB column)
   - Should be an array of objects: `[{label: "IGN", key: "ign", required: true}, ...]`

3. **Check cart items:**
   - Custom fields come from the menu item
   - Make sure items in cart have `customFields` property populated

4. **Default IGN field:**
   - If no custom fields are configured, the default "IGN" field should appear
   - If even that doesn't show, check the form rendering logic

---

## Example Custom Fields Configuration

### Database Format:
```json
[
  {
    "label": "IGN",
    "key": "ign",
    "required": true,
    "placeholder": "Enter your in-game name"
  },
  {
    "label": "Server",
    "key": "server",
    "required": true,
    "placeholder": "Enter server name"
  }
]
```

### Display Result:
- Two input fields appear for each game
- Labels: "IGN *" and "Server *"
- Placeholders show the configured placeholder text
- Both are required (marked with red asterisk)
