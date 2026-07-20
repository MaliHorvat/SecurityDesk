# Parts & Inventory

Modul za skladišče, materiale, serijske številke, prenose, rezervacije, naročila, RMA in inventuro.

## Poti

- `/inventory` — dashboard
- `/inventory/items` — artikli
- `/inventory/locations` — lokacije
- `/inventory/stock` — zaloga
- `/inventory/movements` — premiki (append-only)
- `/inventory/reservations` — rezervacije
- `/inventory/purchase-orders` — nabavna naročila
- `/inventory/rma` — RMA
- `/inventory/stocktakes` — inventura
- `/inventory/reports` — poročila

## Povezave

- Na strani naprave: tloris lokacija, inventarna serijska, garancija, RMA
- Materiali na work order / report lahko vključujejo `inventoryItemId` / `inventorySku`
- Serijska enota se lahko poveže na `device_id`

## Zaloga

`inventory_stock.version` se uporablja za optimistično sočasnost. Premiki se ne brišejo.

## Inventura

Med inventuro se premiki še vedno beležijo; ob zaključku nastanejo `stocktakeCorrection` premiki.

## Dovoljenja

Glej `inventory:*` v `packages/shared/src/permissions.ts`. Finančne vrednosti so zaščitene z `inventory:financials`.
