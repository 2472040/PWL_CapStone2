"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceSchedule = exports.RefreshToken = exports.RevokedToken = exports.AuditLog = exports.Label = exports.Receiving = exports.MaintenanceBhp = exports.MaintenanceLog = exports.DraftApproval = exports.DraftItem = exports.Draft = exports.Bhp = exports.Inventory = exports.Room = exports.User = exports.sequelize = void 0;
// Model index — loads all models and defines associations
const database_1 = __importDefault(require("../config/database"));
exports.sequelize = database_1.default;
const User_1 = __importDefault(require("./User"));
exports.User = User_1.default;
const Room_1 = __importDefault(require("./Room"));
exports.Room = Room_1.default;
const Inventory_1 = __importDefault(require("./Inventory"));
exports.Inventory = Inventory_1.default;
const Bhp_1 = __importDefault(require("./Bhp"));
exports.Bhp = Bhp_1.default;
const Draft_1 = __importDefault(require("./Draft"));
exports.Draft = Draft_1.default;
const DraftItem_1 = __importDefault(require("./DraftItem"));
exports.DraftItem = DraftItem_1.default;
const DraftApproval_1 = __importDefault(require("./DraftApproval"));
exports.DraftApproval = DraftApproval_1.default;
const MaintenanceLog_1 = __importDefault(require("./MaintenanceLog"));
exports.MaintenanceLog = MaintenanceLog_1.default;
const MaintenanceBhp_1 = __importDefault(require("./MaintenanceBhp"));
exports.MaintenanceBhp = MaintenanceBhp_1.default;
const Receiving_1 = __importDefault(require("./Receiving"));
exports.Receiving = Receiving_1.default;
const Label_1 = __importDefault(require("./Label"));
exports.Label = Label_1.default;
const AuditLog_1 = __importDefault(require("./AuditLog"));
exports.AuditLog = AuditLog_1.default;
const RevokedToken_1 = __importDefault(require("./RevokedToken"));
exports.RevokedToken = RevokedToken_1.default;
const RefreshToken_1 = __importDefault(require("./RefreshToken"));
exports.RefreshToken = RefreshToken_1.default;
const MaintenanceSchedule_1 = __importDefault(require("./MaintenanceSchedule"));
exports.MaintenanceSchedule = MaintenanceSchedule_1.default;
// =============================================
// Associations
// =============================================
// Room ↔ User (PIC)
Room_1.default.belongsTo(User_1.default, { as: 'pic', foreignKey: 'pic_user_id' });
User_1.default.hasMany(Room_1.default, { as: 'managedRooms', foreignKey: 'pic_user_id' });
// Inventory ↔ Room
Inventory_1.default.belongsTo(Room_1.default, { foreignKey: 'room_id' });
Room_1.default.hasMany(Inventory_1.default, { foreignKey: 'room_id' });
// Bhp ↔ Room
Bhp_1.default.belongsTo(Room_1.default, { foreignKey: 'room_id' });
Room_1.default.hasMany(Bhp_1.default, { foreignKey: 'room_id' });
// Draft ↔ User (creator)
Draft_1.default.belongsTo(User_1.default, { as: 'creator', foreignKey: 'created_by' });
User_1.default.hasMany(Draft_1.default, { as: 'drafts', foreignKey: 'created_by' });
// Draft ↔ User (finalizer)
Draft_1.default.belongsTo(User_1.default, { as: 'finalizer', foreignKey: 'finalized_by' });
// Draft ↔ DraftItem
Draft_1.default.hasMany(DraftItem_1.default, { as: 'items', foreignKey: 'draft_id', onDelete: 'CASCADE' });
DraftItem_1.default.belongsTo(Draft_1.default, { as: 'draft', foreignKey: 'draft_id' });
// DraftItem ↔ DraftApproval
DraftItem_1.default.hasOne(DraftApproval_1.default, {
    as: 'approval',
    foreignKey: 'draft_item_id',
    onDelete: 'CASCADE',
});
DraftApproval_1.default.belongsTo(DraftItem_1.default, { foreignKey: 'draft_item_id' });
// DraftApproval ↔ User (approver)
DraftApproval_1.default.belongsTo(User_1.default, { as: 'approver', foreignKey: 'approved_by' });
// MaintenanceLog ↔ Inventory
MaintenanceLog_1.default.belongsTo(Inventory_1.default, { foreignKey: 'inventory_id' });
Inventory_1.default.hasMany(MaintenanceLog_1.default, { as: 'maintenanceLogs', foreignKey: 'inventory_id' });
// MaintenanceSchedule ↔ Inventory
MaintenanceSchedule_1.default.belongsTo(Inventory_1.default, { foreignKey: 'inventory_id' });
Inventory_1.default.hasMany(MaintenanceSchedule_1.default, { as: 'maintenanceSchedules', foreignKey: 'inventory_id', onDelete: 'CASCADE' });
// MaintenanceLog ↔ User (technician)
MaintenanceLog_1.default.belongsTo(User_1.default, { as: 'technician', foreignKey: 'tech_user_id' });
// MaintenanceLog ↔ MaintenanceBhp
MaintenanceLog_1.default.hasMany(MaintenanceBhp_1.default, {
    as: 'bhpUsed',
    foreignKey: 'maintenance_log_id',
    onDelete: 'CASCADE',
});
MaintenanceBhp_1.default.belongsTo(MaintenanceLog_1.default, { foreignKey: 'maintenance_log_id' });
// MaintenanceBhp ↔ Bhp
MaintenanceBhp_1.default.belongsTo(Bhp_1.default, { foreignKey: 'bhp_id' });
Bhp_1.default.hasMany(MaintenanceBhp_1.default, { foreignKey: 'bhp_id' });
// Receiving ↔ DraftItem
Receiving_1.default.belongsTo(DraftItem_1.default, { foreignKey: 'draft_item_id' });
DraftItem_1.default.hasMany(Receiving_1.default, { as: 'receivings', foreignKey: 'draft_item_id' });
// Receiving ↔ User
Receiving_1.default.belongsTo(User_1.default, { as: 'receiver', foreignKey: 'received_by' });
// Label ↔ Inventory
Label_1.default.belongsTo(Inventory_1.default, { foreignKey: 'inventory_id' });
Inventory_1.default.hasOne(Label_1.default, { as: 'label', foreignKey: 'inventory_id' });
// AuditLog ↔ User
AuditLog_1.default.belongsTo(User_1.default, { foreignKey: 'user_id' });
User_1.default.hasMany(AuditLog_1.default, { foreignKey: 'user_id' });
// RefreshToken ↔ User
User_1.default.hasMany(RefreshToken_1.default, { foreignKey: 'user_id', onDelete: 'CASCADE' });
RefreshToken_1.default.belongsTo(User_1.default, { foreignKey: 'user_id' });
