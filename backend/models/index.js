const User = require('./User');
const Role = require('./Role');
const Project = require('./Project');
const ProjectComponent = require('./ProjectComponent');
const ProjectMember = require('./ProjectMember');
const Task = require('./Task');
const Material = require('./Material');
const Labour = require('./Labour');
const LabourAttendance = require('./LabourAttendance');
const Payroll = require('./Payroll');
const Issue = require('./Issue');
const Report = require('./Report');
const PettyCashExpense = require('./PettyCashExpense');
const Document = require('./Document');
const MaterialReturn = require('./MaterialReturn');
const MaterialConsumption = require('./MaterialConsumption');
const MaterialIssue = require('./MaterialIssue');
const InventoryHistory = require('./InventoryHistory');
const ItemCategory = require('./ItemCategory');
const Brand = require('./Brand');
const Unit = require('./Unit');
const Supplier = require('./Supplier');
const ItemMaster = require('./ItemMaster');
const ItemSupplier = require('./ItemSupplier');
const { PaymentType, PaymentCategory, Payment } = require('./Payment');
const MaterialRequirementRequest = require('./MaterialRequirementRequest');
const MrrItem = require('./MrrItem');
const PurchaseOrder = require('./PurchaseOrder');
const PurchaseOrderItem = require('./PurchaseOrderItem');
const MaterialReceipt = require('./MaterialReceipt');
const MaterialReceiptItem = require('./MaterialReceiptItem');
const SupplierLedger = require('./SupplierLedger');
const Warehouse = require('./Warehouse');
const Subcontractor = require('./Subcontractor');

// Role associations
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
Role.hasMany(ProjectMember, { foreignKey: 'role_id', as: 'projectMembers' });

// User associations
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
User.hasMany(ProjectMember, { foreignKey: 'user_id', as: 'projectMembers' });
User.hasMany(Project, { foreignKey: 'owner_user_id', as: 'ownedProjects' });
User.hasMany(Task, { foreignKey: 'assigned_user_id', as: 'assignedTasks' });
User.hasMany(Issue, { foreignKey: 'raised_by_user_id', as: 'raisedIssues' });
User.hasMany(Issue, { foreignKey: 'assigned_to_user_id', as: 'assignedIssues' });
User.hasMany(Report, { foreignKey: 'generated_by_user_id', as: 'generatedReports' });
User.hasMany(PettyCashExpense, { foreignKey: 'approved_by_user_id', as: 'approvedExpenses' });
User.hasMany(Document, { foreignKey: 'uploaded_by_user_id', as: 'uploadedDocuments' });
User.hasMany(Payment, { foreignKey: 'paid_to_user_id', as: 'receivedPayments' });
User.hasMany(Payment, { foreignKey: 'paid_by_user_id', as: 'madePayments' });
User.hasMany(Payment, { foreignKey: 'approved_by_user_id', as: 'approvedPayments' });
User.hasMany(Payment, { foreignKey: 'deleted_by_user_id', as: 'deletedPayments' });

// Project associations
Project.belongsTo(User, { foreignKey: 'owner_user_id', as: 'owner' });
Project.hasMany(ProjectMember, { foreignKey: 'project_id', as: 'members' });
Project.hasMany(ProjectComponent, { foreignKey: 'project_id', as: 'components' });
Project.hasMany(Task, { foreignKey: 'project_id', as: 'tasks' });
Project.hasMany(Material, { foreignKey: 'project_id', as: 'materials' });
Project.hasMany(LabourAttendance, { foreignKey: 'project_id', as: 'labourAttendance' });
Project.hasMany(Payroll, { foreignKey: 'project_id', as: 'payroll' });
Project.hasMany(Issue, { foreignKey: 'project_id', as: 'issues' });
Project.hasMany(Report, { foreignKey: 'project_id', as: 'reports' });
Project.hasMany(PettyCashExpense, { foreignKey: 'project_id', as: 'expenses' });
Project.hasMany(Document, { foreignKey: 'project_id', as: 'documents' });
Project.hasMany(Payment, { foreignKey: 'project_id', as: 'payments' });

// ProjectComponent associations
ProjectComponent.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
ProjectComponent.hasMany(MaterialRequirementRequest, { foreignKey: 'component_id', as: 'mrrs' });
ProjectComponent.hasMany(MaterialIssue, { foreignKey: 'component_id', as: 'materialIssues' });
ProjectComponent.hasMany(MaterialReturn, { foreignKey: 'component_id', as: 'materialReturns' });
ProjectComponent.hasMany(PurchaseOrder, { foreignKey: 'component_id', as: 'purchaseOrders' });

