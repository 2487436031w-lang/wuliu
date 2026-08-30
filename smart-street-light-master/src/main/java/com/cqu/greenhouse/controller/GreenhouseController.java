package com.cqu.greenhouse.controller;

import com.cqu.greenhouse.entity.GhControlLog;
import com.cqu.greenhouse.entity.GhDevice;
import com.cqu.greenhouse.entity.GhRecipe;
import com.cqu.greenhouse.entity.GhWorkOrder;
import com.cqu.greenhouse.entity.GhZone;
import com.cqu.greenhouse.service.IGreenhouseService;
import com.cqu.vo.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/greenhouse")
public class GreenhouseController {

    @Autowired
    private IGreenhouseService greenhouseService;

    @GetMapping("/zones")
    public Result<List<GhZone>> zones() {
        return Result.success(greenhouseService.listZones());
    }

    @GetMapping("/zones/{zoneId}/effective-light")
    public Result<Map<String, Object>> effectiveLight(@PathVariable String zoneId) {
        try {
            return Result.success(greenhouseService.getZoneEffectiveLight(zoneId));
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PutMapping("/zones/{zoneId}/recipe")
    public Result<String> bindRecipe(@PathVariable String zoneId, @RequestBody Map<String, String> body) {
        try {
            greenhouseService.bindRecipe(zoneId, body.get("recipeId"));
            return Result.success("ok");
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PutMapping("/zones/{zoneId}/climate-profile")
    public Result<String> climate(@PathVariable String zoneId, @RequestBody Map<String, String> body) {
        try {
            greenhouseService.setClimateProfile(zoneId, body.get("profileId"));
            return Result.success("ok");
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @PutMapping("/zones/{zoneId}/auto-control")
    public Result<String> autoControl(@PathVariable String zoneId, @RequestBody Map<String, Object> body) {
        try {
            boolean enabled = Boolean.parseBoolean(String.valueOf(body.get("enabled")));
            greenhouseService.setAutoControl(zoneId, enabled);
            return Result.success("ok");
        } catch (IllegalArgumentException e) {
            return Result.fail(e.getMessage());
        }
    }

    @GetMapping("/recipes")
    public Result<List<GhRecipe>> recipes() {
        return Result.success(greenhouseService.listRecipes());
    }

    @GetMapping("/recipes/{recipeId}")
    public Result<GhRecipe> recipe(@PathVariable String recipeId) {
        GhRecipe r = greenhouseService.getRecipe(recipeId);
        if (r == null) {
            return Result.fail("配方不存在");
        }
        return Result.success(r);
    }

    @GetMapping("/devices")
    public Result<List<GhDevice>> devices(@RequestParam(required = false) String zoneId) {
        return Result.success(greenhouseService.listDevices(zoneId));
    }

    @PostMapping("/lamps/{sn}/dimming")
    public Result<String> dimming(@PathVariable String sn, @RequestBody Map<String, Object> body) {
        try {
            int pct = Integer.parseInt(String.valueOf(body.get("dimmingPercent")));
            greenhouseService.setDimming(sn, pct, "MANUAL");
            return Result.success("ok");
        } catch (Exception e) {
            return Result.fail(e.getMessage());
        }
    }

    @PostMapping("/shades/{sn}/open-percent")
    public Result<String> shade(@PathVariable String sn, @RequestBody Map<String, Object> body) {
        try {
            int pct = Integer.parseInt(String.valueOf(body.get("shadeOpenPercent")));
            greenhouseService.setShadeOpen(sn, pct, "MANUAL");
            return Result.success("ok");
        } catch (Exception e) {
            return Result.fail(e.getMessage());
        }
    }

    @GetMapping("/work-orders")
    public Result<List<GhWorkOrder>> workOrders(@RequestParam(required = false) String status) {
        return Result.success(greenhouseService.listWorkOrders(status));
    }

    @PostMapping("/work-orders/{id}/approve")
    public Result<String> approve(@PathVariable Long id) {
        try {
            greenhouseService.approveWorkOrder(id);
            return Result.success("ok");
        } catch (Exception e) {
            return Result.fail(e.getMessage());
        }
    }

    @PostMapping("/work-orders/{id}/reject")
    public Result<String> reject(@PathVariable Long id) {
        try {
            greenhouseService.rejectWorkOrder(id);
            return Result.success("ok");
        } catch (Exception e) {
            return Result.fail(e.getMessage());
        }
    }

    @PostMapping("/work-orders/{id}/complete")
    public Result<String> complete(@PathVariable Long id) {
        try {
            greenhouseService.completeWorkOrder(id);
            return Result.success("ok");
        } catch (Exception e) {
            return Result.fail(e.getMessage());
        }
    }

    @GetMapping("/control-logs")
    public Result<List<GhControlLog>> logs(@RequestParam(defaultValue = "50") int limit) {
        return Result.success(greenhouseService.recentControlLogs(limit));
    }

    @GetMapping("/climate-profiles")
    public Result<Map<String, Object>> profiles() {
        return Result.success(greenhouseService.climateProfiles());
    }

    @PostMapping("/sim/tick")
    public Result<String> tick() {
        greenhouseService.tickSimulation();
        return Result.success("ok");
    }

    @PostMapping("/sim/reset-day")
    public Result<String> resetDay() {
        greenhouseService.resetSimDay();
        return Result.success("ok");
    }

    @GetMapping("/sim/clock")
    public Result<Map<String, Object>> clock() {
        return Result.success(greenhouseService.getSimClock());
    }
}
