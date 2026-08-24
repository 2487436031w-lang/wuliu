-- ============================================================
-- 智慧路灯 — 测试数据插入脚本
-- 数据库: PostgreSQL
-- 说明: 本脚本依赖于 schema.sql 建表，执行前请确保表已存在
-- 密码明文 → BCrypt 哈希（由 Hutool BCrypt.hashpw 生成，10 轮）:
--   admin123  → $2a$10$rNgAYknaIvMHYpT18sKd7Ob0AvHvoWwk.6gb.oBiaZsMgzW9Q2idC
--   123456    → $2a$10$oDZI6djgYk86X9PEhdPWuuAZ9NhUL69GyCORiUw.Vnv8vd5JUfxg.
--   staff123  → $2a$10$llHBmc6QnS/HiiioooPyt.Rk2Ml7VGIWRZKv5VnAyE9O4c9hA3Y7a
-- ============================================================

-- 清空旧测试数据（按依赖顺序，先删子表再删主表，BIGSERIAL 不会自动复位）
DELETE FROM control_logs;
DELETE FROM light_readings;
DELETE FROM alarm_logs;
DELETE FROM threshold_config;
DELETE FROM devices;
DELETE FROM users;

-- 复位序列（让 ID 重新从 1 开始）
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE devices_id_seq RESTART WITH 1;
ALTER SEQUENCE light_readings_id_seq RESTART WITH 1;
ALTER SEQUENCE control_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE alarm_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE threshold_config_id_seq RESTART WITH 1;

-- ============================================================
-- 1. 用户表（4 人）
-- ============================================================
INSERT INTO users (username, password, role) VALUES
    ('admin',   '$2a$10$rNgAYknaIvMHYpT18sKd7Ob0AvHvoWwk.6gb.oBiaZsMgzW9Q2idC', 'ADMIN'),
    ('zhangsan','$2a$10$oDZI6djgYk86X9PEhdPWuuAZ9NhUL69GyCORiUw.Vnv8vd5JUfxg.', 'MUNICIPAL_STAFF'),
    ('lisi',    '$2a$10$oDZI6djgYk86X9PEhdPWuuAZ9NhUL69GyCORiUw.Vnv8vd5JUfxg.', 'MUNICIPAL_STAFF'),
    ('wangwu',  '$2a$10$oDZI6djgYk86X9PEhdPWuuAZ9NhUL69GyCORiUw.Vnv8vd5JUfxg.', 'MUNICIPAL_STAFF');

-- ============================================================
-- 2. 路灯设备表（仅保留真实 BearPi：SN-RM-001）
-- ============================================================
INSERT INTO devices (device_name, device_sn, status, online_status, last_heartbeat_time, created_at) VALUES
    ('人民路001号路灯', 'SN-RM-001', 'OFF', 'OFFLINE', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '30 days');

-- ============================================================
-- 3. 光照记录表（33 条，覆盖最近 6 小时 + 少量历史）
--   强度范围: 低光照(<30 应触发开灯) / 正常(30-80) / 高光照(>80 应触发关灯)
-- ============================================================
INSERT INTO light_readings (device_id, light_intensity, created_at) VALUES
    (1, 28.50, CURRENT_TIMESTAMP - INTERVAL  '5 minutes'),
    (1, 35.20, CURRENT_TIMESTAMP - INTERVAL '35 minutes'),
    (1, 72.80, CURRENT_TIMESTAMP - INTERVAL '65 minutes'),
    (1, 88.10, CURRENT_TIMESTAMP - INTERVAL '95 minutes'),
    (1, 45.60, CURRENT_TIMESTAMP - INTERVAL '125 minutes'),
    (1, 22.30, CURRENT_TIMESTAMP - INTERVAL '155 minutes'),
    (1, 42.00, CURRENT_TIMESTAMP - INTERVAL '1 day');

-- ============================================================
-- 4. 控制日志表（14 条）
--   source: AUTO=光照联动自动, MANUAL=手动远程
--   command: ON | OFF
--   result: SUCCESS | FAIL
--   operator_id: MANUAL 时有值，AUTO 时为 NULL
-- ============================================================
INSERT INTO control_logs (device_id, operator_id, command, source, result, created_at) VALUES
    (1, NULL, 'ON',  'AUTO',   'SUCCESS', CURRENT_TIMESTAMP - INTERVAL  '5 minutes'),
    (1, NULL, 'OFF', 'AUTO',   'SUCCESS', CURRENT_TIMESTAMP - INTERVAL '95 minutes'),
    (1, 1,    'OFF', 'MANUAL', 'SUCCESS', CURRENT_TIMESTAMP - INTERVAL '120 minutes'),
    (1, 1,    'ON',  'MANUAL', 'SUCCESS', CURRENT_TIMESTAMP - INTERVAL '150 minutes');

-- ============================================================
-- 5. 阈值配置表（当前有效配置）
-- ============================================================
INSERT INTO threshold_config (light_threshold_on, light_threshold_off, heartbeat_timeout)
VALUES (30, 80, 180);  -- 光照<30自动开灯，>80自动关灯，心跳超时180秒（给板子重连留余量）

-- ============================================================
-- 6. 告警记录表（8 条）
--   alarm_type: OFFLINE | LIGHT_ABNORMAL | HEARTBEAT_TIMEOUT
--   status: ACTIVE | RESOLVED
-- ============================================================
INSERT INTO alarm_logs (device_id, alarm_type, message, status, created_at, resolved_at) VALUES
    (1, 'OFFLINE', '设备人民路001号路灯心跳超时，已自动标记为离线', 'RESOLVED',
     CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (1, 'LIGHT_ABNORMAL', '设备人民路001号路灯在低光照下持续关灯超过30分钟', 'RESOLVED',
     CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '3 days');

-- ============================================================
-- 数据统计验证
-- ============================================================
-- 统计: 各表行数
SELECT 'users'            AS table_name, COUNT(*) AS rows FROM users
UNION ALL SELECT 'devices',         COUNT(*) FROM devices
UNION ALL SELECT 'light_readings',  COUNT(*) FROM light_readings
UNION ALL SELECT 'control_logs',    COUNT(*) FROM control_logs
UNION ALL SELECT 'threshold_config',COUNT(*) FROM threshold_config
UNION ALL SELECT 'alarm_logs',      COUNT(*) FROM alarm_logs
ORDER BY table_name;
