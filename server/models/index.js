// Model index — loads all models and defines associations
const sequelize = require('../config/database');

const User = require('./User');
const Room = require('./Room');
const Inventory = require('./Inventory');
const Bhp = require('./Bhp');
const Draft = require('./Draft');
const DraftItem = require('./DraftItem');
const DraftApproval = require('./DraftApproval');
const MaintenanceLog = require('./MaintenanceLog');
const MaintenanceBhp = require('./MaintenanceBhp');
const Receiving = require('./Receiving');
const Label = require('./Label');
const AuditLog = require('./AuditLog');

// =============================================
// Associations
// =============================================

// Room ↔ User (PIC)
Room.belongsTo(User, { as: 'pic', foreignKey: 'pic_user_id' });
User.hasMany(Room, { as: 'managedRooms', foreignKey: 'pic_user_id' });

// Inventory ↔ Room
Inventory.belongsTo(Room, { foreignKey: 'room_id' });
Room.hasMany(Inventory, { foreignKey: 'room_id' });

// Draft ↔ User (creator)
Draft.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });
User.hasMany(Draft, { as: 'drafts', foreignKey: 'created_by' });

// Draft ↔ User (finalizer)
Draft.belongsTo(User, { as: 'finalizer', foreignKey: 'finalized_by' });

// Draft ↔ DraftItem
Draft.hasMany(DraftItem, { as: 'items', foreignKey: 'draft_id', onDelete: 'CASCADE' });
DraftItem.belongsTo(Draft, { foreignKey: 'draft_id' });

// DraftItem ↔ DraftApproval
DraftItem.hasOne(DraftApproval, { as: 'approval', foreignKey: 'draft_item_id', onDelete: 'CASCADE' });
DraftApproval.belongsTo(DraftItem, { foreignKey: 'draft_item_id' });

// DraftApproval ↔ User (approver)
DraftApproval.belongsTo(User, { as: 'approver', foreignKey: 'approved_by' });

// MaintenanceLog ↔ Inventory
MaintenanceLog.belongsTo(Inventory, { foreignKey: 'inventory_id' });
Inventory.hasMany(MaintenanceLog, { as: 'maintenanceLogs', foreignKey: 'inventory_id' });

// MaintenanceLog ↔ User (technician)
MaintenanceLog.belongsTo(User, { as: 'technician', foreignKey: 'tech_user_id' });

// MaintenanceLog ↔ MaintenanceBhp
MaintenanceLog.hasMany(MaintenanceBhp, { as: 'bhpUsed', foreignKey: 'maintenance_log_id', onDelete: 'CASCADE' });
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

module.exports = {
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
};
