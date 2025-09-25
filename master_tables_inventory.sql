-- Master Tables for Inventory Management System

-- 1. Item Categories Master Table
CREATE TABLE `item_categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) NOT NULL,
  `description` text,
  `parent_category_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `category_name` (`category_name`),
  KEY `idx_parent_category` (`parent_category_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_item_categories_parent` FOREIGN KEY (`parent_category_id`) REFERENCES `item_categories` (`category_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Brands Master Table
CREATE TABLE `brands` (
  `brand_id` int NOT NULL AUTO_INCREMENT,
  `brand_name` varchar(100) NOT NULL,
  `description` text,
  `country` varchar(50) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`brand_id`),
  UNIQUE KEY `brand_name` (`brand_name`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Units Master Table
CREATE TABLE `units` (
  `unit_id` int NOT NULL AUTO_INCREMENT,
  `unit_name` varchar(50) NOT NULL,
  `unit_symbol` varchar(10) NOT NULL,
  `unit_type` enum('WEIGHT','LENGTH','VOLUME','AREA','COUNT','TIME','OTHER') DEFAULT 'OTHER',
  `conversion_factor` decimal(10,4) DEFAULT 1.0000,
  `base_unit_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`unit_id`),
  UNIQUE KEY `unit_symbol` (`unit_symbol`),
  KEY `idx_unit_type` (`unit_type`),
  KEY `idx_base_unit` (`base_unit_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_units_base_unit` FOREIGN KEY (`base_unit_id`) REFERENCES `units` (`unit_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Suppliers Master Table
CREATE TABLE `suppliers` (
  `supplier_id` int NOT NULL AUTO_INCREMENT,
  `supplier_name` varchar(255) NOT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `gst_number` varchar(20) DEFAULT NULL,
  `pan_number` varchar(20) DEFAULT NULL,
  `payment_terms` varchar(100) DEFAULT NULL,
  `credit_limit` decimal(15,2) DEFAULT 0.00,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`supplier_id`),
  UNIQUE KEY `supplier_name` (`supplier_name`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_city` (`city`),
  KEY `idx_state` (`state`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Item Master Table (Main reference table)
CREATE TABLE `item_master` (
  `item_id` int NOT NULL AUTO_INCREMENT,
  `item_code` varchar(50) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `description` text,
  `category_id` int NOT NULL,
  `brand_id` int DEFAULT NULL,
  `unit_id` int NOT NULL,
  `specifications` json DEFAULT NULL,
  `technical_details` text,
  `safety_requirements` text,
  `environmental_impact` text,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`),
  UNIQUE KEY `item_code` (`item_code`),
  KEY `idx_item_name` (`item_name`),
  KEY `idx_category` (`category_id`),
  KEY `idx_brand` (`brand_id`),
  KEY `idx_unit` (`unit_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_item_master_category` FOREIGN KEY (`category_id`) REFERENCES `item_categories` (`category_id`),
  CONSTRAINT `fk_item_master_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`brand_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_item_master_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`unit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 6. Item-Supplier Mapping Table
CREATE TABLE `item_suppliers` (
  `item_supplier_id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `supplier_id` int NOT NULL,
  `supplier_item_code` varchar(100) DEFAULT NULL,
  `supplier_item_name` varchar(255) DEFAULT NULL,
  `cost_per_unit` decimal(10,2) DEFAULT NULL,
  `minimum_order_quantity` int DEFAULT 1,
  `lead_time_days` int DEFAULT 0,
  `is_preferred` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_supplier_id`),
  UNIQUE KEY `unique_item_supplier` (`item_id`, `supplier_id`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_is_preferred` (`is_preferred`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_item_suppliers_item` FOREIGN KEY (`item_id`) REFERENCES `item_master` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_item_suppliers_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Now update the materials table to reference item_master
ALTER TABLE `materials` 
ADD COLUMN `item_id` int DEFAULT NULL AFTER `material_id`,
ADD CONSTRAINT `fk_materials_item` FOREIGN KEY (`item_id`) REFERENCES `item_master` (`item_id`) ON DELETE SET NULL;

-- Add index for item_id
ALTER TABLE `materials` 
ADD INDEX `idx_materials_item_id` (`item_id`);

-- =============================================
-- SAMPLE DATA INSERTION
-- =============================================

-- Insert Item Categories
INSERT INTO `item_categories` (`category_name`, `description`, `parent_category_id`) VALUES
('Construction Materials', 'All construction related materials', NULL),
('Cement & Concrete', 'Cement, concrete, and related products', 1),
('Steel & Metal', 'Steel bars, sheets, and metal products', 1),
('Electrical', 'Electrical components and equipment', 1),
('Plumbing', 'Plumbing materials and fixtures', 1),
('Tools & Equipment', 'Construction tools and equipment', NULL),
('Safety Equipment', 'Safety gear and protective equipment', NULL),
('Finishing Materials', 'Paint, tiles, and finishing products', 1);

-- Insert Brands
INSERT INTO `brands` (`brand_name`, `description`, `country`) VALUES
('UltraTech Cement', 'Leading cement manufacturer', 'India'),
('Ambuja Cement', 'Premium cement brand', 'India'),
('TATA Steel', 'Steel and metal products', 'India'),
('JSW Steel', 'Steel manufacturing company', 'India'),
('Havells', 'Electrical equipment manufacturer', 'India'),
('Finolex', 'Electrical and plumbing products', 'India'),
('Asian Paints', 'Paint and coating manufacturer', 'India'),
('Kajaria Ceramics', 'Ceramic tiles manufacturer', 'India'),
('Bosch', 'Power tools and equipment', 'Germany'),
('DeWalt', 'Professional power tools', 'USA'),
('3M', 'Safety equipment and adhesives', 'USA'),
('Hilti', 'Construction tools and fasteners', 'Liechtenstein');

-- Insert Units
INSERT INTO `units` (`unit_name`, `unit_symbol`, `unit_type`, `conversion_factor`) VALUES
-- Weight Units
('Kilogram', 'kg', 'WEIGHT', 1.0000),
('Ton', 'ton', 'WEIGHT', 1000.0000),
('Gram', 'g', 'WEIGHT', 0.0010),
-- Length Units
('Meter', 'm', 'LENGTH', 1.0000),
('Centimeter', 'cm', 'LENGTH', 0.0100),
('Millimeter', 'mm', 'LENGTH', 0.0010),
('Feet', 'ft', 'LENGTH', 0.3048),
('Inch', 'in', 'LENGTH', 0.0254),
-- Volume Units
('Liter', 'L', 'VOLUME', 1.0000),
('Cubic Meter', 'm³', 'VOLUME', 1000.0000),
('Cubic Feet', 'ft³', 'VOLUME', 28.3168),
-- Area Units
('Square Meter', 'm²', 'AREA', 1.0000),
('Square Feet', 'ft²', 'AREA', 0.0929),
-- Count Units
('Piece', 'pcs', 'COUNT', 1.0000),
('Box', 'box', 'COUNT', 1.0000),
('Bundle', 'bundle', 'COUNT', 1.0000),
('Roll', 'roll', 'COUNT', 1.0000),
('Set', 'set', 'COUNT', 1.0000);

-- Insert Suppliers
INSERT INTO `suppliers` (`supplier_name`, `contact_person`, `email`, `phone`, `address`, `city`, `state`, `country`, `gst_number`, `payment_terms`) VALUES
('ABC Construction Supplies', 'Rajesh Kumar', 'rajesh@abcconstruction.com', '+91-9876543210', '123 Industrial Area', 'Mumbai', 'Maharashtra', 'India', '27ABCDE1234F1Z5', '30 days'),
('XYZ Building Materials', 'Priya Sharma', 'priya@xyzbuilding.com', '+91-9876543211', '456 Commercial Street', 'Delhi', 'Delhi', 'India', '07ABCDE1234F1Z5', '15 days'),
('Metro Steel Works', 'Amit Patel', 'amit@metrosteel.com', '+91-9876543212', '789 Steel Market', 'Ahmedabad', 'Gujarat', 'India', '24ABCDE1234F1Z5', '45 days'),
('Electrical Solutions Ltd', 'Sunita Singh', 'sunita@electricalsolutions.com', '+91-9876543213', '321 Power Hub', 'Bangalore', 'Karnataka', 'India', '29ABCDE1234F1Z5', '30 days'),
('Plumbing Masters', 'Vikram Gupta', 'vikram@plumbingmasters.com', '+91-9876543214', '654 Water Works', 'Chennai', 'Tamil Nadu', 'India', '33ABCDE1234F1Z5', '20 days'),
('Safety First Equipment', 'Deepak Yadav', 'deepak@safetyfirst.com', '+91-9876543215', '987 Safety Zone', 'Pune', 'Maharashtra', 'India', '27ABCDE1234F1Z6', '15 days');

-- Insert Item Master
INSERT INTO `item_master` (`item_code`, `item_name`, `description`, `category_id`, `brand_id`, `unit_id`, `specifications`, `technical_details`) VALUES
-- Cement Products
('CEM-001', 'OPC 43 Grade Cement', 'Ordinary Portland Cement 43 Grade', 2, 1, 1, '{"grade": "43", "type": "OPC", "color": "Grey"}', 'Compressive strength: 43 MPa, Initial setting time: 30 minutes'),
('CEM-002', 'OPC 53 Grade Cement', 'Ordinary Portland Cement 53 Grade', 2, 1, 1, '{"grade": "53", "type": "OPC", "color": "Grey"}', 'Compressive strength: 53 MPa, Initial setting time: 30 minutes'),
('CEM-003', 'PPC Cement', 'Portland Pozzolana Cement', 2, 2, 1, '{"grade": "43", "type": "PPC", "color": "Grey"}', 'Compressive strength: 43 MPa, Contains fly ash'),

-- Steel Products
('STL-001', 'TMT Steel Bar 8mm', 'Thermo Mechanically Treated Steel Bar', 3, 3, 1, '{"diameter": "8mm", "grade": "Fe500", "length": "12m"}', 'Yield strength: 500 MPa, Tensile strength: 545 MPa'),
('STL-002', 'TMT Steel Bar 10mm', 'Thermo Mechanically Treated Steel Bar', 3, 3, 1, '{"diameter": "10mm", "grade": "Fe500", "length": "12m"}', 'Yield strength: 500 MPa, Tensile strength: 545 MPa'),
('STL-003', 'TMT Steel Bar 12mm', 'Thermo Mechanically Treated Steel Bar', 3, 4, 1, '{"diameter": "12mm", "grade": "Fe500", "length": "12m"}', 'Yield strength: 500 MPa, Tensile strength: 545 MPa'),
('STL-004', 'Steel Sheet 2mm', 'Mild Steel Sheet', 3, 3, 1, '{"thickness": "2mm", "grade": "MS", "size": "6x3 feet"}', 'Mild steel sheet for fabrication'),

-- Electrical Products
('ELC-001', 'Copper Wire 2.5sqmm', 'Copper Electrical Wire', 4, 5, 5, '{"conductor": "Copper", "size": "2.5 sqmm", "insulation": "PVC"}', 'Current carrying capacity: 20A, Voltage: 1100V'),
('ELC-002', 'Copper Wire 4sqmm', 'Copper Electrical Wire', 4, 5, 5, '{"conductor": "Copper", "size": "4 sqmm", "insulation": "PVC"}', 'Current carrying capacity: 32A, Voltage: 1100V'),
('ELC-003', 'MCB 16A', 'Miniature Circuit Breaker', 4, 5, 15, '{"rating": "16A", "type": "Type C", "poles": "1"}', 'Breaking capacity: 6kA, Operating voltage: 240V'),
('ELC-004', 'LED Bulb 9W', 'LED Light Bulb', 4, 5, 15, '{"power": "9W", "color": "Warm White", "base": "B22"}', 'Luminous flux: 800lm, Life: 25000 hours'),

-- Plumbing Products
('PLM-001', 'PVC Pipe 4 inch', 'PVC Water Pipe', 5, 6, 5, '{"diameter": "4 inch", "material": "PVC", "pressure": "6kg/cm²"}', 'Working pressure: 6kg/cm², Temperature range: 0-60°C'),
('PLM-002', 'PVC Pipe 6 inch', 'PVC Water Pipe', 5, 6, 5, '{"diameter": "6 inch", "material": "PVC", "pressure": "6kg/cm²"}', 'Working pressure: 6kg/cm², Temperature range: 0-60°C'),
('PLM-003', 'Gate Valve 4 inch', 'Cast Iron Gate Valve', 5, 6, 15, '{"size": "4 inch", "material": "Cast Iron", "type": "Gate"}', 'Working pressure: 10kg/cm², Temperature: -10 to 80°C'),

-- Tools & Equipment
('TOL-001', 'Hammer 2kg', 'Claw Hammer', 6, 9, 15, '{"weight": "2kg", "head": "Steel", "handle": "Wood"}', 'Drop forged steel head, hardwood handle'),
('TOL-002', 'Drill Machine', 'Electric Drill Machine', 6, 9, 15, '{"power": "800W", "chuck": "13mm", "speed": "0-3000 RPM"}', 'Variable speed, keyless chuck, LED light'),
('TOL-003', 'Angle Grinder', 'Electric Angle Grinder', 6, 10, 15, '{"power": "1000W", "disc": "4 inch", "speed": "11000 RPM"}', 'High power motor, safety guard, side handle'),

-- Safety Equipment
('SAF-001', 'Safety Helmet', 'Industrial Safety Helmet', 7, 11, 15, '{"material": "HDPE", "color": "White", "standard": "IS 2925"}', 'Impact resistant, UV stabilized, adjustable harness'),
('SAF-002', 'Safety Shoes', 'Steel Toe Safety Shoes', 7, 11, 15, '{"toe": "Steel", "sole": "Rubber", "size": "Various"}', 'Steel toe cap, slip resistant sole, ankle support'),
('SAF-003', 'Safety Gloves', 'Industrial Safety Gloves', 7, 11, 15, '{"material": "Leather", "type": "Cut Resistant", "size": "Various"}', 'Cut resistant, breathable, good grip'),

-- Finishing Materials
('FIN-001', 'White Paint 1L', 'Interior White Paint', 8, 7, 9, '{"volume": "1L", "type": "Emulsion", "finish": "Matt"}', 'Coverage: 100 sqft, Drying time: 2 hours'),
('FIN-002', 'Ceramic Tile 2x2', 'Ceramic Floor Tile', 8, 8, 15, '{"size": "2x2 feet", "thickness": "8mm", "surface": "Glazed"}', 'Water absorption: <3%, Breaking strength: >250N'),
('FIN-003', 'Marble Slab', 'White Marble Slab', 8, NULL, 13, '{"thickness": "20mm", "finish": "Polished", "size": "Custom"}', 'Natural stone, polished finish, various sizes available');

-- Insert Item-Supplier Mapping
INSERT INTO `item_suppliers` (`item_id`, `supplier_id`, `supplier_item_code`, `supplier_item_name`, `cost_per_unit`, `minimum_order_quantity`, `lead_time_days`, `is_preferred`) VALUES
-- Cement suppliers
(1, 1, 'ABC-CEM-001', 'UltraTech OPC 43 Grade', 350.00, 50, 2, 1),
(1, 2, 'XYZ-CEM-001', 'UltraTech OPC 43 Grade', 355.00, 100, 3, 0),
(2, 1, 'ABC-CEM-002', 'UltraTech OPC 53 Grade', 380.00, 50, 2, 1),
(3, 2, 'XYZ-CEM-003', 'Ambuja PPC Cement', 340.00, 100, 3, 1),

-- Steel suppliers
(4, 3, 'MET-STL-001', 'TATA TMT 8mm', 65.00, 100, 5, 1),
(4, 1, 'ABC-STL-001', 'TATA TMT 8mm', 67.00, 50, 3, 0),
(5, 3, 'MET-STL-002', 'TATA TMT 10mm', 65.00, 100, 5, 1),
(6, 3, 'MET-STL-003', 'JSW TMT 12mm', 65.00, 100, 5, 1),
(7, 3, 'MET-STL-004', 'TATA Steel Sheet', 85.00, 10, 7, 1),

-- Electrical suppliers
(8, 4, 'ELC-WIRE-001', 'Havells Copper Wire 2.5sqmm', 120.00, 100, 2, 1),
(9, 4, 'ELC-WIRE-002', 'Havells Copper Wire 4sqmm', 180.00, 100, 2, 1),
(10, 4, 'ELC-MCB-001', 'Havells MCB 16A', 450.00, 10, 1, 1),
(11, 4, 'ELC-LED-001', 'Havells LED Bulb 9W', 180.00, 20, 1, 1),

-- Plumbing suppliers
(12, 5, 'PLM-PIPE-001', 'Finolex PVC Pipe 4 inch', 450.00, 10, 2, 1),
(13, 5, 'PLM-PIPE-002', 'Finolex PVC Pipe 6 inch', 650.00, 10, 2, 1),
(14, 5, 'PLM-VALVE-001', 'Finolex Gate Valve 4 inch', 1200.00, 5, 3, 1),

-- Tools suppliers
(15, 1, 'ABC-HAMMER-001', 'Bosch Hammer 2kg', 850.00, 5, 1, 1),
(16, 1, 'ABC-DRILL-001', 'Bosch Drill Machine', 3500.00, 2, 3, 1),
(17, 1, 'ABC-GRINDER-001', 'DeWalt Angle Grinder', 4500.00, 2, 3, 1),

-- Safety equipment suppliers
(18, 6, 'SAF-HELMET-001', '3M Safety Helmet', 450.00, 10, 1, 1),
(19, 6, 'SAF-SHOES-001', '3M Safety Shoes', 1200.00, 5, 2, 1),
(20, 6, 'SAF-GLOVES-001', '3M Safety Gloves', 150.00, 20, 1, 1),

-- Finishing materials suppliers
(21, 2, 'XYZ-PAINT-001', 'Asian Paints White 1L', 280.00, 10, 1, 1),
(22, 2, 'XYZ-TILE-001', 'Kajaria Ceramic Tile 2x2', 45.00, 50, 2, 1),
(23, 2, 'XYZ-MARBLE-001', 'White Marble Slab', 120.00, 1, 5, 1);

-- =============================================
-- VIEWS FOR EASY QUERYING
-- =============================================

-- View for complete material information
CREATE VIEW `v_materials_complete` AS
SELECT 
    m.material_id,
    m.item_id,
    im.item_code,
    im.item_name,
    m.additional_specification,
    ic.category_name,
    b.brand_name,
    m.color,
    im.type,
    u.unit_name,
    u.unit_symbol,
    m.cost_per_unit,
    s.supplier_name,
    m.stock_qty,
    m.minimum_stock_level,
    m.maximum_stock_level,
    m.reorder_point,
    m.location,
    m.status,
    m.project_id,
    p.name as project_name,
    m.created_at,
    m.updated_at
FROM materials m
LEFT JOIN item_master im ON m.item_id = im.item_id
LEFT JOIN item_categories ic ON im.category_id = ic.category_id
LEFT JOIN brands b ON im.brand_id = b.brand_id
LEFT JOIN units u ON im.unit_id = u.unit_id
LEFT JOIN suppliers s ON m.supplier = s.supplier_name
LEFT JOIN projects p ON m.project_id = p.project_id;

-- View for low stock materials
CREATE VIEW `v_low_stock_materials` AS
SELECT 
    m.material_id,
    im.item_code,
    im.item_name,
    ic.category_name,
    b.brand_name,
    m.stock_qty,
    m.minimum_stock_level,
    m.reorder_point,
    m.location,
    p.name as project_name,
    CASE 
        WHEN m.stock_qty <= m.reorder_point THEN 'CRITICAL'
        WHEN m.stock_qty <= m.minimum_stock_level THEN 'LOW'
        ELSE 'NORMAL'
    END as stock_status
FROM materials m
LEFT JOIN item_master im ON m.item_id = im.item_id
LEFT JOIN item_categories ic ON im.category_id = ic.category_id
LEFT JOIN brands b ON im.brand_id = b.brand_id
LEFT JOIN projects p ON m.project_id = p.project_id
WHERE m.stock_qty <= m.minimum_stock_level
AND m.status = 'ACTIVE';

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Additional indexes for better performance
CREATE INDEX `idx_item_master_name` ON `item_master` (`item_name`);
CREATE INDEX `idx_item_master_active` ON `item_master` (`is_active`);
CREATE INDEX `idx_item_suppliers_cost` ON `item_suppliers` (`cost_per_unit`);
CREATE INDEX `idx_item_suppliers_preferred` ON `item_suppliers` (`is_preferred`, `is_active`);
CREATE INDEX `idx_suppliers_city_state` ON `suppliers` (`city`, `state`);
CREATE INDEX `idx_suppliers_active` ON `suppliers` (`is_active`);









