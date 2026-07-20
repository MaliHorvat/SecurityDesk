import {
  INVENTORY_ITEM_TYPES,
  INVENTORY_LOCATION_TYPES,
  INVENTORY_MOVEMENT_TYPES,
  INVENTORY_UNITS,
  type InventoryItemType,
  type InventoryLocationType,
  type InventoryMovementType,
} from "@securitydesk/shared";

export const INVENTORY_ITEM_TYPE_LABELS: Record<InventoryItemType, string> = {
  device: "Naprava",
  sparePart: "Rezervni del",
  consumable: "Potrošni material",
  cable: "Kabel",
  license: "Licenca",
  tool: "Orodje",
  serviceItem: "Servisna postavka",
  other: "Drugo",
};

export const INVENTORY_LOCATION_TYPE_LABELS: Record<InventoryLocationType, string> = {
  warehouse: "Skladišče",
  shelf: "Polica",
  vehicle: "Vozilo",
  technician: "Tehnik",
  project: "Projekt",
  service: "Servis",
  customerSite: "Lokacija stranke",
  quarantine: "Karantena",
  rma: "RMA",
  other: "Drugo",
};

export const INVENTORY_MOVEMENT_TYPE_LABELS: Record<InventoryMovementType, string> = {
  receipt: "Prejem",
  transfer: "Prenos",
  reservation: "Rezervacija",
  reservationRelease: "Sprostitev rezervacije",
  issue: "Izdaja",
  installation: "Montaža",
  consumption: "Poraba",
  return: "Vračilo",
  adjustmentIncrease: "Povečanje",
  adjustmentDecrease: "Zmanjšanje",
  rmaDispatch: "RMA odprema",
  rmaReturn: "RMA vračilo",
  scrap: "Odpis",
  stocktakeCorrection: "Popravek inventure",
};

export { INVENTORY_ITEM_TYPES, INVENTORY_LOCATION_TYPES, INVENTORY_MOVEMENT_TYPES, INVENTORY_UNITS };
