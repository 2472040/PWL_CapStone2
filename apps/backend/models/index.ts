// Model index — loads all models and defines associations
import sequelize from '../config/database';

import User from './User';
import Room from './Room';
import Inventory from './Inventory';
import Bhp from './Bhp';
import Draft from './Draft';
import DraftItem from './DraftItem';
import DraftApproval from './DraftApproval';
import MaintenanceLog from './MaintenanceLog';
import MaintenanceBhp from './MaintenanceBhp';
import Receiving from './Receiving';
import Label from './Label';
import AuditLog from './AuditLog';
import RevokedToken from './RevokedToken';
import RefreshToken from './RefreshToken';
import MaintenanceSchedule from './MaintenanceSchedule';

// =============================================
// Associations
// =============================================

// Room ↔ User (PIC)
Room.belongsTo(User, { as: 'pic', foreignKey: 'pic_user_id' });
User.hasMany(Room, { as: 'managedRooms', foreignKey: 'pic_user_id' });

// Inventory ↔ Room
Inventory.belongsTo(Room, { foreignKey: 'room_id' });
Room.hasMany(Inventory, { foreignKey: 'room_id' });

// Bhp ↔ Room
Bhp.belongsTo(Room, { foreignKey: 'room_id' });
Room.hasMany(Bhp, { foreignKey: 'room_id' });

// Draft ↔ User (creator)
Draft.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });
User.hasMany(Draft, { as: 'drafts', foreignKey: 'created_by' });

// Draft ↔ User (finalizer)
Draft.belongsTo(User, { as: 'finalizer', foreignKey: 'finalized_by' });

// Draft ↔ DraftItem
Draft.hasMany(DraftItem, { as: 'items', foreignKey: 'draft_id', onDelete: 'CASCADE' });
DraftItem.belongsTo(Draft, { as: 'draft', foreignKey: 'draft_id' });

// DraftItem ↔ DraftApproval
DraftItem.hasOne(DraftApproval, {
  as: 'approval',
  foreignKey: 'draft_item_id',
  onDelete: 'CASCADE',
});
DraftApproval.belongsTo(DraftItem, { foreignKey: 'draft_item_id' });

// DraftApproval ↔ User (approver)
DraftApproval.belongsTo(User, { as: 'approver', foreignKey: 'approved_by' });

// MaintenanceLog ↔ Inventory
MaintenanceLog.belongsTo(Inventory, { foreignKey: 'inventory_id' });
Inventory.hasMany(MaintenanceLog, { as: 'maintenanceLogs', foreignKey: 'inventory_id' });

// MaintenanceSchedule ↔ Inventory
MaintenanceSchedule.belongsTo(Inventory, { foreignKey: 'inventory_id' });
Inventory.hasMany(MaintenanceSchedule, { as: 'maintenanceSchedules', foreignKey: 'inventory_id', onDelete: 'CASCADE' });

// MaintenanceLog ↔ User (technician)
MaintenanceLog.belongsTo(User, { as: 'technician', foreignKey: 'tech_user_id' });

// MaintenanceLog ↔ MaintenanceBhp
MaintenanceLog.hasMany(MaintenanceBhp, {
  as: 'bhpUsed',
  foreignKey: 'maintenance_log_id',
  onDelete: 'CASCADE',
});
MaintenanceBhp.belongsTo(MaintenanceLog, { foreignKey: 'maintenance_log_id' });

// MaintenanceBhp ↔ Bhp
MaintenanceBhp.belongsTo(Bhp, { foreignKey: 'bhp_id' });
Bhp.hasMany(MaintenanceBhp, { foreignKey: 'bhp_id' });

// Receiving ↔ DraftItem
Receiving.belongsTo(DraftItem, { foreignKey: 'draft_item_id' });
DraftItem.hasMany(Receiving, { as: 'receivings', foreignKey: 'draft_item_id' });

// Receiving ↔ User
Receiving.belongsTo(User, { as: 'receiver', foreignKey: 'received_by' });

// Label ↔ Inventory
Label.belongsTo(Inventory, { foreignKey: 'inventory_id' });
Inventory.hasOne(Label, { as: 'label', foreignKey: 'inventory_id' });

// AuditLog ↔ User
AuditLog.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(AuditLog, { foreignKey: 'user_id' });

// RefreshToken ↔ User
User.hasMany(RefreshToken, { foreignKey: 'user_id', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id' });

export {
  sequelize,
  User,
  Room,
  Inventory,
  Bhp,
  Draft,
  DraftItem,
  DraftApproval,
  MaintenanceLog,
  MaintenanceBhp,
  Receiving,
  Label,
  AuditLog,
  RevokedToken,
  RefreshToken,
  MaintenanceSchedule,
};
