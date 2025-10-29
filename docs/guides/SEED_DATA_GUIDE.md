# Seed Data Guide

## Overview
The enhanced seed script generates realistic, demo-quality data for the Electric Abacus application. This data is designed to showcase the application's capabilities with authentic business operations data.

## What Gets Generated

### 👥 Users (2)
- **Admin Account**: `admin@electricabacus.test` / `AdminPass123!`
- **Staff Account**: `staff@electricabacus.test` / `StaffPass123!`

### 🥫 Ingredients (31)

#### Food Items (20)
- Proteins: Seasoned Beef, Grilled Chicken
- Beans: Refried Beans, Black Beans
- Shells & Breads: Taco Shells, Tostada Shells, Flour Tortillas, Burger Buns
- Dairy: Cheddar Cheese, Sour Cream
- Produce: Shredded Lettuce, Diced Tomatoes, Diced Onions
- Sauces & Condiments: Taco Sauce, Salsa, Guacamole
- Sides: Spanish Rice, Corn Chips, Chili Base, Jalapeños

#### Paper Goods (8)
- To-Go Containers (Small & Large)
- Drink Cups (16oz & 32oz)
- Cup Lids
- Paper Bags
- Napkins
- Straws

#### Other Supplies (3)
- Fryer Oil
- Cleaning Solution
- Disposable Gloves

### 🌮 Menu Items (15)
- **Tacos**: Soft Taco ($2.29)
- **Tostadas**: Bean ($3.29), Beef ($3.79), Grande ($4.49)
- **Burritos**: Bean ($2.69), Combo ($3.69), Chili ($3.99), Chicken ($4.29), Supreme ($5.49)
- **Specialties**: Taco Burger ($3.49), Nachos Supreme ($5.99), Rice Bowl ($4.79)
- **Sides**: Refried Beans ($2.19), Chips & Salsa ($1.99), Chips & Guacamole ($2.99)

All menu items have complete recipes with realistic ingredient quantities designed to achieve 25-35% food cost percentages.

### 📅 Weekly Data

#### Historical Weeks (6 finalized)
**Weeks**: 2025-W33, 2025-W34, 2025-W35, 2025-W36, 2025-W37, 2025-W38

Each historical week includes:

**Sales Data (7 days)**
- Food sales: $400-$700 on weekdays, $800-$1,200 on weekends
- Drink sales: 15-25% of food sales
- Sales tax: ~8.5% of gross sales
- Promotions: 0-8% (varies by day)
- Weekly gross total: $4,000-$6,500

**Inventory Tracking**
- Beginning inventory (from previous week's ending)
- Received quantities (realistic restock amounts)
- Ending inventory
- Computed usage showing 20-40% usage rates
- High-volume items (beef, beans, shells) have larger restock quantities

**Cost Reports**
- Total cost of sales: $1,000-$2,000 per week
- Food cost percentage: ~28-34%
- Full ingredient breakdown with costs
- Version tracking for ingredient prices

#### Current Draft Week
**Week**: 2025-W39

The current draft week is initialized with:
- Empty sales data (ready for new entries)
- Beginning inventory from previous week
- No finalized data (status: draft)

## Data Generation Features

### Realistic Patterns
- **Weekend Effect**: Higher sales on Saturday/Sunday
- **Usage Patterns**: High-use ingredients tracked separately
- **Inventory Flow**: Each week's ending becomes next week's beginning
- **Price Consistency**: All ingredients use version 2025-v1
- **Week-to-Week Variation**: Sine wave pattern adds natural variation

### Data Quality
- All monetary values rounded to 2 decimal places
- Unit costs calculated to 4 decimal places
- Realistic ingredient usage rates (20-40% of available)
- Sales tax at 8.5% (realistic for many US locations)
- Promotion frequency matches typical patterns (more on slow days)

## Running the Seed Script

### Prerequisites
1. Firebase project configured
2. Environment variables set in `.env`:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

### Command
```bash
npm run seed
```

or

```bash
npm --workspace packages/firebase run seed
```

### Expected Output
```
🌱 Starting seed process...
👥 Creating users...
✅ Created 2 users
🥫 Creating ingredients...
✅ Created 31 ingredients
🌮 Creating menu items...
✅ Created 15 menu items
📅 Creating historical weeks...
  Creating week 2025-W33...
  Creating week 2025-W34...
  ...
✅ Created 6 finalized weeks
📝 Creating current draft week...
✅ Created draft week 2025-W39

🎉 Seed data created successfully!

📊 Summary:
  - 2 users
  - 31 ingredients
  - 15 menu items
  - 6 finalized weeks
  - 1 draft week

🔑 Login Credentials:
  Owner: admin@electricabacus.test / AdminPass123!
  Team Member: staff@electricabacus.test / StaffPass123!
```

## Use Cases

### Demo & Presentation
- Show complete week lifecycle (draft → finalized)
- Display realistic cost reports and food cost percentages
- Demonstrate inventory tracking across multiple weeks
- Export professional PDF reports with actual data

### Testing
- Test week review and finalization features
- Verify cost calculations with pre-populated data
- Test sales entry with realistic daily patterns
- Validate inventory usage calculations

### Development
- Develop new features with substantial existing data
- Test queries and filters with real-world data volumes
- Verify role-based access with multiple user types
- Debug with consistent, reproducible data

## Data Structure Details

### Ingredient Categories
- **food**: Items that go into recipes
- **paper**: Packaging and serving supplies
- **other**: Operational supplies (oil, cleaners, etc.)

### Week Status
- **draft**: Active week being edited
- **finalized**: Completed week with locked reports

### Sales Day Structure
```typescript
{
  foodSales: number,      // Food revenue
  drinkSales: number,     // Beverage revenue
  lessSalesTax: number,   // Sales tax deducted
  lessPromo: number       // Promotions/discounts
}
```

### Inventory Entry Structure
```typescript
{
  ingredientId: string,
  begin: number,          // Starting inventory
  received: number,       // Received during week
  end: number            // Ending inventory
}
```

## Future Enhancements

Potential improvements to the seed script:
- Add ingredient price variations (multiple versions)
- Generate batch ingredients with recipes
- Include more dramatic week-to-week variations
- Add seasonal sales patterns
- Generate user activity logs
- Create error/edge case scenarios for testing

## Troubleshooting

### Script Fails to Run
- Verify Firebase credentials in `.env`
- Check Firebase project permissions
- Ensure Admin SDK is properly initialized

### Duplicate Data
- Script is idempotent for users (won't create duplicates)
- Will overwrite existing weeks and ingredients
- Run with caution on production databases

### Performance
- Script takes 30-60 seconds to complete
- Creates ~200 Firestore documents
- Uses batch operations where possible for efficiency
