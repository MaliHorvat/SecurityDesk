import type {
  customer,
  site,
  device,
  customerContact,
  building,
  floor,
  room,
} from "@securitydesk/database/schema";

export type Customer = typeof customer.$inferSelect;
export type Site = typeof site.$inferSelect;
export type Device = typeof device.$inferSelect;
export type CustomerContact = typeof customerContact.$inferSelect;
export type Building = typeof building.$inferSelect;
export type Floor = typeof floor.$inferSelect;
export type Room = typeof room.$inferSelect;

export type SiteListItem = { site: Site; customerName: string | null };
export type DeviceListItem = {
  device: Device;
  customerName: string | null;
  siteName: string | null;
  manufacturerName: string | null;
  deviceTypeName: string | null;
};

export type BuildingTree = Building & {
  floors: Array<Floor & { rooms: Room[] }>;
};