// ProjectMember associations
ProjectMember.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
ProjectMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ProjectMember.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

// Task associations
Task.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Task.belongsTo(User, { foreignKey: 'assigned_user_id', as: 'assignedUser' });
Task.hasMany(Issue, { foreignKey: 'task_id', as: 'issues' });

// Material associations
Material.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Material.belongsTo(ItemMaster, { foreignKey: 'item_id', as: 'item' });
Material.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
Material.hasMany(MaterialIssue, { foreignKey: 'material_id', as: 'issues' });
Material.hasMany(MaterialReturn, { foreignKey: 'material_id', as: 'returns' });
Material.hasMany(MaterialConsumption, { foreignKey: 'material_id', as: 'consumptions' });
Material.hasMany(InventoryHistory, { foreignKey: 'material_id', as: 'history' });

// Warehouse associations
Warehouse.hasMany(Material, { foreignKey: 'warehouse_id', as: 'materials' });

// Labour associations
Labour.hasMany(LabourAttendance, { foreignKey: 'labour_id', as: 'attendance' });
Labour.hasMany(Payroll, { foreignKey: 'labour_id', as: 'payroll' });

// LabourAttendance associations
LabourAttendance.belongsTo(Labour, { foreignKey: 'labour_id', as: 'labour' });
LabourAttendance.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Payroll associations
Payroll.belongsTo(Labour, { foreignKey: 'labour_id', as: 'labour' });
Payroll.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

// Issue associations
Issue.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Issue.belongsTo(Task, { foreignKey: 'task_id', as: 'task' });
Issue.belongsTo(User, { foreignKey: 'raised_by_user_id', as: 'raisedBy' });
Issue.belongsTo(User, { foreignKey: 'assigned_to_user_id', as: 'assignedTo' });

// Report associations
Report.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Report.belongsTo(User, { foreignKey: 'generated_by_user_id', as: 'generatedBy' });

// PettyCashExpense associations
PettyCashExpense.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
PettyCashExpense.belongsTo(User, { foreignKey: 'approved_by_user_id', as: 'approvedBy' });

// Document associations
Document.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Document.belongsTo(User, { foreignKey: 'uploaded_by_user_id', as: 'uploadedBy' });


// MaterialReturn associations
MaterialReturn.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
MaterialReturn.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });
MaterialReturn.belongsTo(User, { foreignKey: 'returned_by_user_id', as: 'returned_by_user' });
MaterialReturn.belongsTo(User, { foreignKey: 'approved_by_user_id', as: 'approved_by' });
MaterialReturn.belongsTo(MaterialIssue, { foreignKey: 'issue_id', as: 'material_issue' });
MaterialReturn.belongsTo(Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });

// MaterialConsumption associations
MaterialConsumption.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
MaterialConsumption.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });
MaterialConsumption.belongsTo(User, { foreignKey: 'recorded_by_user_id', as: 'recorded_by' });

// MaterialIssue associations
MaterialIssue.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
MaterialIssue.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });
MaterialIssue.belongsTo(User, { foreignKey: 'issued_by_user_id', as: 'issued_by' });
MaterialIssue.belongsTo(User, { foreignKey: 'received_by_user_id', as: 'received_by' });
MaterialIssue.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
MaterialIssue.belongsTo(User, { foreignKey: 'updated_by', as: 'updated_by_user' });
MaterialIssue.belongsTo(ProjectComponent, { foreignKey: 'component_id', as: 'component' });
MaterialIssue.belongsTo(Subcontractor, { foreignKey: 'subcontractor_id', as: 'subcontractor' });

// InventoryHistory associations
InventoryHistory.belongsTo(Material, { foreignKey: 'material_id', as: 'material' });
InventoryHistory.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
InventoryHistory.belongsTo(User, { foreignKey: 'performed_by_user_id', as: 'performedBy' });

// ItemCategory associations
ItemCategory.hasMany(ItemCategory, { foreignKey: 'parent_category_id', as: 'subcategories' });
ItemCategory.belongsTo(ItemCategory, { foreignKey: 'parent_category_id', as: 'parentCategory' });
ItemCategory.hasMany(ItemMaster, { foreignKey: 'category_id', as: 'items' });

