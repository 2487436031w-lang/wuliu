package com.cqu.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.cqu.entity.Devices;
import com.cqu.mapper.DevicesMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 已有本地库不会自动跑 sql/migrations，启动时补齐经纬度列，
 * 并为尚未标定的演示路灯写入重庆大学 A 区一带坐标。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DeviceLocationInitializer implements ApplicationRunner {

    /** GCJ-02，与前端灯廊地图一致 */
    private static final Map<String, BigDecimal[]> DEMO = new LinkedHashMap<>();

    static {
        DEMO.put("SN-RM-001", coords("29.56380", "106.46120"));
        DEMO.put("SN-RM-002", coords("29.56470", "106.46740"));
        DEMO.put("SN-RM-003", coords("29.56560", "106.47380"));
        DEMO.put("SN-JF-001", coords("29.56960", "106.46400"));
        DEMO.put("SN-JF-002", coords("29.57180", "106.47020"));
        DEMO.put("SN-BJ-001", coords("29.55640", "106.46550"));
        DEMO.put("SN-BJ-002", coords("29.55780", "106.47400"));
        DEMO.put("SN-XQ-001", coords("29.56880", "106.46680"));
    }

    private static BigDecimal[] coords(String lat, String lng) {
        return new BigDecimal[]{new BigDecimal(lat), new BigDecimal(lng)};
    }

    private final DataSource dataSource;
    private final DevicesMapper devicesMapper;

    @Override
    public void run(ApplicationArguments args) {
        if (!ensureColumns()) {
            return;
        }
        int seeded = 0;
        for (Map.Entry<String, BigDecimal[]> e : DEMO.entrySet()) {
            Devices device = devicesMapper.selectOne(
                    new LambdaQueryWrapper<Devices>().eq(Devices::getDeviceSn, e.getKey()));
            if (device == null || device.getLatitude() != null) {
                continue;
            }
            device.setLatitude(e.getValue()[0]);
            device.setLongitude(e.getValue()[1]);
            devicesMapper.updateById(device);
            seeded++;
        }

        List<Devices> missing = devicesMapper.selectList(
                new LambdaQueryWrapper<Devices>().isNull(Devices::getLatitude));
        int extra = 0;
        int n = missing.size();
        for (int i = 0; i < n; i++) {
            Devices device = missing.get(i);
            if (device.getLongitude() != null) {
                continue;
            }
            double offset = i - (n - 1) / 2.0;
            device.setLatitude(bd(29.56492 + offset * 0.00028));
            device.setLongitude(bd(106.46882 + offset * 0.00038));
            devicesMapper.updateById(device);
            extra++;
        }
        if (seeded + extra > 0) {
            log.info("已为未标定路灯写入演示坐标：已知 SN {} 盏，其余 {} 盏", seeded, extra);
        }
    }

    private boolean ensureColumns() {
        try (Connection conn = dataSource.getConnection(); Statement st = conn.createStatement()) {
            st.execute("ALTER TABLE devices ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7)");
            st.execute("ALTER TABLE devices ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7)");
            return true;
        } catch (SQLException e) {
            log.warn("补齐 devices 经纬度列失败（地图标定可能不可用）: {}", e.getMessage());
            return false;
        }
    }

    private static BigDecimal bd(double v) {
        return BigDecimal.valueOf(v).setScale(7, RoundingMode.HALF_UP);
    }
}
