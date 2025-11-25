"use client";

import { useEffect, useMemo, useState } from "react";

export interface EnvironmentalRecord {
  _id?: string;
  timestamp: string;
  silo_id?: string;
  device_id?: string;
  batch_id?: string;
  environmental_context?: {
    weather?: {
      temperature?: number;
      humidity?: number;
      pressure?: number;
      wind_speed?: number;
      precipitation?: number;
      visibility?: number;
      cloudiness?: number;
      [key: string]: any;
    };
    air_quality_index?: number;
  };
  derived_metrics?: {
    dew_point?: number;
    dew_point_gap?: number;
    condensation_risk?: boolean;
    airflow?: number;
    voc_baseline_24h?: number;
    voc_relative?: number;
    voc_relative_5min?: number;
    voc_relative_30min?: number;
    voc_rate_5min?: number;
    voc_rate_30min?: number;
    pest_presence_score?: number;
    pest_presence_flag?: boolean;
    guardrails?: {
      venting_blocked?: boolean;
      reasons?: string[];
    };
    ml_risk_class?: string;
    ml_risk_score?: number;
    fan_recommendation?: string;
    fan_guardrails_active?: boolean;
    [key: string]: any;
  };
  actuation_state?: {
    fan_state?: number;
    fan_status?: string;
    fan_speed_factor?: number;
    fan_duty_cycle?: number;
    fan_rpm?: number;
    last_command_source?: string;
    [key: string]: any;
  };
  temperature?: { value?: number };
  humidity?: { value?: number };
  ambient?: {
    temperature?: { value?: number };
    humidity?: { value?: number };
    light?: { value?: number };
  };
  moisture?: { value?: number };
}

export interface LocationOption {
  city: string;
  latitude: number;
  longitude: number;
  address?: string;
  silo_count: number;
  silos: Array<{ silo_id: string; name: string }>;
  weather?: Record<string, any>;
  air_quality?: Record<string, any>;
  impact_assessment?: Record<string, any>;
  aqi_level?: Record<string, any>;
  regional_analysis?: Record<string, any>;
}

interface UseEnvHistoryOptions {
  limit?: number;
  latitude?: number;
  longitude?: number;
}

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export function useEnvironmentalHistory(options: UseEnvHistoryOptions = {}) {
  const { limit = 288, latitude, longitude } = options;
  const [data, setData] = useState<EnvironmentalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const tenantId =
          (typeof window !== "undefined" && localStorage.getItem("tenantId")) ||
          "default";

        const params = new URLSearchParams({ limit: String(limit) });
        if (latitude && longitude) {
          params.append("lat", String(latitude));
          params.append("lon", String(longitude));
        }

        const resp = await fetch(
          `${backendUrl}/api/environmental/history/${tenantId}?${params.toString()}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );

        if (!resp.ok) {
          throw new Error(`History request failed (${resp.status})`);
        }

        const json = await resp.json();
        const records: EnvironmentalRecord[] = json.data || [];
        if (mounted) {
          setData(records);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setData([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [limit, latitude, longitude]);

  const latest = useMemo(
    () => (data.length ? data[data.length - 1] : undefined),
    [data],
  );

  return { data, latest, loading, error };
}

export function useEnvironmentalLocations() {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const resp = await fetch(
          `${backendUrl}/api/environmental/my-locations`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );
        if (!resp.ok) throw new Error(`Locations request failed`);
        const json = await resp.json();
        const options: LocationOption[] =
          json.data?.locations ||
          json.locations ||
          json.data ||
          [];
        if (mounted) setLocations(options);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Error");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { locations, loading, error };
}