// Brand associations
Brand.hasMany(ItemMaster, { foreignKey: 'brand_id', as: 'items' });

// Unit associations
Unit.hasMany(Unit, { foreignKey: 'base_unit_id', as: 'derivedUnits' });
Unit.belongsTo(Unit, { foreignKey: 'base_unit_id', as: 'baseUnit' });
Unit.hasMany(ItemMaster, { foreignKey: 'unit_id', as: 'items' });

// Supplier associations
Supplier.hasMany(ItemSupplier, { foreignKey: 'supplier_id', as: 'itemSuppliers' });

// ItemMaster associations
ItemMaster.belongsTo(ItemCategory, { foreignKey: 'category_id', as: 'category' });
ItemMaster.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand' });
ItemMaster.belongsTo(Unit, { foreignKey: 'unit_id', as: 'unit' });
ItemMaster.hasMany(ItemSupplier, { foreignKey: 'item_id', as: 'suppliers' });
ItemMaster.hasMany(Material, { foreignKey: 'item_id', as: 'materials' });

// ItemSupplier associations
ItemSupplier.belongsTo(ItemMaster, { foreignKey: 'item_id', as: 'item' });
ItemSupplier.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

// Payment associations
PaymentType.hasMany(Payment, { foreignKey: 'payment_type_id', as: 'payments' });
PaymentCategory.hasMany(Payment, { foreignKey: 'category_id', as: 'payments' });

Payment.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Payment.belongsTo(PaymentType, { foreignKey: 'payment_type_id', as: 'paymentType' });
Payment.belongsTo(PaymentCategory, { foreignKey: 'category_id', as: 'category' });
Payment.belongsTo(User, { foreignKey: 'paid_to_user_id', as: 'paidToUser' });
Payment.belongsTo(User, { foreignKey: 'paid_by_user_id', as: 'paidByUser' });
Payment.belongsTo(User, { foreignKey: 'approved_by_user_id', as: 'approvedByUser' });
Payment.belongsTo(User, { foreignKey: 'deleted_by_user_id', as: 'deletedByUser' });

// MaterialRequirementRequest associations
MaterialRequirementRequest.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
MaterialRequirementRequest.belongsTo(User, { foreignKey: 'requested_by_user_id', as: 'requestedBy' });
MaterialRequirementRequest.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });
MaterialRequirementRequest.belongsTo(User, { foreignKey: 'updated_by', as: 'updatedBy' });
MaterialRequirementRequest.belongsTo(User, { foreignKey: 'approved_by_user_id', as: 'approvedBy' });
MaterialRequirementRequest.belongsTo(ProjectComponent, { foreignKey: 'component_id', as: 'component' });
MaterialRequirementRequest.belongsTo(Subcontractor, { foreignKey: 'subcontractor_id', as: 'subcontractor' });
MaterialRequirementRequest.hasMany(MrrItem, { foreignKey: 'mrr_id', as: 'items' });
MaterialRequirementRequest.hasMany(PurchaseOrder, { foreignKey: 'mrr_id', as: 'purchaseOrders' });

// MrrItem associations
MrrItem.belongsTo(MaterialRequirementRequest, { foreignKey: 'mrr_id', as: 'mrr' });
MrrItem.belongsTo(ItemMaster, { foreignKey: 'item_id', as: 'item' });
MrrItem.belongsTo(Unit, { foreignKey: 'unit_id', as: 'unit' });

// PurchaseOrder associations
PurchaseOrder.belongsTo(MaterialRequirementRequest, { foreignKey: 'mrr_id', as: 'mrr' });
PurchaseOrder.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
PurchaseOrder.belongsTo(ProjectComponent, { foreignKey: 'component_id', as: 'component' });
PurchaseOrder.belongsTo(Subcontractor, { foreignKey: 'subcontractor_id', as: 'subcontractor' });
PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
PurchaseOrder.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'createdBy' });
PurchaseOrder.belongsTo(User, { foreignKey: 'approved_by_user_id', as: 'approvedBy' });
PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'po_id', as: 'items' });
PurchaseOrder.hasMany(MaterialReceipt, { foreignKey: 'po_id', as: 'receipts' });
PurchaseOrder.hasMany(SupplierLedger, { foreignKey: 'po_id', as: 'ledgerEntries' });

