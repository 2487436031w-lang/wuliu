package com.cqu.greenhouse.sim;

import com.cqu.greenhouse.entity.GhDevice;
import com.cqu.greenhouse.entity.GhZone;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 简化光场：自然光均匀项 + 灯具余弦/距离衰减（空间网格供 3D 热力）。
 */
public final class LightFieldModel {

    public record GridPoint(double x, double y, double ppfd, double sunPpfd, double ledPpfd) {
    }

    public record FieldResult(
            double effectivePpfd,
            double outdoorInPpfd,
            double ledEffectivePpfd,
            List<GridPoint> grid,
            Map<String, Double> sensorPpfd,
            int nx,
            int ny
    ) {
    }

    private LightFieldModel() {
    }

    public static FieldResult compute(GhZone zone, List<GhDevice> devices, double outdoorPar) {
        return compute(zone, devices, outdoorPar, null, true);
    }

    /**
     * @param shadeOpenOverride null=用区当前开度；100=全开（少遮）用于「未控」基线
     * @param lampsEnabled      false=不计补光，用于自然光基线
     */
    public static FieldResult compute(GhZone zone, List<GhDevice> devices, double outdoorPar,
                                      Integer shadeOpenOverride, boolean lampsEnabled) {
        double cover = zone.getCoverTransmittance() != null ? zone.getCoverTransmittance().doubleValue() : 0.65;
        int shadeOpen = shadeOpenOverride != null
                ? shadeOpenOverride
                : (zone.getShadeOpenPercent() != null ? zone.getShadeOpenPercent() : 100);
        double closed = 1.0 - shadeOpen / 100.0;
        double shadeTrans = 1.0 - 0.85 * closed;
        double sunIn = Math.max(0, outdoorPar * cover * shadeTrans);

        List<GhDevice> lamps = lampsEnabled
                ? devices.stream().filter(d -> "GROW_LAMP".equals(d.getDeviceType())).toList()
                : List.of();
        List<GhDevice> sensors = devices.stream()
                .filter(d -> "PAR_SENSOR".equals(d.getDeviceType()))
                .toList();

        double length = zone.getLengthM() != null ? zone.getLengthM().doubleValue() : 12;
        double width = zone.getWidthM() != null ? zone.getWidthM().doubleValue() : 6;
        int nx = 32;
        int ny = 16;
        List<GridPoint> grid = new ArrayList<>(nx * ny);
        double sum = 0;
        double ledSum = 0;
        for (int iy = 0; iy < ny; iy++) {
            for (int ix = 0; ix < nx; ix++) {
                double x = (ix + 0.5) * length / nx;
                double y = (iy + 0.5) * width / ny;
                double led = lampContribution(x, y, 0.5, lamps);
                double ppfd = sunIn + led;
                grid.add(new GridPoint(x, y, ppfd, sunIn, led));
                sum += ppfd;
                ledSum += led;
            }
        }

        Map<String, Double> sensorPpfd = new HashMap<>();
        List<Double> sensorValues = new ArrayList<>();
        List<Double> sensorLed = new ArrayList<>();
        for (GhDevice s : sensors) {
            double x = s.getPosX() != null ? s.getPosX().doubleValue() : length / 2;
            double y = s.getPosY() != null ? s.getPosY().doubleValue() : width / 2;
            double z = s.getPosZ() != null ? s.getPosZ().doubleValue() : 0.5;
            double led = lampContribution(x, y, z, lamps);
            double ppfd = sunIn + led;
            sensorPpfd.put(s.getDeviceSn(), ppfd);
            sensorValues.add(ppfd);
            sensorLed.add(led);
        }

        double effective;
        double ledEff;
        String agg = zone.getAggregation() != null ? zone.getAggregation() : "AVG";
        if (sensorValues.isEmpty()) {
            effective = sum / grid.size();
            ledEff = ledSum / grid.size();
        } else if ("MIN".equalsIgnoreCase(agg)) {
            effective = sensorValues.stream().mapToDouble(d -> d).min().orElse(0);
            ledEff = sensorLed.stream().mapToDouble(d -> d).average().orElse(0);
        } else {
            effective = sensorValues.stream().mapToDouble(d -> d).average().orElse(0);
            ledEff = sensorLed.stream().mapToDouble(d -> d).average().orElse(0);
        }

        return new FieldResult(effective, sunIn, ledEff, grid, sensorPpfd, nx, ny);
    }

    private static double lampContribution(double x, double y, double z, List<GhDevice> lamps) {
        double total = 0;
        for (GhDevice lamp : lamps) {
            if (Boolean.FALSE.equals(lamp.getPowerOn())) {
                continue;
            }
            int dim = lamp.getDimmingPercent() != null ? lamp.getDimmingPercent() : 0;
            if (dim <= 0) {
                continue;
            }
            double lx = lamp.getPosX() != null ? lamp.getPosX().doubleValue() : x;
            double ly = lamp.getPosY() != null ? lamp.getPosY().doubleValue() : y;
            double lz = lamp.getPosZ() != null ? lamp.getPosZ().doubleValue() : 2.2;
            double dx = x - lx;
            double dy = y - ly;
            double dz = Math.max(0.2, lz - z);
            double dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            double cos = dz / dist;
            double peak = 180.0 * (dim / 100.0);
            total += peak * cos / (dist * dist);
        }
        return total;
    }
}
