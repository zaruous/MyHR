-- ----------------------------------------------------------------
--  HRM_db_setup_v2.sql
--
--  This script adds the `system_settings` table for managing
--  dynamic application settings, such as payroll calculations.
-- ----------------------------------------------------------------

--
-- Table structure for table `system_settings`
--
CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` varchar(255) NOT NULL,
  `setting_value` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_settings`
--
-- These values are used for payroll calculations.
--
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('payroll_bonus', '100000', '전직원 고정 보너스 금액')
ON DUPLICATE KEY UPDATE setting_value = '100000';

INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('payroll_deductions', '300000', '전직원 고정 공제액')
ON DUPLICATE KEY UPDATE setting_value = '300000';

-- --- END OF SCRIPT ---
