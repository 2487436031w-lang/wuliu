package com.cqu.greenhouse.service;

import com.cqu.greenhouse.entity.*;
import com.cqu.greenhouse.sim.LightFieldModel;

import java.util.List;
import java.util.Map;

public interface IGreenhouseService {
    List<GhZone> listZones();

    Map<String, Object> getZoneEffectiveLight(String zoneId);

    List<GhRecipe> listRecipes();

    GhRecipe getRecipe(String recipeId);

    void bindRecipe(String zoneId, String recipeId);

    void setClimateProfile(String zoneId, String profileId);

    void setAutoControl(String zoneId, boolean enabled);

    List<GhDevice> listDevices(String zoneId);

    List<GhWorkOrder> listWorkOrders(String status);

    void approveWorkOrder(Long id);

    void rejectWorkOrder(Long id);

    void completeWorkOrder(Long id);

    void setDimming(String deviceSn, int percent, String source);

    void setShadeOpen(String deviceSn, int percent, String source);

    void ingestTelemetry(Map<String, Object> payload);

    void ingestStatus(Map<String, Object> payload);

    /** 仿真一步：推进光场 + 规则 */
    void tickSimulation();

    void resetSimDay();

    Map<String, Object> getSimClock();

    LightFieldModel.FieldResult previewField(String zoneId);

    List<GhControlLog> recentControlLogs(int limit);

    Map<String, Object> climateProfiles();
}