// PurchaseOrderItem associations
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'po_id', as: 'purchaseOrder' });
PurchaseOrderItem.belongsTo(ItemMaster, { foreignKey: 'item_id', as: 'item' });
PurchaseOrderItem.belongsTo(Unit, { foreignKey: 'unit_id', as: 'unit' });
PurchaseOrderItem.hasMany(MaterialReceiptItem, { foreignKey: 'po_item_id', as: 'receiptItems' });

// MaterialReceipt associations
MaterialReceipt.belongsTo(PurchaseOrder, { foreignKey: 'po_id', as: 'purchaseOrder' });
MaterialReceipt.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
MaterialReceipt.belongsTo(User, { foreignKey: 'received_by_user_id', as: 'receivedBy' });
MaterialReceipt.hasMany(MaterialReceiptItem, { foreignKey: 'receipt_id', as: 'items' });

// MaterialReceiptItem associations
MaterialReceiptItem.belongsTo(MaterialReceipt, { foreignKey: 'receipt_id', as: 'receipt' });
MaterialReceiptItem.belongsTo(PurchaseOrderItem, { foreignKey: 'po_item_id', as: 'poItem' });
MaterialReceiptItem.belongsTo(ItemMaster, { foreignKey: 'item_id', as: 'item' });
MaterialReceiptItem.belongsTo(Unit, { foreignKey: 'unit_id', as: 'unit' });

// SupplierLedger associations
SupplierLedger.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
SupplierLedger.belongsTo(PurchaseOrder, { foreignKey: 'po_id', as: 'purchaseOrder' });
SupplierLedger.belongsTo(User, { foreignKey: 'created_by_user_id', as: 'createdBy' });

// Update existing associations to include MRR flow
MaterialIssue.belongsTo(MaterialRequirementRequest, { foreignKey: 'mrr_id', as: 'mrr' });
MaterialIssue.belongsTo(PurchaseOrder, { foreignKey: 'po_id', as: 'purchaseOrder' });
MaterialIssue.belongsTo(MaterialReceipt, { foreignKey: 'receipt_id', as: 'receipt' });

MaterialReturn.belongsTo(MaterialRequirementRequest, { foreignKey: 'mrr_id', as: 'mrr' });
MaterialReturn.belongsTo(PurchaseOrder, { foreignKey: 'po_id', as: 'purchaseOrder' });
MaterialReturn.belongsTo(MaterialIssue, { foreignKey: 'issue_id', as: 'originalIssue' });

MaterialConsumption.belongsTo(MaterialRequirementRequest, { foreignKey: 'mrr_id', as: 'mrr' });
MaterialConsumption.belongsTo(MaterialIssue, { foreignKey: 'issue_id', as: 'issue' });

InventoryHistory.belongsTo(MaterialRequirementRequest, { foreignKey: 'mrr_id', as: 'mrr' });
InventoryHistory.belongsTo(PurchaseOrder, { foreignKey: 'po_id', as: 'purchaseOrder' });
InventoryHistory.belongsTo(MaterialReceipt, { foreignKey: 'receipt_id', as: 'receipt' });

// Subcontractor associations
Project.hasMany(Subcontractor, { foreignKey: 'project_id', as: 'subcontractors' });
Subcontractor.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });
Subcontractor.hasMany(MaterialRequirementRequest, { foreignKey: 'subcontractor_id', as: 'mrrs' });
Subcontractor.hasMany(MaterialIssue, { foreignKey: 'subcontractor_id', as: 'materialIssues' });
Subcontractor.hasMany(MaterialReturn, { foreignKey: 'subcontractor_id', as: 'materialReturns' });
Subcontractor.hasMany(PurchaseOrder, { foreignKey: 'subcontractor_id', as: 'purchaseOrders' });

module.exports = {
  User,
  Role,
  Project,
  ProjectComponent,
  ProjectMember,
  Task,
  Material,
  Labour,
  LabourAttendance,
  Payroll,
  Issue,
  Report,
  PettyCashExpense,
  Document,
  MaterialReturn,
  MaterialConsumption,
  MaterialIssue,
  InventoryHistory,
  ItemCategory,
  Brand,
  Unit,
  Supplier,
  ItemMaster,
  ItemSupplier,
  PaymentType,
  PaymentCategory,
  Payment,
  MaterialRequirementRequest,
  MrrItem,
  PurchaseOrder,
  PurchaseOrderItem,
  MaterialReceipt,
  MaterialReceiptItem,
  SupplierLedger,
  Warehouse,
  Subcontractor
};
