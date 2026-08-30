package com.cqu.greenhouse.sim;

/**
 * 棚体几何常量，对齐 {@code docs/greenhouse/layouts/cq-demo-bay-v1.json}。
 */
public final class GreenhouseGeometry {

    public static final String GEOMETRY_ID = "cq-demo-bay-v1";
    public static final double LENGTH_M = 16.0;
    public static final double WIDTH_M = 7.0;
    public static final double GUTTER_HEIGHT_M = 2.8;
    public static final double RIDGE_HEIGHT_M = 3.8;
    public static final double COVER_TRANSMITTANCE = 0.65;
    public static final double MAX_SHADE_BLOCK = 0.85;
    public static final double EXTERNAL_SHADE_Z = 3.5;
    public static final int GRID_NX = 32;
    public static final int GRID_NY = 14;
    public static final double GRID_MARGIN_M = 0.25;

    /** 南 / 中 / 北床 Y 名义中心（与布局床位一致） */
    public static final double BED_SOUTH_Y = 1.40;
    public static final double BED_MID_Y = 3.50;
    public static final double BED_NORTH_Y = 5.60;

    private GreenhouseGeometry() {
    }

    public static double measurePlaneZ(String zoneId) {
        if ("ZONE-B".equals(zoneId)) {
            return 0.78;
        }
        return 0.90;
    }

    public static double[] solarElevationAzimuth(double minuteOfDay, String climateProfileId) {
        double lat = Math.toRadians(29.5);
        double declDeg = -15;
        if (climateProfileId != null) {
            if (climateProfileId.contains("summer")) {
                declDeg = 20;
            } else if (climateProfileId.contains("clear") || climateProfileId.contains("overcast")) {
                declDeg = -5;
            }
        }
        double decl = Math.toRadians(declDeg);
        double hourAngle = Math.toRadians((minuteOfDay / 60.0 - 12.0) * 15.0);
        double sinEl = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);
        sinEl = Math.max(-1, Math.min(1, sinEl));
        double elev = Math.toDegrees(Math.asin(sinEl));
        // 方位：从北顺时针；演示简化为 6–18 时东→南→西扫过
        double azFromNorth = 180;
        if (elev > 0) {
            double t = (minuteOfDay - 360) / 720.0;
            t = Math.max(0, Math.min(1, t));
            azFromNorth = 90 + t * 180;
        } else {
            elev = 0;
        }
        return new double[]{elev, azFromNorth};
    }

    /** 直射日型用较大南北梯度；雾/阴用漫射梯度。 */
    public static boolean isDiffuseProfile(String climateProfileId) {
        if (climateProfileId == null) {
            return true;
        }
        return climateProfileId.contains("fog")
                || climateProfileId.contains("overcast")
                || climateProfileId.contains("diffuse");
    }

    /**
     * 南北自然光梯度：直射南×1.06 / 北×0.94；漫射南×1.02 / 北×0.98。
     */
    public static double bedSunFactor(double y, boolean diffuse) {
        double south = diffuse ? 1.02 : 1.06;
        double mid = 1.0;
        double north = diffuse ? 0.98 : 0.94;
        if (y <= BED_SOUTH_Y) {
            return south;
        }
        if (y >= BED_NORTH_Y) {
            return north;
        }
        if (y <= BED_MID_Y) {
            double t = (y - BED_SOUTH_Y) / (BED_MID_Y - BED_SOUTH_Y);
            return south + t * (mid - south);
        }
        double t = (y - BED_MID_Y) / (BED_NORTH_Y - BED_MID_Y);
        return mid + t * (north - mid);
    }

    public static double lampMaxPpfdAtCanopy(String deviceSn) {
        if (deviceSn != null && deviceSn.contains("ZONE-B")) {
            return 140.0;
        }
        return 160.0;
    }
}
